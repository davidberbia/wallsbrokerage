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
