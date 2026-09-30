# Waymakers

**WAYMAKERS** on Cloudflare Pages (`waymakers.pages.dev`).

Canonical tree, deploy target, and Cognation split: [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md).

Cognation production (`cognation` / cognation-3md.pages.dev and Cognation GitHub/Supabase projects) is **untouched**.

## Landing

- Header masthead: **WAYMAKERS** wordmark (glowing black on silvery holo) + quote “Where there is a will, we make a way.”
- Signup / sign-in (WAYMAKERS Supabase)
- Tabs: **WELL · PLAN · DESK · PAGES · HOME · CAREER** (roles stay distinct)
  - **WELL** — Patient chart (PHI stays in this browser) and Provider visit chart (SOAP only). Patient and Provider sign-ins are separate. The patient releases the same chart to the next doctor.
  - **PLAN** — blank white page immediately to the right of WELL (title only, no body copy, cards, or widgets)
  - **DESK** — Waymakers-only blank white page beside WELL (v1; title only, no body copy, cards, or widgets)
  - **PAGES** — local directory of what’s available (`pages.js`). Listings appear only after the browser shares a location, and only within 25 miles of that point. Denied or unavailable location asks you to enable it and does not substitute Chicago or any other city. Live results are Google Places via `GET /api/pages` (Pages Function). The key is Cloudflare Pages env `GOOGLE_PLACES_API_KEY` and is never sent to the browser. Without that key the tab stays empty and says Google Places is not configured — the Chicago sample catalog is not shown as nearby. That catalog is offline/dev only: open `?pagesDemo=1` (session key `waymakers.pages.demo.v1`). It is labeled “Demo catalog only — not live Google Places,” still needs this device’s location, and still uses the 25-mile radius, so a 405 (Oklahoma) device does not see Chicago samples. Site `?demo=1` does not turn the catalog on. **Directions** is turn-by-turn: Apple Maps `?daddr=&dirflg=d` on iPhone, iPad, and desktop; Google Maps `dir_action=navigate` on Android. No usable street address means no Directions control.
  - **HOME** — empty placeholder (content TBD)
  - **CAREER** — applicant board (UI label; panel ids / `#jobs` hash unchanged — `jobs.js` + `jobs-adapters.js`); Waymakers openings keyed by `companyId`, plus remote-only Indeed and LinkedIn. Credentials and documents (licensure, credentialing, college degree, resume) stay in this browser only (`career-credentials.js`)
- Tower, Commune, badges, and widgets are **not** included

## Company identity (Well ↔ Jobs ↔ Pages)

Shared registry: `js/companies.js` (`WaymakersCompanies`).

| Surface | Role | Link field |
| --- | --- | --- |
| WELL | Company/provider workspace | `provider.companyId` (e.g. Hyde Park Family Medicine) |
| CAREER (JOBS) | Where applicants apply | each post’s `companyId` |
| PAGES | Public directory | listing `companyId` → **View jobs** opens CAREER (JOBS panel) filtered to that company |

Deep link: `#jobs/<companyId>` (also `#jobs` for all). API: `WaymakersJobs.filterByCompany(id)`.

## CAREER / remote jobs (Indeed + LinkedIn)

Filters on the CAREER tab (jobs panel):

| Filter | Values |
| --- | --- |
| Company | Waymakers companies (`companyId`, same as WELL / PAGES). Passed as the keyword for Indeed / LinkedIn. |
| Location | City / region / zip. Filters Waymakers openings. Added as an Indeed / LinkedIn keyword. It does **not** turn remote off. |
| Source | `waymakers` \| `indeed` \| `linkedin` (or all) |

Indeed and LinkedIn results are **remote only**. Waymakers company openings stay on the board as local demo posts. No other job board is used as a stand-in.

### Behavior without keys (default — fail closed)

`GET /api/jobs` returns `mode: "not_configured"`, `jobs: []`, and the env names that are missing. The CAREER tab shows that status. It does **not** invent listings, scrape HTML, or deep-link a search page as if it were a job.

### Keys Alexa must set

Cloudflare Pages → project **waymakers** → Settings → Environment variables (Production and Preview). Never commit the values. Names are also listed in `.dev.vars.example` (copy to `.dev.vars` for local `wrangler pages dev`; `.dev.vars` is gitignored).

| Variable | Required | Partner approval |
| --- | --- | --- |
| `INDEED_PARTNER_APP_ID` | Yes, with the placement id, before Indeed can render | **Yes.** Indeed issues this for the [Publisher JavaScript plugin](https://docs.indeed.com/indeed-plus/publisher-js-plugin/). There is no self-serve job-search API. The Publisher program is not open self-serve. |
| `INDEED_PLACEMENT_ID` | Yes, with the partner app id | **Yes.** Indeed issues the placement id with the plugin. |
| `LINKEDIN_CLIENT_ID` | One of: this **and** `LINKEDIN_CLIENT_SECRET`, **or** `LINKEDIN_ACCESS_TOKEN` | **Yes, and it still will not list jobs.** LinkedIn has no public job-search API. |
| `LINKEDIN_CLIENT_SECRET` | With `LINKEDIN_CLIENT_ID`, unless a token is set | Same as above. Secret stays on the server and is never returned to the browser. |
| `LINKEDIN_ACCESS_TOKEN` | Alternative to client id + secret | Same blocker. [Job Posting API](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview) is write-only, partner-gated, and **not accepting new partnerships** (request Apply Connect). |

Do **not** set these expecting a live search. They are ignored:

| Variable | Why it is ignored |
| --- | --- |
| `INDEED_PUBLISHER_ID` | Retired Publisher search API. Not called. |
| `INDEED_API_KEY` | Same. Not a current job-search credential. |

### What happens after the keys are set

- **Indeed** — `mode: "plugin"`. The page loads only `https://plugins.indeed.com/publisher-plugin/main.js` and sets the documented location field to `Remote`. A typed city is a keyword (`data-indeed-search-what`), not a replacement for Remote. Indeed renders the jobs. The plugin’s published attributes do not include a separate workplace flag; Remote is the documented location value.
- **LinkedIn** — `mode: "partner_blocked"`, `jobs: []`, even when credentials are present. The intended query is `workplaceTypes: ["Remote"]`. There is no official search endpoint to call, so the adapter does not scrape `linkedin.com` and does not substitute another board.

Job Sync (`https://docs.indeed.com/job-sync-api/`) creates an employer’s own Indeed postings. It is not the public Indeed index and is not used here.

The browser only needs `WAYMAKERSConfig.jobs.apiProxyPath` (`/api/jobs` in `js/cognation-config.js`). It does not store partner ids.

Logic checks: `node functions/api/jobs.test.mjs`. Details: `functions/README.md`. Redeploy Pages so `functions/` ships with the site.

## CAREER · Credentials & documents (v1)

On the CAREER tab, above the job filters. Not a new top-level tab.

| Slot | Accepted files |
| --- | --- |
| Licensure | PDF or a photo (JPG, PNG, GIF, WEBP, BMP, TIFF, HEIC) |
| Credentialing | PDF or a photo (same types) |
| College degree | PDF or a photo (same types) |
| Resume | PDF (preferred), DOC, or DOCX |

Each slot holds one file. Add, replace, and remove update only that slot. Empty slots say nothing is saved yet.

Files stay in this browser in IndexedDB (`waymakers.career.credentials.v1`), the same idea as the WELL Apple Health export. The section is labeled a local demo. There is no upload, email, background check, or job-board handoff. If IndexedDB is missing or the write fails, the section fails closed and saves nothing. Indeed and LinkedIn stay remote-only and fail closed as before.

Logic checks: `node js/career-credentials.test.js`.

## WELL · Chart flow (v1)

Local demo EHR. Not HIPAA. PHI stays in this browser.

| Store | Who writes | What |
| --- | --- | --- |
| `cognation.well.portal.v1` | Patient | Chart PHI (vitals, meds, allergies, and the rest) plus release shares |
| `cognation.well.soap.v1` | Provider | SOAP notes only (S/O/A/P), tied to a visit |

The patient picks a doctor by booking an open time on that doctor’s schedule. The provider opens the chart from that visit. They can read the patient’s chart and files after the patient has released them, and they can save SOAP for the visit. A provider save that includes BP, meds, or other PHI fields is rejected and is not written into the SOAP store. Only the patient releases the chart and files. The next doctor reads the same record. Switching providers does not wipe it, and a provider release cannot move it off the patient chart.

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
- **Everyone’s calendar is private.** Shared overlays are Busy / Free only. A person sees full detail on their own events (the patient’s visits and Outlook, or the signed-in provider’s own mailbox). Other patients’ names and reasons, and other employees’ short names, subjects, notes, and attendees, are not on the overlay. Opaque pills say Busy (or Unavailable on a held slot) with a hatch — not a staff short name. First-available uses the same free/busy gate. Clinic workflow names stay in a separate list labeled **Clinic schedule · open a visit**. The open chart is that visit’s patient. Demo only — not HIPAA-certified — and the overlay is masked that way (`presentForRole`).

Adapter: `js/well-calendar-connect.js` (`WellCalendarConnect.useAdapter` is the seam for a future Graph `calendarView`). Logic checks: `node js/well-calendar-connect.test.js`.

## Auth (WAYMAKERS Supabase)

- Project ref: `gjrxweezprhiosqewiah` (org COG-NATION) — **separate from Cognation**
- Browser config: `js/cognation-config.js` → `https://gjrxweezprhiosqewiah.supabase.co`
- Site sign-in is WAYMAKERS Supabase. Local demo of the site shell is `?demo=1` only (`waymakers.demo.unlock.v1`). The public login gate has no Demo unlock control. That does not unlock WELL.
- WELL has two second locks, one per portal. `POST /api/well-auth` requires `side` (`patient` or `provider`) on the password step and the one-time-code step. Challenge tickets are bound to that side. Unlocking Patient does not open Provider. No WELL password or fixed code ships in static assets. The chart is still a demo EHR, not HIPAA; PHI must not leave the browser.
- Creating a provider username and password does not open the Provider portal. The application stays in this browser (`waymakers.provider.verification.v1`): a password hash and a Waymakers staff checklist (driver’s license reviewed, licensure reviewed, hired). No identity-document image is stored or uploaded. That username can sign in only after all three checks are recorded. Patient sign-in is unchanged. Provider usernames that were not created here still use only `/api/well-auth`.
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
