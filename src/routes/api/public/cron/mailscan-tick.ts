import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import {
  checkDomainSite,
  classifyAddress,
  companyFromDomain,
  graphGet,
  parseSignature,
  splitName,
  type GraphMessage,
} from "@/lib/mailscan.server";

const PAGES_PER_TICK = 2;
const PAGE_SIZE = 100;
const DOMAINS_PER_TICK = 4;
const ENRICH_PER_TICK = 4;
const LEASE_MS = 4 * 60 * 1000;

const FOLDERS = ["inbox", "sentitems"] as const;

const listUrl = (folder: string) =>
  `/v1.0/me/mailFolders/${folder}/messages?$top=${PAGE_SIZE}&$select=id,receivedDateTime,from,toRecipients,ccRecipients&$orderby=receivedDateTime desc`;

export const Route = createFileRoute("/api/public/cron/mailscan-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;

        const admin = await getAdmin();
        const { data: state } = await admin
          .from("mailscan_state")
          .select("*")
          .eq("id", true)
          .maybeSingle();

        if (!state || state.status !== "en cours") {
          await admin.rpc("mailscan_stop_internal");
          return Response.json({ ok: true, idle: true });
        }
        const now = Date.now();
        if (state.lease_until && new Date(state.lease_until).getTime() > now) {
          return Response.json({ ok: true, busy: true });
        }
        await admin
          .from("mailscan_state")
          .update({ lease_until: new Date(now + LEASE_MS).toISOString() })
          .eq("id", true);

        let folder = state.folder;
        let nextLink: string | null = state.next_link;
        let messagesDone = state.messages_done;
        let candidatesFound = state.candidates_found;
        let domainsChecked = state.domains_checked;
        let skipped = state.skipped;
        let finished = false;

        try {
          for (let page = 0; page < PAGES_PER_TICK; page += 1) {
            const url = nextLink ?? listUrl(folder);
            const payload = await graphGet<{
              value: GraphMessage[];
              "@odata.nextLink"?: string;
            }>(url);
            const messages = payload.value ?? [];
            messagesDone += messages.length;

            // 1. Extraction des adresses professionnelles de la page.
            const seen = new Map<
              string,
              { domain: string; name: string | null; lastSeen: string | null }
            >();
            for (const message of messages) {
              const people = [
                message.from?.emailAddress,
                message.sender?.emailAddress,
                ...(message.toRecipients ?? []).map((r) => r.emailAddress),
                ...(message.ccRecipients ?? []).map((r) => r.emailAddress),
              ];
              for (const person of people) {
                const info = classifyAddress(person?.address);
                if (!info) {
                  if (person?.address) skipped += 1;
                  continue;
                }
                const existing = seen.get(info.email);
                if (!existing) {
                  seen.set(info.email, {
                    domain: info.domain,
                    name: person?.name?.trim() || null,
                    lastSeen: message.receivedDateTime ?? null,
                  });
                }
              }
            }

            if (seen.size > 0) {
              const emails = [...seen.keys()];
              const [investors, contacts, candidates] = await Promise.all([
                admin.from("investors").select("email").in("email", emails),
                admin.from("prospect_contacts").select("email").in("email", emails),
                admin.from("mailscan_candidates").select("id, email, occurrences").in("email", emails),
              ]);
              const known = new Set(
                [...(investors.data ?? []), ...(contacts.data ?? [])]
                  .map((r) => (r.email ?? "").toLowerCase())
                  .filter(Boolean),
              );
              const existingCandidates = new Map(
                (candidates.data ?? []).map((c) => [c.email, c]),
              );

              const inserts: Record<string, unknown>[] = [];
              for (const [email, info] of seen) {
                if (known.has(email)) {
                  skipped += 1;
                  continue;
                }
                const already = existingCandidates.get(email);
                if (already) {
                  await admin
                    .from("mailscan_candidates")
                    .update({ occurrences: (already.occurrences ?? 1) + 1 })
                    .eq("id", already.id);
                  continue;
                }
                const name = info.name && !info.name.includes("@") ? splitName(info.name) : null;
                inserts.push({
                  email,
                  domain: info.domain,
                  full_name: name?.fullName ?? null,
                  first_name: name?.firstName ?? null,
                  company_name: companyFromDomain(info.domain),
                  last_seen_at: info.lastSeen,
                });
              }
              if (inserts.length > 0) {
                const { error } = await admin
                  .from("mailscan_candidates")
                  .upsert(inserts, { onConflict: "email", ignoreDuplicates: true });
                if (!error) candidatesFound += inserts.length;
              }
            }

            nextLink = payload["@odata.nextLink"] ?? null;
            if (!nextLink) {
              const index = FOLDERS.indexOf(folder as (typeof FOLDERS)[number]);
              if (index >= 0 && index < FOLDERS.length - 1) {
                folder = FOLDERS[index + 1]!;
              } else {
                finished = true;
              }
              break;
            }
          }

          // 2. Vérification des domaines jamais examinés.
          const { data: pendingDomains } = await admin
            .from("mailscan_candidates")
            .select("domain")
            .eq("status", "à valider")
            .limit(500);
          const candidateDomains = [...new Set((pendingDomains ?? []).map((d) => d.domain))];
          if (candidateDomains.length > 0) {
            const { data: knownDomains } = await admin
              .from("mailscan_domains")
              .select("domain")
              .in("domain", candidateDomains);
            const knownSet = new Set((knownDomains ?? []).map((d) => d.domain));
            const todo = candidateDomains.filter((d) => !knownSet.has(d)).slice(0, DOMAINS_PER_TICK);
            for (const domain of todo) {
              const verdict = await checkDomainSite(domain);
              await admin.from("mailscan_domains").upsert(
                {
                  domain,
                  company_name: companyFromDomain(domain),
                  verdict: verdict.verdict,
                  reason: verdict.reason,
                  site_url: verdict.siteUrl,
                  checked_at: new Date().toISOString(),
                },
                { onConflict: "domain" },
              );
              domainsChecked += 1;
              if (verdict.verdict === "hors cible") {
                await admin
                  .from("mailscan_candidates")
                  .update({ status: "ignoré" })
                  .eq("domain", domain)
                  .eq("status", "à valider");
              }
            }
          }

          // 3. Signature : fonction, téléphone et adresse des contacts retenus.
          const { data: toEnrich } = await admin
            .from("mailscan_candidates")
            .select("id, email")
            .eq("status", "à valider")
            .is("enriched_at", null)
            .limit(ENRICH_PER_TICK);
          for (const candidate of toEnrich ?? []) {
            const patch: Record<string, unknown> = { enriched_at: new Date().toISOString() };
            try {
              const found = await graphGet<{ value: { body?: { content?: string } }[] }>(
                `/v1.0/me/messages?$top=1&$select=body&$filter=${encodeURIComponent(
                  `from/emailAddress/address eq '${candidate.email.replace(/'/g, "''")}'`,
                )}`,
              );
              const body = found.value?.[0]?.body?.content ?? "";
              if (body) {
                const parsed = parseSignature(body);
                if (parsed.jobTitle) patch["job_title"] = parsed.jobTitle;
                if (parsed.phone) patch["phone"] = parsed.phone;
                if (parsed.address) patch["address"] = parsed.address;
              }
            } catch {
              // signature indisponible : on garde le contact tel quel
            }
            await admin.from("mailscan_candidates").update(patch).eq("id", candidate.id);
          }

          await admin
            .from("mailscan_state")
            .update({
              folder,
              next_link: nextLink,
              status: finished ? "terminé" : "en cours",
              messages_done: messagesDone,
              candidates_found: candidatesFound,
              domains_checked: domainsChecked,
              skipped,
              last_error: null,
              lease_until: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", true);

          if (finished) await admin.rpc("mailscan_stop_internal");
          return Response.json({ ok: true, folder, messagesDone, finished });
        } catch (err) {
          const messageText = err instanceof Error ? err.message : String(err);
          await admin
            .from("mailscan_state")
            .update({
              status: "en pause",
              last_error: messageText,
              lease_until: null,
              folder,
              next_link: nextLink,
              messages_done: messagesDone,
              candidates_found: candidatesFound,
              domains_checked: domainsChecked,
              skipped,
              updated_at: new Date().toISOString(),
            })
            .eq("id", true);
          await admin.rpc("mailscan_stop_internal");
          return Response.json({ ok: false, error: messageText }, { status: 200 });
        }
      },
    },
  },
});
