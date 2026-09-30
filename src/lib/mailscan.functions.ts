import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MailscanStatus = {
  status: string;
  folder: string;
  messagesDone: number;
  candidatesFound: number;
  domainsChecked: number;
  skipped: number;
  lastError: string | null;
  scanFrom: string | null;
  scanTo: string | null;
  updatedAt: string;
  pending: number;
  ready: number;
  integrated: number;
};

async function assertBroker(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "broker",
  });
  if (!data) throw new Error("Accès réservé à l'administrateur");
}

export const getMailscanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MailscanStatus> => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("mailscan_state")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    const [pending, integrated, immoDomains] = await Promise.all([
      supabaseAdmin
        .from("mailscan_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", "à valider"),
      supabaseAdmin
        .from("mailscan_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", "intégré"),
      supabaseAdmin.from("mailscan_domains").select("domain").eq("verdict", "immobilier"),
    ]);

    let ready = 0;
    const domains = (immoDomains.data ?? []).map((d) => d.domain);
    if (domains.length > 0) {
      const { count } = await supabaseAdmin
        .from("mailscan_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", "à valider")
        .in("domain", domains);
      ready = count ?? 0;
    }

    return {
      status: data?.status ?? "arrêté",
      folder: data?.folder ?? "inbox",
      messagesDone: data?.messages_done ?? 0,
      candidatesFound: data?.candidates_found ?? 0,
      domainsChecked: data?.domains_checked ?? 0,
      skipped: data?.skipped ?? 0,
      lastError: data?.last_error ?? null,
      scanFrom: data?.scan_from ?? null,
      scanTo: data?.scan_to ?? null,
      updatedAt: data?.updated_at ?? new Date().toISOString(),
      pending: pending.count ?? 0,
      ready,
      integrated: integrated.count ?? 0,
    };
  });

export const setMailscanRunning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { running: boolean; restart?: boolean; scanFrom?: string | null; scanTo?: string | null }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      status: data.running ? "en cours" : "arrêté",
      last_error: null,
      lease_until: null,
      updated_at: new Date().toISOString(),
      ...(data.scanFrom !== undefined ? { scan_from: data.scanFrom } : {}),
      ...(data.scanTo !== undefined ? { scan_to: data.scanTo } : {}),
      ...(data.restart
        ? {
            folder: "inbox",
            next_link: null,
            messages_done: 0,
            candidates_found: 0,
            domains_checked: 0,
            skipped: 0,
          }
        : {}),
    };
    const { error } = await supabaseAdmin.from("mailscan_state").update(patch).eq("id", true);
    if (error) throw new Error(error.message);
    const { error: rpcError } = await (context.supabase as any).rpc("mailscan_schedule", {
      _on: data.running,
    });
    if (rpcError) throw new Error(rpcError.message);
    return { ok: true };
  });

export type MailscanCandidate = {
  id: string;
  email: string;
  domain: string;
  full_name: string | null;
  first_name: string | null;
  job_title: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  occurrences: number;
  last_seen_at: string | null;
  verdict: string;
  reason: string | null;
  site_url: string | null;
};

export const listMailscanCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MailscanCandidate[]> => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("mailscan_candidates")
      .select("*")
      .eq("status", "à valider")
      .order("occurrences", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const domains = [...new Set(rows.map((r) => r.domain))];
    const { data: domainRows } = await supabaseAdmin
      .from("mailscan_domains")
      .select("domain, verdict, reason, site_url")
      .in("domain", domains.length > 0 ? domains : ["-"]);
    const byDomain = new Map((domainRows ?? []).map((d) => [d.domain, d]));
    return rows.map((row) => {
      const info = byDomain.get(row.domain);
      return {
        id: row.id,
        email: row.email,
        domain: row.domain,
        full_name: row.full_name,
        first_name: row.first_name,
        job_title: row.job_title,
        phone: row.phone,
        company_name: row.company_name,
        address: row.address,
        occurrences: row.occurrences,
        last_seen_at: row.last_seen_at,
        verdict: info?.verdict ?? "en attente",
        reason: info?.reason ?? null,
        site_url: info?.site_url ?? null,
      };
    });
  });

export const ignoreMailscanCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("mailscan_candidates")
      .update({ status: "supprimé" })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

/** Découpe une liste en paquets (évite les URL trop longues et les milliers d'appels réseau). */
function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

type CandidateRow = {
  id: string; email: string; domain: string; full_name: string | null; first_name: string | null;
  job_title: string | null; phone: string | null; company_name: string | null; address: string | null;
};

async function loadCandidates(admin: any, ids: string[]): Promise<CandidateRow[]> {
  const out: CandidateRow[] = [];
  for (const part of chunks([...new Set(ids)], 100)) {
    const { data, error } = await admin
      .from("mailscan_candidates")
      .select("id, email, domain, full_name, first_name, job_title, phone, company_name, address")
      .in("id", part)
      .eq("status", "à valider");
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as CandidateRow[]));
  }
  return out;
}

async function setStatus(admin: any, ids: string[], status: string) {
  for (const part of chunks(ids, 100)) {
    const { error } = await admin.from("mailscan_candidates").update({ status }).in("id", part);
    if (error) throw new Error(error.message);
  }
}

async function existingEmails(admin: any, table: string, emails: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const part of chunks(emails, 100)) {
    const { data, error } = await admin.from(table).select("email").in("email", part);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) if (r.email) found.add(String(r.email).toLowerCase());
  }
  return found;
}

/**
 * Intègre les contacts validés :
 * — société déjà connue côté investisseurs → nouvel investisseur avec la même stratégie ;
 * — sinon → fiche prospect (société + collaborateur).
 * Traitement par lots : fonctionne pour 1 comme pour 1 000 fiches.
 */
export const integrateMailscanCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; toProspects?: boolean }) => {
    if (!Array.isArray(input?.ids)) throw new Error("Données invalides");
    return { ids: input.ids.slice(0, 1000).map(String), toProspects: input.toProspects !== false };
  })
  .handler(async ({ data, context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const rows = await loadCandidates(admin, data.ids);

    let investorsCreated = 0;
    let prospectsCreated = 0;
    let ignored = 0;
    if (rows.length === 0) return { ok: true, investorsCreated, prospectsCreated, ignored };

    // 1. Doublons (déjà investisseur ou déjà prospect) → ignorés.
    const emails = rows.map((r) => r.email);
    const [invEmails, contactEmails] = await Promise.all([
      existingEmails(admin, "investors", emails),
      existingEmails(admin, "prospect_contacts", emails),
    ]);
    const dupIds: string[] = [];
    let todo: CandidateRow[] = [];
    for (const r of rows) {
      const e = r.email.toLowerCase();
      if (invEmails.has(e) || contactEmails.has(e)) dupIds.push(r.id);
      else todo.push(r);
    }
    if (dupIds.length) await setStatus(admin, dupIds, "ignoré");
    ignored += dupIds.length;

    // 2. Option investisseurs (non utilisée par l'écran actuel, conservée).
    if (!data.toProspects) {
      const rest: CandidateRow[] = [];
      for (const row of todo) {
        const { data: sibling } = await admin.from("investors").select("*").ilike("email", `%@${row.domain}`).limit(1).maybeSingle();
        if (!sibling) { rest.push(row); continue; }
        const { data: created, error: insertError } = await admin.from("investors").insert({
          full_name: row.full_name || row.email.split("@")[0]!, first_name: row.first_name, job_title: row.job_title,
          email: row.email, phone: row.phone, company: sibling.company ?? row.company_name,
          investor_profile: sibling.investor_profile, address: row.address ?? sibling.address,
          postal_code: sibling.postal_code, city: sibling.city, country: sibling.country,
          budget_min: sibling.budget_min, budget_max: sibling.budget_max, asset_classes: sibling.asset_classes,
          strategies: sibling.strategies, regions: sibling.regions, min_yield: sibling.min_yield,
          holding_horizon: sibling.holding_horizon, financing: sibling.financing, status: "à qualifier",
          notes: `Créé depuis la boîte mail — stratégie reprise de ${sibling.full_name}.`,
        }).select("id").single();
        if (insertError) throw new Error(insertError.message);
        const { data: criteria } = await admin.from("investor_criteria")
          .select("asset_class, investor_profile, strategies, amount_bands, regions, city_scope, periphery_scope, city_targets")
          .eq("investor_id", sibling.id);
        if (criteria?.length) await admin.from("investor_criteria").insert(criteria.map((c: any) => ({ ...c, investor_id: created.id })));
        await admin.from("mailscan_candidates").update({ status: "intégré", created_investor_id: created.id }).eq("id", row.id);
        investorsCreated += 1;
      }
      todo = rest;
    }
    if (todo.length === 0) return { ok: true, investorsCreated, prospectsCreated, ignored };

    // 3. Sociétés : on réutilise celle qui existe (même nom ou même site), sinon on la crée.
    const companies: { id: string; name: string; source_url: string | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await admin.from("prospect_companies").select("id, name, source_url").range(from, from + 999);
      if (error) throw new Error(error.message);
      companies.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    const byName = new Map(companies.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const bySite = new Map(companies.filter((c) => c.source_url).map((c) => [c.source_url!.toLowerCase(), c.id]));
    const companyOf = new Map<string, string>(); // candidate id → company id
    const toCreate = new Map<string, { name: string; address: string | null; source_url: string | null }>(); // clé domaine
    const pendingByDomain = new Map<string, CandidateRow[]>();
    for (const r of todo) {
      const name = (r.company_name || r.domain).trim();
      const site = `https://${r.domain}`.toLowerCase();
      const known = byName.get(name.toLowerCase()) ?? bySite.get(site);
      if (known) { companyOf.set(r.id, known); continue; }
      const key = r.domain.toLowerCase();
      if (!toCreate.has(key)) {
        // Évite les conflits de nom au sein du même lot.
        toCreate.set(key, { name, address: r.address, source_url: site });
      }
      pendingByDomain.set(key, [...(pendingByDomain.get(key) ?? []), r]);
    }
    // Deux domaines différents avec le même nom de société → une seule fiche.
    const newByName = new Map<string, { name: string; address: string | null; source_url: string | null; domains: string[] }>();
    for (const [domain, c] of toCreate) {
      const k = c.name.toLowerCase();
      const prev = newByName.get(k);
      if (prev) prev.domains.push(domain);
      else newByName.set(k, { ...c, domains: [domain] });
    }
    for (const part of chunks([...newByName.values()], 200)) {
      const { data: created, error } = await admin
        .from("prospect_companies")
        .insert(part.map(({ name, address, source_url }) => ({ name, address, source_url })))
        .select("id, name");
      if (error) throw new Error(`Création des sociétés : ${error.message}`);
      for (const c of created ?? []) {
        const entry = newByName.get(String(c.name).toLowerCase());
        for (const d of entry?.domains ?? []) for (const r of pendingByDomain.get(d) ?? []) companyOf.set(r.id, c.id);
      }
    }

    // 4. Collaborateurs : un même nom dans une même société = même personne.
    const companyIds = [...new Set(companyOf.values())];
    const existingPeople = new Map<string, string>(); // company|nom → contact id
    for (const part of chunks(companyIds, 100)) {
      const { data: people, error } = await admin.from("prospect_contacts").select("id, company_id, full_name").in("company_id", part);
      if (error) throw new Error(error.message);
      for (const p of people ?? []) existingPeople.set(`${p.company_id}|${String(p.full_name).trim().toLowerCase()}`, p.id);
    }
    const newContacts: { key: string; row: Record<string, unknown> }[] = [];
    const linkTo = new Map<string, string>(); // candidate id → key
    const now = new Date().toISOString();
    for (const r of todo) {
      const companyId = companyOf.get(r.id);
      if (!companyId) continue;
      const fullName = (r.full_name || r.email.split("@")[0]!).trim();
      const key = `${companyId}|${fullName.toLowerCase()}`;
      linkTo.set(r.id, key);
      if (existingPeople.has(key) || newContacts.some((n) => n.key === key)) continue;
      newContacts.push({
        key,
        row: {
          company_id: companyId, full_name: fullName, first_name: r.first_name, job_title: r.job_title,
          email: r.email, phone: r.phone, email_checked_at: now,
        },
      });
    }
    for (const part of chunks(newContacts, 200)) {
      const { data: created, error } = await admin
        .from("prospect_contacts")
        .insert(part.map((n) => n.row))
        .select("id, company_id, full_name");
      if (error) throw new Error(`Création des prospects : ${error.message}`);
      for (const c of created ?? []) existingPeople.set(`${c.company_id}|${String(c.full_name).trim().toLowerCase()}`, c.id);
      prospectsCreated += created?.length ?? 0;
    }

    // 5. Marque les fiches comme intégrées, reliées à leur prospect.
    const marks = todo
      .map((r) => ({ id: r.id, email: r.email, domain: r.domain, status: "intégré", created_contact_id: existingPeople.get(linkTo.get(r.id) ?? "") ?? null }))
      .filter((m) => m.created_contact_id);
    for (const part of chunks(marks, 200)) {
      const { error } = await admin.from("mailscan_candidates").upsert(part, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
    return { ok: true, investorsCreated, prospectsCreated, ignored };
  });

/** Classe des contacts « À qualifier » dans l'annuaire Contacts ou Brokers (par lots). */
export const classifyMailscanCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; kind: "contact" | "broker" | "notary" }) => {
    if (!Array.isArray(input?.ids) || !["contact", "broker", "notary"].includes(input.kind)) throw new Error("Données invalides");
    return { ids: input.ids.slice(0, 1000).map(String), kind: input.kind };
  })
  .handler(async ({ data, context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const list = await loadCandidates(admin, data.ids);
    if (list.length === 0) return { count: 0 };

    // Déjà dans l'annuaire → on change simplement sa rubrique (Contacts ↔ Brokers).
    const already = await existingEmails(admin, "directory_contacts", list.map((r) => r.email));
    const alreadyList = list.filter((r) => already.has(r.email.toLowerCase())).map((r) => r.email);
    for (const part of chunks(alreadyList, 100)) {
      const { error } = await admin.from("directory_contacts").update({ kind: data.kind }).in("email", part);
      if (error) throw new Error(error.message);
    }
    const seen = new Set<string>();
    const fresh = list.filter((r) => {
      const e = r.email.toLowerCase();
      if (already.has(e) || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
    for (const part of chunks(fresh, 200)) {
      const { error } = await admin.from("directory_contacts").insert(
        part.map((r) => ({
          kind: data.kind, email: r.email, full_name: r.full_name, company: r.company_name,
          phone: r.phone, job_title: r.job_title, candidate_id: r.id,
        })),
      );
      if (error) throw new Error(`Enregistrement dans l'annuaire : ${error.message}`);
    }
    await setStatus(admin, list.map((r) => r.id), data.kind);
    return { count: list.length };
  });
