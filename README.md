# Waymakers

**WAYMAKERS** on Cloudflare Pages (`waymakers.pages.dev`).

Cognation production (`cognation` / cognation-3md.pages.dev and Cognation GitHub/Supabase projects) is **untouched**.

## Landing

- Header masthead: **WAYMAKERS** wordmark (glowing black on silvery holo) + tagline “A wellness concierge”
- Signup / sign-in (WAYMAKERS Supabase)
- Tabs: **WELL · PAGES · JOBS**
  - **WELL** — The Well EHR-style demo (patient/provider chart, second auth lock via `well.js` / `well-auth.js`)
  - **PAGES** — Yellow Pages directory (`pages.js`)
  - **JOBS** — empty panel (placeholder)
- Tower, Commune, badges, and widgets are **not** included

## Auth (WAYMAKERS Supabase)

- Project ref: `gjrxweezprhiosqewiah` (org COG-NATION) — **separate from Cognation**
- Browser config: `js/cognation-config.js` → `https://gjrxweezprhiosqewiah.supabase.co`
- WELL clinical lock is a second, demo-only auth gate (`well-alexa` / `WellLock26` + on-screen 2FA)

## Related

- `wellness-intake/` — wellness intake form pack (demo / not production-approved)

## Local preview

```bash
npx --yes serve -l 4173 .
# or: python3 -m http.server 4173
```

## Deploy

```bash
unset GITHUB_TOKEN
npx wrangler pages deploy . --project-name=waymakers --commit-dirty=true
```
