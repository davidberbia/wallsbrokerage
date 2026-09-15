import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import {
  LISTING_LAST_PAGE,
  LISTING_URL,
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

          for (let i = 0; i < PAGES_PER_TICK; i++) {
            if (i > 0) await sleep(12_000);

            if (phase === "listing") {
              const html = await cfnewsGet(`${LISTING_URL}${page}`, cookie);
              requests += 1;
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
              const html = await cfnewsGet(company.source_url!, cookie);
              requests += 1;
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

            const html = await cfnewsGet(contact.source_url!, cookie);
            requests += 1;
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
