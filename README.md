# Waymakers

**WAYMAKERS** on Cloudflare Pages (`waymakers.pages.dev`).

Cognation production (`cognation` / cognation-3md.pages.dev and Cognation GitHub/Supabase projects) is **untouched**.

## Landing

- Header masthead: **WAYMAKERS** wordmark (glowing black on silvery holo) + tagline “A wellness concierge”
- Signup / sign-in (WAYMAKERS Supabase)
- Tabs: **WELL · PAGES · HOME · CAREER** (roles stay distinct)
  - **WELL** — company/provider UI (EHR demo chart, roster, doctor→patient messages, audit-only doctor notes, Apple Health consent + export upload)
  - **PAGES** — local directory of what’s available (`pages.js`)
  - **HOME** — empty placeholder (content TBD)
  - **CAREER** — applicant board (UI label; panel ids / `#jobs` hash unchanged — `jobs.js` + `jobs-adapters.js`); openings keyed by `companyId`, plus Indeed / LinkedIn by location
- Tower, Commune, badges, and widgets are **not** included

## Company identity (Well ↔ Jobs ↔ Pages)

Shared registry: `js/companies.js` (`WaymakersCompanies`).

| Surface | Role | Link field |
| --- | --- | --- |
| WELL | Company/provider workspace | `provider.companyId` (e.g. Hyde Park Family Medicine) |
| CAREER (JOBS) | Where applicants apply | each post’s `companyId` |
| PAGES | Public directory | listing `companyId` → **View jobs** opens CAREER (JOBS panel) filtered to that company |

Deep link: `#jobs/<companyId>` (also `#jobs` for all). API: `WaymakersJobs.filterByCompany(id)`.

## CAREER / JOBS sources (v1)

Filters on the CAREER tab (jobs panel):

| Filter | Values |
| --- | --- |
| Company | Waymakers companies (`companyId`, same as WELL / PAGES) |
| Location | City / region / zip (filters demo openings; passed into Indeed / LinkedIn search URLs) |
| Source | `waymakers` \| `indeed` \| `linkedin` (or all) |

### Behavior without API keys (default)

- **Waymakers** — demo openings from local companies (companyId-linked).
- **Indeed / LinkedIn** — clearly labeled **External** cards that deep-link to public search pages filtered by location (and company name when a company filter is active). Honest search links — **not** fake scraped listings.

LinkedIn Jobs API is **partner-gated**. Indeed’s Publisher / Job Search API needs a publisher account. We do **not** HTML-scrape either site as the permanent solution (brittle + ToS risk).

### Adding Indeed / LinkedIn keys later

1. **Client (public IDs only)** — edit `js/cognation-config.js` → `WAYMAKERSConfig.jobs`:

   ```js
   jobs: {
     defaultLocation: "Chicago, IL",
     useApiProxy: true,          // try GET /api/jobs before deep-link fallback
     apiProxyPath: "/api/jobs",
     indeed: {
       publisherId: "YOUR_PUBLIC_PUBLISHER_ID",
       enabled: true,
     },
     linkedin: {
       partnerConfigured: true,  // only after partnership + server secrets
       enabled: true,
     },
   }
   ```

2. **Server secrets** — Cloudflare Pages → **waymakers** project → Settings → Environment variables (never commit these):

   | Variable | Purpose |
   | --- | --- |
   | `INDEED_PUBLISHER_ID` | Indeed Publisher / affiliate id |
   | `INDEED_API_KEY` | Optional secret if Indeed issues one |
   | `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `LINKEDIN_ACCESS_TOKEN` | LinkedIn partner Jobs API |

3. **Wire the live HTTP calls** inside `functions/api/jobs.js` (`fetchIndeedListings` / `fetchLinkedInListings`) once your account’s official endpoints are confirmed. Until then the Function returns `mode: "deeplink"` and the UI keeps showing external search cards.

4. Redeploy Pages so `functions/` ships with the site (see Deploy below). Details: `functions/README.md`.

## WELL · Apple Health (v1)

Patient portal tab **Apple Health**:

- Clear permission prompt (categories shared with the care team)
- Grant / revoke consent (append-only audit)
- Upload Apple Health `export.zip` or `.xml` (bytes in IndexedDB; metadata + audit in portal store)
- Honest UI: live HealthKit sync needs a native iOS app later — this is manual export only

Jobs / Pages / Cognation are untouched.

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
