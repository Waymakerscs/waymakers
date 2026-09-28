# Waymakers

**WAYMAKERS** on Cloudflare Pages (`waymakers.pages.dev`).

Cognation production (`cognation` / cognation-3md.pages.dev and Cognation GitHub/Supabase projects) is **untouched**.

## Landing

- Header masthead: **WAYMAKERS** wordmark (glowing black on silvery holo) + tagline “A wellness concierge”
- Signup / sign-in (WAYMAKERS Supabase)
- Tabs: **WELL · PAGES · JOBS** (roles stay distinct)
  - **WELL** — company/provider UI (EHR demo chart, roster, doctor→patient messages, audit-only doctor notes)
  - **PAGES** — local directory of what’s available (`pages.js`)
  - **JOBS** — applicant board (`jobs.js`); openings keyed by `companyId`
- Tower, Commune, badges, and widgets are **not** included

## Company identity (Well ↔ Jobs ↔ Pages)

Shared registry: `js/companies.js` (`WaymakersCompanies`).

| Surface | Role | Link field |
| --- | --- | --- |
| WELL | Company/provider workspace | `provider.companyId` (e.g. Hyde Park Family Medicine) |
| JOBS | Where applicants apply | each post’s `companyId` |
| PAGES | Public directory | listing `companyId` → **View jobs** opens JOBS filtered to that company |

Deep link: `#jobs/<companyId>` (also `#jobs` for all). API: `WaymakersJobs.filterByCompany(id)`.

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
