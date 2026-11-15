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

- Brochure generator code copied from the Générateur project lives in src/components/brochure and src/lib (pptx-generator, googlemaps, …) under @ts-nocheck; keep it verbatim and gate its server functions with requireStaffAuth. Why: preserves the validated brochure rendering and blocks investor accounts.
- Staff data spaces: assets, asset_documents, deals, mandates and document_shares are scoped by `public.can_see_owner(owner_id)` (admin sees all, broker sees own). Why: each salesperson has a separate space.
- Mandate numbers come from `mandate_number_seq` via the assets trigger; mandates survive asset deletion (asset_id SET NULL + asset_title). Why: legal registry must never lose numbers.
- Public document shares go through `src/lib/share.functions.ts` (token + 15-day expiry checked server-side, events logged). Why: /partage is unauthenticated.
- Contact directories share the Contacts navigation in AppLayout while retaining their existing route URLs and access guards. Why: grouping must not move data or break existing links and permissions.
