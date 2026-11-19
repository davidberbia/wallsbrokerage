<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Brochure generator code copied from the Générateur project lives in src/components/brochure and src/lib (pptx-generator, googlemaps, …) under @ts-nocheck; keep export engines verbatim, use the CRM design system for editor UI, and gate its server functions with requireStaffAuth. Why: preserves the validated brochure rendering and blocks investor accounts.
- Staff data spaces: assets, asset_documents, deals, mandates and document_shares are scoped by `public.can_see_owner(owner_id)` (admin sees all, broker sees own). Why: each salesperson has a separate space.
- Mandate numbers come from `mandate_number_seq` via the assets trigger; mandates survive asset deletion (asset_id SET NULL + asset_title). Why: legal registry must never lose numbers.
- Public document shares go through `src/lib/share.functions.ts` (token + 15-day expiry checked server-side, events logged). Why: /partage is unauthenticated.
- Contact directories share the Contacts navigation in AppLayout while retaining their existing route URLs and access guards. Why: grouping must not move data or break existing links and permissions.

- The root route redirects authenticated staff to the deal pipeline and investors to their profile; Matching has its own /matching route, with legacy asset query links forwarded. Why: the site address must open the operational homepage without losing matching links.
- Record lists use CompactRow with separate open/edit/delete controls and RecordDialog for secondary details; legal registries and send histories retain their deletion restrictions. Why: keep a consistent single-row mobile overview without losing workflows or legal records.

- Background extractions use a persistent global lease and due-time queue; the managed schedule remains paused before deployment and sleeps after drain. Why: prevents concurrent work and idle polling.
- Commercial-agent administration uses server-validated admin membership and private contract storage. Why: prevents privilege escalation and contract disclosure.
- Incoming opportunities write only the Cible stage; financial and active pipeline updates remain manual. Why: avoids email-driven changes to operational deals.
- Deal visibility uses `public.can_see_deal(owner_id)`: admin sees all, agents flagged `commercial_agents.sees_team` see all non-admin deals, others only their own. Why: team manager oversight without exposing the super admin's deals.
- Per-agent list filters use `AgentFilter` (list_deal_agents) over RLS-scoped rows; rows without owner belong to the super admin. Why: one dropdown pattern, data scoping stays in the database.
- CRM manual: written content in src/lib/manuel/content.ts, AI-added paragraphs in manual_sections (server-only writes), answers via Gemini with a dedicated monthly cap and keyword-search fallback; screenshots are captured with personal data blurred. Why: manual must stay free to read, self-extending, and never expose the admin's data to agents.
- Stage routing preserves fee fields; financial exclusion of lost deals is handled by the shared deal-stages totals. Why: retain historical amounts without counting them toward revenue.
- Mail attachments reach assets through mail_attachment_jobs processed inside the existing mailsync tick (bounded batch, lease, pause on budget/auth errors); PDF page-to-image conversion runs in staff browsers via useAutoRender because pdf.js cannot run on the Worker. Why: automatic filling without a new polling schedule.
- Deal AI research lives in src/lib/deal-research.server.ts (Gemini web search + official French company directory via company-lookup.ts) and only fills empty fields. Why: never invent or overwrite user data.
- Brochure PDF (B&B template) is rendered in the browser by src/lib/brochure-pdf.ts (pdf-lib + Outfit fonts in public/fonts, images cropped via canvas); the PPTX engine stays untouched as a secondary export. Why: zero AI cost per brochure, exact image framing, and no Worker limits.
- NAS ingestion: a local Windows Python script (public/nas/walls_nas.zip) pushes files to /api/public/nas-ingest, authenticated by a hashed key from Paramètres; files go straight to storage via signed URLs, ambiguous folders wait in nas_folders for manual linking. Why: the CRM cannot reach the home network and large volumes must bypass the Worker.

- Asset families mirror the NAS INVESTISSEMENT folders (assets.family via asset_family()); detailed asset_class is kept underneath, and every asset with a city and price or rent upserts one comparable (comparables.asset_id) by trigger. Why: server nomenclature in the CRM without losing matching detail, and every asset feeds the comparables base.
- Asset year filtering uses assets.nas_year synchronized by a nas_folders trigger across creation and manual reassignment; missing or conflicting folder years stay null. Why: one authoritative synchronization path avoids using file or CRM timestamps.
- Lead transfers use a staff-only atomic database function checking visibility, recipient membership and exclusive asset ownership; transfers never expose unrelated colleague records. Why: ordinary owner-scoped RLS cannot reassign a lead safely by itself.
- Leads keep their existing /cibles URL, use lead_status for triage and require a linked asset class before changing stage; research waits for attachment processing and only applies confirmed facts sourced by an https URL or a named attachment to empty fields; malformed facts are dropped individually. Why: preserve links, avoid premature guesses and make the investigation auditable.
- Lead document requests have RLS-scoped history, explicit desktop-email send confirmation and atomic reminder claims; reuse the existing Outlook sync, gated by lead_followup_control until authorized deployment. Why: opening mail is not evidence of sending, and uncertain provider results must never trigger duplicate emails.

- Record completion and brochure readiness use the shared completion calculator across leads, assets and deals; quick review excludes waiting records and normalizes legacy qualified leads. Why: keep eligibility and progress consistent throughout the lifecycle.
- Pige uses owner-scoped cycles, atomic Brevo send claims and provider-message events; Outlook only matches reply references under the existing followup control, and seven-day eligibility starts on provider acceptance. Why: uncertain sends must never repeat and acceptance is not proof of delivery or reading.
- LinkedIn notoriety lives in /notoriete (linkedin_* tables, owner-only RLS); drafts via Gemini task 'linkedin' with its own monthly cap; invitations are a manual click queue because LinkedIn forbids automated invites. Why: zero account-ban risk and bounded AI cost.
- DocuSign mandate corrections reuse the open envelope (replace document, reset anchor tabs) while no signer has signed; a new envelope is only created after explicit confirmation once someone signed. Why: each new envelope consumes a paid DocuSign credit.
