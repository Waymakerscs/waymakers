# Waymakers

Clean landing for **WAYMAKERS** on Cloudflare Pages (`waymakers.pages.dev`).

Cognation production (`cognation` / cognation-3md.pages.dev and Cognation GitHub/Supabase projects) is **untouched**.

## Landing

- Header masthead: **WAYMAKERS** wordmark (glowing black, touching letters, silvery holo) + tagline “A wellness concierge”
- Signup / sign-in only (WAYMAKERS Supabase)
- Tabs: **WELL · PAGES · JOBS** — empty panels (no content body)
- Tower, Commune, badges, widgets, and other product surfaces stripped

## Auth (WAYMAKERS Supabase)

- Project ref: `gjrxweezprhiosqewiah` (org COG-NATION) — **separate from Cognation**
- Browser config: `js/cognation-config.js` → `https://gjrxweezprhiosqewiah.supabase.co`

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
