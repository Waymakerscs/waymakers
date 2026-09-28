# Waymakers

Waymakers site, seeded from the **first-pass Cognation** static site that was live on Cloudflare Pages — including **The Well** (clinical WELL tab + `well.js` / `well-auth.js`) and the related **wellness-intake** forms.

Live Cognation (`cognation` / cognation-3md.pages.dev and the Cognation GitHub/Supabase projects) is unchanged and remains Cognation.

## Provenance

| Item | Value |
| --- | --- |
| Source | Cloudflare Pages project `cognation` |
| Deployment used | `c14fe576-4cdd-4d21-b6cf-37abb87138b1` |
| Created (UTC) | 2026-09-16T04:55:59Z |
| Preview URL at capture | https://c14fe576.cognation-3md.pages.dev |
| Why this deploy | Oldest successful Pages production deploy that includes the **complete Well** surface (`js/well.js` + `js/well-auth.js` and the WELL tab UI). Still same first morning as the initial Pages uploads; pre-holographic Cognation. |

### Related snapshots (not used as the commit root)

- **Absolute oldest Pages deploy** (no Well JS): `ab880ffb-6cc3-4a50-9fd7-7031e85a959c` — 2026-09-16T02:03:31Z — matches box archive `/workspace/cognation-pages.zip` (WELL tab placeholder only).
- **Oldest Pages deploy with `well.js` only**: `ab035a88-a8ce-4bff-8bda-755b064caea6` — 2026-09-16T03:57:02Z — nearly identical to `/workspace/cognation-pages-root.zip`.
- **Extra Well docs on box**: `wellness-intake/` (intake HTML + OK/WA addenda) copied alongside; was not part of that Pages deployment artifact.

## Contents

Static HTML/CSS/JS (no required build). Main surfaces:

- `index.html` — Cognation-first-pass shell with TOWER · COMMUNE · **WELL** tabs
- `js/well.js`, `js/well-auth.js` — The Well (demo clinical patient/provider UI + second auth lock)
- `about.html`, `contact.html`, `css/`, `assets/`, `docs/`, `server/` (optional local Node helpers from the snapshot)
- `wellness-intake/` — wellness intake form pack (not production-approved; see its own README notes)

Brand strings inside the snapshot still say **COGNATION** historically; rename via `js/brand.js` when you rebrand to Waymakers.

## Local preview

```bash
npx --yes serve -l 4173 .
# or: python3 -m http.server 4173
```

## Cloudflare Pages (optional)

Empty project `waymakers` → https://waymakers.pages.dev can be deployed from this repo when ready. Do not point production Cognation at this tree.


## Auth (WAYMAKERS Supabase)

- Project ref: `gjrxweezprhiosqewiah` (org COG-NATION) — **separate from Cognation**
- Browser config: `js/cognation-config.js` → `https://gjrxweezprhiosqewiah.supabase.co`
- Sign-in / sign-up UI branded **WAYMAKERS** with tagline “A wellness concierge” (above the title)
- Inverse theme: glowing black lettering on silvery holographic backgrounds (login, Well, Pages)
- Cognation production (`cognation-3md.pages.dev` / Cognation repos) is untouched

