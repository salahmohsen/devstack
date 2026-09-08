# design-explorations brand record (tsu-stack)

- **Sources:** `packages/ui/styles/shadcn.css` (`:root` at L256–296), `packages/ui/styles/globals.css`, font stacks from web app (`Geist Variable` body, `Geist Mono Variable` mono — loaded locally via next/font in the product; standalone HTMLs fall back to Inter/system).
- **Adaptation (2026-09-07):** light paper chrome. Ink = neutral-800 `#262626`; accent = brand signal green `#60C679` darkened to `#2f9e57` for text/labels on white; paper `#ffffff`, bg `#fafafa`; border `rgba(0,0,0,.08)`; radius feel 10–16px; body font Geist Variable → Inter fallback, mono used for eyebrows/meta when useful.
- Dark mode exists in the product but dark chrome is opt-in only (not requested).
- Design-system doc: none found (no DESIGN.md); code tokens win.
- Say "rebrand the explorations" to adjust the chrome.
