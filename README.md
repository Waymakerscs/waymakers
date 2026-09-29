# Waymakers

**WAYMAKERS** on Cloudflare Pages (`waymakers.pages.dev`).

Canonical tree, deploy target, and Cognation split: [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md).

Cognation production (`cognation` / cognation-3md.pages.dev and Cognation GitHub/Supabase projects) is **untouched**.

## Landing

- Header masthead: **WAYMAKERS** wordmark (glowing black on silvery holo) + tagline “A wellness concierge”
- Signup / sign-in (WAYMAKERS Supabase)
- Tabs: **WELL · PAGES · HOME · CAREER** (roles stay distinct)
  - **WELL** — company/provider UI (EHR demo chart, roster, doctor→patient messages, audit-only doctor notes, Apple Health consent + export upload)
  - **PAGES** — local directory of what’s available (`pages.js`). Listings appear only after the browser shares a location, and only within 25 miles of that point. Denied or unavailable location asks you to enable it and does not substitute Chicago or any other city. **Directions** is turn-by-turn: Apple Maps `?daddr=&dirflg=d` on iPhone, iPad, and desktop; Google Maps `dir_action=navigate` on Android. No usable street address means no Directions control.
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

## WELL · Shared schedule (Teams-style demo)

Patient and Provider both get a clinic calendar that behaves like a Microsoft Teams shared staff calendar:

- Connect **Microsoft 365 / Teams** (demo). This overlays Hyde Park employee Outlook/Teams busy time. There is no live Graph sign-in and no token is stored.
- Toggle which employees are visible (Dr. Maya Chen, Dr. James Okonkwo, nurses, front desk). Disconnect hides the overlays and keeps those picks for the next connect.
- **First available** suggests the next open 30-minute visits from weekday clinic hours (9:00–12:00 and 1:00–4:30), existing WELL appointments, and — once connected — that doctor's mock calendar plus the demo patient's own Outlook holds.
- One-tap **Book** writes the visit into `cognation.well.portal.v1` (same portal store as the chart). It shows under Upcoming on the patient side and on the provider clinic schedule.
- **Everyone’s calendar is private.** Shared overlays are Busy / Free only. A person sees full detail on their own events (the patient’s visits and Outlook, or the signed-in provider’s own mailbox). Other patients’ names and reasons, and other employees’ short names, subjects, notes, and attendees, are not on the overlay. Opaque pills say Busy (or Unavailable on a held slot) with a hatch — not a staff short name. First-available uses the same free/busy gate. Clinic workflow names stay in a separate list labeled **Clinic schedule · provider only**. Demo only — not HIPAA-certified — and the overlay is masked that way (`presentForRole`).

Adapter: `js/well-calendar-connect.js` (`WellCalendarConnect.useAdapter` is the seam for a future Graph `calendarView`). Logic checks: `node js/well-calendar-connect.test.js`.

## Auth (WAYMAKERS Supabase)

- Project ref: `gjrxweezprhiosqewiah` (org COG-NATION) — **separate from Cognation**
- Browser config: `js/cognation-config.js` → `https://gjrxweezprhiosqewiah.supabase.co`
- Site sign-in is WAYMAKERS Supabase. Local demo of the site shell is `?demo=1` or **Demo unlock** (`waymakers.demo.unlock.v1`). That does not unlock WELL.
- WELL has two second locks, one per portal. `POST /api/well-auth` requires `side` (`patient` or `provider`) on the password step and the one-time-code step. Challenge tickets are bound to that side. Unlocking Patient does not open Provider. No WELL password or fixed code ships in static assets. The chart is still a demo EHR, not HIPAA; PHI must not leave the browser.
- Cloudflare Pages env (never commit the values):

  | Variable | Purpose |
  | --- | --- |
  | `WELL_AUTH_PATIENT_USERS` | Comma-separated Patient usernames |
  | `WELL_AUTH_PATIENT_PASSWORD` | Patient password. Checked on the server. |
  | `WELL_AUTH_PROVIDER_USERS` | Comma-separated Provider usernames |
  | `WELL_AUTH_PROVIDER_PASSWORD` | Provider password. Checked on the server. |
  | `WELL_AUTH_SECRET` | Optional shared HMAC key for challenge tickets |

  The same person may be listed on both sides with different passwords. Legacy `WELL_AUTH_USERS` / `WELL_AUTH_PASSWORD` are not read. If only those remain, each side fails closed with “WELL sign-in is not configured for this side,” so the old shared password cannot open both portals. Sessions live in `cognation.well.auth.patient.v1` and `cognation.well.auth.provider.v1`. Lock Patient / Lock Provider clears that side only. Site sign-out clears both. The old shared key `cognation.well.auth.v1` is discarded and does not grant either side.

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
