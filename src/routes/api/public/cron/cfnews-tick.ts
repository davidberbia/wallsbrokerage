import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import {
  LISTING_LAST_PAGE,
  LISTING_URL,
  CfnewsHttpError,
  cfnewsGet,
  cfnewsLogin,
  cleanText,
  parseCompanyLinks,
  parsePerson,
  parseTeam,
  sleep,
} from "@/lib/cfnews.server";

// Une exécution par minute : 2 pages CFNews maximum, espacées, pour rester discret.
const PAGES_PER_TICK = 2;
const COOKIE_MAX_AGE_MS = 40 * 60 * 1000;
const LEASE_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_LISTING_404S = 3;
const BASE = "https://www.cfnewsimmo.net";

type FailureKind = "listing" | "company" | "contact";

async function logNotFound(
  admin: any,
  failure: {
    url: string;
    kind: FailureKind;
    page?: number;
    companyId?: string;
    contactId?: string;
  },
) {
  const { data: existing } = await admin
    .from("cfnews_failed_urls")
    .select("attempts")
    .eq("url", failure.url)
    .maybeSingle();
  const { error } = await admin.from("cfnews_failed_urls").upsert(
    {
      url: failure.url,
      kind: failure.kind,
      page: failure.page ?? null,
      company_id: failure.companyId ?? null,
      contact_id: failure.contactId ?? null,
      last_status: 404,
      last_error: `CFNews 404 sur ${failure.url}`,
      attempts: (existing?.attempts ?? 0) + 1,
      retry_requested_at: null,
      resolved_at: null,
    },
    { onConflict: "url" },
  );
  if (error) throw new Error(`Journal CFNews: ${error.message}`);
  console.warn("CFNews URL ignorée (404)", failure.url);
}

async function resolveFailure(admin: any, url: string) {
  await admin
    .from("cfnews_failed_urls")
    .update({ resolved_at: new Date().toISOString(), retry_requested_at: null, last_error: null })
    .eq("url", url)
    .is("resolved_at", null);
}

export const Route = createFileRoute("/api/public/cron/cfnews-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;

        const admin = await getAdmin();
        const { data: state } = await admin
          .from("cfnews_scrape")
          .select("*")
          .eq("id", true)
          .maybeSingle();
        if (!state || state.status !== "running") return Response.json({ ok: true, skipped: true });

        const now = Date.now();
        if (state.lease_until && new Date(state.lease_until).getTime() > now) {
          return Response.json({ ok: true, busy: true });
        }
        await admin
          .from("cfnews_scrape")
          .update({ lease_until: new Date(now + LEASE_MS).toISOString() })
          .eq("id", true);

        let cookie = state.cookie ?? "";
        let requests = state.requests_done;
        let phase = state.phase;
        let page = state.page;
        let done = 0;
        let listing404s = state.consecutive_listing_404s ?? 0;

        try {
          const stale =
            !cookie || !state.cookie_at || now - new Date(state.cookie_at).getTime() > COOKIE_MAX_AGE_MS;
          if (stale) {
            cookie = await cfnewsLogin();
            requests += 1;
            await admin
              .from("cfnews_scrape")
              .update({ cookie, cookie_at: new Date().toISOString() })
              .eq("id", true);
          }

          if (state.retry_only) {
            for (let i = 0; i < PAGES_PER_TICK; i++) {
              if (i > 0) await sleep(12_000);
              const { data: failure } = await admin
                .from("cfnews_failed_urls")
                .select("*")
                .is("resolved_at", null)
                .not("retry_requested_at", "is", null)
                .order("retry_requested_at")
                .limit(1)
                .maybeSingle();

              if (!failure) {
                await admin
                  .from("cfnews_scrape")
                  .update({ status: "idle", retry_only: false, lease_until: null, updated_at: new Date().toISOString() })
                  .eq("id", true);
                await admin.rpc("cfnews_scrape_schedule", { _on: false });
                return Response.json({ ok: true, retryFinished: true });
              }

              try {
                const html = await cfnewsGet(failure.url, cookie);
                requests += 1;
                if (failure.kind === "listing") {
                  const companies = parseCompanyLinks(html);
                  if (companies.length > 0) {
                    const result = await admin.from("prospect_companies").upsert(
                      companies.map((company) => ({
                        name: company.name,
                        source_url: `${BASE}${company.path}`,
                      })),
                      { onConflict: "source_url", ignoreDuplicates: true },
                    );
                    if (result.error) throw new Error(`Enregistrement sociétés: ${result.error.message}`);
                  }
                } else if (failure.kind === "company" && failure.company_id) {
                  const companyId = failure.company_id;
                  const members = parseTeam(html);
                  if (members.length > 0) {
                    const result = await admin.from("prospect_contacts").upsert(
                      members.map((member) => ({
                        company_id: companyId,
                        full_name: member.fullName,
                        job_title: member.jobTitle,
                        source_url: `${BASE}${member.path}`,
                      })),
                      { onConflict: "source_url", ignoreDuplicates: true },
                    );
                    if (result.error) throw new Error(`Enregistrement contacts: ${result.error.message}`);
                  }
                  await admin.from("prospect_companies").update({ contacts_scraped_at: new Date().toISOString() }).eq("id", companyId);
                } else if (failure.kind === "contact" && failure.contact_id) {
                  const person = parsePerson(html);
                  const fullName = person.firstName && person.lastName ? cleanText(`${person.firstName} ${person.lastName}`) : null;
                  await admin.from("prospect_contacts").update({
                    email: person.email,
                    phone: person.phone,
                    job_title: person.jobTitle,
                    first_name: person.firstName,
                    ...(fullName ? { full_name: fullName } : {}),
                    email_checked_at: new Date().toISOString(),
                  }).eq("id", failure.contact_id);
                }
                await resolveFailure(admin, failure.url);
              } catch (err) {
                requests += 1;
                if (err instanceof CfnewsHttpError && err.status === 404) {
                  await logNotFound(admin, {
                    url: failure.url,
                    kind: failure.kind as FailureKind,
                    page: failure.page ?? undefined,
                    companyId: failure.company_id ?? undefined,
                    contactId: failure.contact_id ?? undefined,
                  });
                  continue;
                }
                throw err;
              }
            }

            await admin
              .from("cfnews_scrape")
              .update({ requests_done: requests, lease_until: null, last_error: null, updated_at: new Date().toISOString() })
              .eq("id", true);
            return Response.json({ ok: true, retrying: true });
          }

          for (let i = 0; i < PAGES_PER_TICK; i++) {
            if (i > 0) await sleep(12_000);

            if (phase === "listing") {
              const path = `${LISTING_URL}${page}`;
              let html: string;
              try {
                html = await cfnewsGet(path, cookie);
                requests += 1;
                listing404s = 0;
                await resolveFailure(admin, `${BASE}${path}`);
              } catch (err) {
                requests += 1;
                if (!(err instanceof CfnewsHttpError) || err.status !== 404) throw err;
                await logNotFound(admin, { url: `${BASE}${path}`, kind: "listing", page });
                page += 1;
                listing404s += 1;
                done += 1;
                if (listing404s >= MAX_CONSECUTIVE_LISTING_404S || page > LISTING_LAST_PAGE) {
                  phase = "companies";
                }
                continue;
              }
              const companies = parseCompanyLinks(html);
              if (companies.length === 0 || page > LISTING_LAST_PAGE) {
                phase = "companies";
              } else {
                const up = await admin.from("prospect_companies").upsert(
                  companies.map((c) => ({
                    name: c.name,
                    source_url: `https://www.cfnewsimmo.net${c.path}`,
                  })),
                  { onConflict: "source_url", ignoreDuplicates: true },
                );
                if (up.error) throw new Error(`Enregistrement sociétés: ${up.error.message}`);
                page += 1;
                done += 1;
              }
              continue;
            }

            if (phase === "companies") {
              const { data: company } = await admin
                .from("prospect_companies")
                .select("id, source_url")
                .is("contacts_scraped_at", null)
                .not("source_url", "is", null)
                .limit(1)
                .maybeSingle();
              if (!company) {
                phase = "emails";
                continue;
              }
              const companyUrl = company.source_url;
              if (!companyUrl) continue;
              let html: string;
              try {
                html = await cfnewsGet(companyUrl, cookie);
                requests += 1;
                await resolveFailure(admin, companyUrl);
              } catch (err) {
                requests += 1;
                if (!(err instanceof CfnewsHttpError) || err.status !== 404) throw err;
                await logNotFound(admin, { url: companyUrl, kind: "company", companyId: company.id });
                await admin.from("prospect_companies").update({ contacts_scraped_at: new Date().toISOString() }).eq("id", company.id);
                done += 1;
                continue;
              }
              const members = parseTeam(html);
              if (members.length > 0) {
                const upc = await admin.from("prospect_contacts").upsert(
                  members.map((m) => ({
                    company_id: company.id,
                    full_name: m.fullName,
                    job_title: m.jobTitle,
                    source_url: `https://www.cfnewsimmo.net${m.path}`,
                  })),
                  { onConflict: "source_url", ignoreDuplicates: true },
                );
                if (upc.error) throw new Error(`Enregistrement contacts: ${upc.error.message}`);
              }
              await admin
                .from("prospect_companies")
                .update({ contacts_scraped_at: new Date().toISOString() })
                .eq("id", company.id);
              done += 1;
              continue;
            }

            // phase "emails" : on complète chaque collaborateur depuis sa fiche.
            const { data: contact } = await admin
              .from("prospect_contacts")
              .select("id, source_url, company_id")
              .is("email_checked_at", null)
              .not("source_url", "is", null)
              .limit(1)
              .maybeSingle();
            if (!contact) {
              await admin
                .from("cfnews_scrape")
                .update({ status: "terminé", phase, page, requests_done: requests, lease_until: null, updated_at: new Date().toISOString() })
                .eq("id", true);
              await admin.rpc("cfnews_scrape_schedule", { _on: false });
              return Response.json({ ok: true, finished: true });
            }

            const contactUrl = contact.source_url;
            if (!contactUrl) continue;
            let html: string;
            try {
              html = await cfnewsGet(contactUrl, cookie);
              requests += 1;
              await resolveFailure(admin, contactUrl);
            } catch (err) {
              requests += 1;
              if (!(err instanceof CfnewsHttpError) || err.status !== 404) throw err;
              await logNotFound(admin, { url: contactUrl, kind: "contact", companyId: contact.company_id, contactId: contact.id });
              await admin.from("prospect_contacts").update({ email_checked_at: new Date().toISOString() }).eq("id", contact.id);
              done += 1;
              continue;
            }
            const person = parsePerson(html);
            const fullName =
              person.firstName && person.lastName
                ? cleanText(`${person.firstName} ${person.lastName}`)
                : null;
            await admin
              .from("prospect_contacts")
              .update({
                email: person.email,
                phone: person.phone,
                job_title: person.jobTitle,
                first_name: person.firstName,
                ...(fullName ? { full_name: fullName } : {}),
                email_checked_at: new Date().toISOString(),
              })
              .eq("id", contact.id);
            if (person.city && contact.company_id) {
              await admin
                .from("prospect_companies")
                .update({ city: person.city })
                .eq("id", contact.company_id)
                .is("city", null);
            }
            done += 1;
          }

          await admin
            .from("cfnews_scrape")
            .update({
              phase,
              page,
              requests_done: requests,
              pages_done: state.pages_done + done,
              consecutive_listing_404s: listing404s,
              lease_until: null,
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", true);

          return Response.json({ ok: true, phase, page, done });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erreur inconnue";
          console.error("cfnews tick", message);
          await admin
            .from("cfnews_scrape")
            .update({
              phase,
              page,
              requests_done: requests,
              lease_until: null,
              last_error: message,
              cookie: /40[13]|Session|Connexion/i.test(message) ? null : cookie,
              updated_at: new Date().toISOString(),
            })
            .eq("id", true);
          return Response.json({ ok: false, error: message }, { status: 200 });
        }
      },
    },
  },
});
