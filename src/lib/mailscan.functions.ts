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
      updatedAt: data?.updated_at ?? new Date().toISOString(),
      pending: pending.count ?? 0,
      ready,
      integrated: integrated.count ?? 0,
    };
  });

export const setMailscanRunning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { running: boolean; restart?: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      status: data.running ? "en cours" : "arrêté",
      last_error: null,
      lease_until: null,
      updated_at: new Date().toISOString(),
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
      .update({ status: "ignoré" })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

/**
 * Intègre les contacts validés :
 * — société déjà connue côté investisseurs → nouvel investisseur avec la même stratégie ;
 * — sinon → fiche prospect (société + collaborateur).
 */
export const integrateMailscanCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("mailscan_candidates")
      .select("*")
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    let investorsCreated = 0;
    let prospectsCreated = 0;
    let ignored = 0;

    for (const row of rows ?? []) {
      // Doublon de dernière minute ?
      const [{ data: dupInvestor }, { data: dupContact }] = await Promise.all([
        supabaseAdmin.from("investors").select("id").eq("email", row.email).maybeSingle(),
        supabaseAdmin.from("prospect_contacts").select("id").eq("email", row.email).maybeSingle(),
      ]);
      if (dupInvestor || dupContact) {
        await supabaseAdmin
          .from("mailscan_candidates")
          .update({ status: "ignoré" })
          .eq("id", row.id);
        ignored += 1;
        continue;
      }

      const fullName = row.full_name || row.email.split("@")[0]!;
      const { data: sibling } = await supabaseAdmin
        .from("investors")
        .select("*")
        .ilike("email", `%@${row.domain}`)
        .limit(1)
        .maybeSingle();

      if (sibling) {
        const { data: created, error: insertError } = await supabaseAdmin
          .from("investors")
          .insert({
            full_name: fullName,
            first_name: row.first_name,
            job_title: row.job_title,
            email: row.email,
            phone: row.phone,
            company: sibling.company ?? row.company_name,
            investor_profile: sibling.investor_profile,
            address: row.address ?? sibling.address,
            postal_code: sibling.postal_code,
            city: sibling.city,
            country: sibling.country,
            budget_min: sibling.budget_min,
            budget_max: sibling.budget_max,
            asset_classes: sibling.asset_classes,
            strategies: sibling.strategies,
            regions: sibling.regions,
            min_yield: sibling.min_yield,
            holding_horizon: sibling.holding_horizon,
            financing: sibling.financing,
            status: "à qualifier",
            notes: `Créé depuis la boîte mail — stratégie reprise de ${sibling.full_name}.`,
          })
          .select("id")
          .single();
        if (insertError) throw new Error(insertError.message);

        const { data: criteria } = await supabaseAdmin
          .from("investor_criteria")
          .select("asset_class, investor_profile, strategies, amount_bands, regions, city_scope, periphery_scope, city_targets")
          .eq("investor_id", sibling.id);
        if (criteria && criteria.length > 0) {
          await supabaseAdmin
            .from("investor_criteria")
            .insert(criteria.map((c) => ({ ...c, investor_id: created.id })));
        }
        await supabaseAdmin
          .from("mailscan_candidates")
          .update({ status: "intégré", created_investor_id: created.id })
          .eq("id", row.id);
        investorsCreated += 1;
        continue;
      }

      const companyName = row.company_name || row.domain;
      const { data: existingCompany } = await supabaseAdmin
        .from("prospect_companies")
        .select("id")
        .ilike("name", companyName)
        .limit(1)
        .maybeSingle();
      let companyId = existingCompany?.id ?? null;
      if (!companyId) {
        const { data: company, error: companyError } = await supabaseAdmin
          .from("prospect_companies")
          .insert({
            name: companyName,
            address: row.address,
            source_url: `https://${row.domain}`,
          })
          .select("id")
          .single();
        if (companyError) throw new Error(companyError.message);
        companyId = company.id;
      }

      const { data: contact, error: contactError } = await supabaseAdmin
        .from("prospect_contacts")
        .insert({
          company_id: companyId,
          full_name: fullName,
          first_name: row.first_name,
          job_title: row.job_title,
          email: row.email,
          phone: row.phone,
          source_url: `https://${row.domain}`,
          email_checked_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (contactError) throw new Error(contactError.message);

      await supabaseAdmin
        .from("mailscan_candidates")
        .update({ status: "intégré", created_contact_id: contact.id })
        .eq("id", row.id);
      prospectsCreated += 1;
    }

    return { ok: true, investorsCreated, prospectsCreated, ignored };
  });
