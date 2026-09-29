# Waymakers Pages Functions

## `GET /api/pages`

Google Places for the PAGES tab. The browser calls this Function only. It does not call `places.googleapis.com` or `maps.googleapis.com`.

| Variable | Purpose |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Places API (New) key. Set it in Cloudflare Pages → **waymakers** → Settings → Environment variables. Never commit it, and never put it in client JS. |

This Function reads **only** `GOOGLE_PLACES_API_KEY`. A blank value is treated as unset.

Query: `lat`, `lng`, optional `q` (keyword), optional `category` (PAGES category label). Radius is fixed at **25 miles** (40233.6 meters). A caller-supplied radius is ignored.

- No key: `200` `{ ok: false, configured: false, mode: "unconfigured", listings: [] }` and the message that Google Places is not configured. Google is not called. The Chicago sample catalog is not returned.
- Key plus lat/lng: Nearby Search (`places:searchNearby`) when browsing or filtering by a known place type. Text Search (`places:searchText`) when `q` is set, or when the category has no Places type (daycare, groomer, handyman, house cleaner, landscaper). Results farther than 25 miles are dropped.
- Google error or a non-JSON body: `502`, `listings: []`, message that Places is unavailable. No demo fallback.
- The key is sent only as the `X-Goog-Api-Key` header to Google. It is not written into the JSON response.

Enable **Places API (New)** on the Google Cloud key. The field mask asks for id, display name, formatted address, national phone number, location, and primary type.

Logic checks: `node functions/api/pages.test.mjs`.

## `POST /api/well-auth`

Separate second locks for the WELL Patient and Provider portals. Separate from WAYMAKERS site sign-in. A Patient unlock does not open Provider, and the reverse.

| Variable | Purpose |
| --- | --- |
| `WELL_AUTH_PATIENT_USERS` | Comma-separated Patient usernames |
| `WELL_AUTH_PATIENT_PASSWORD` | Patient password. Checked on the server. Never commit it. |
| `WELL_AUTH_PROVIDER_USERS` | Comma-separated Provider usernames |
| `WELL_AUTH_PROVIDER_PASSWORD` | Provider password. Checked on the server. Never commit it. |
| `WELL_AUTH_SECRET` | Optional shared HMAC key for challenge tickets. |

The same username may appear on both lists with different passwords. `side` or `role` (`patient` or `provider`) is required on `step: "credentials"` and `step: "otp"`. The challenge ticket is signed for that side and rejected if it is presented to the other side.

Legacy `WELL_AUTH_USERS` / `WELL_AUTH_PASSWORD` are not read. A host with only those variables returns 503 “WELL sign-in is not configured for this side,” so the old shared password cannot open either portal. Migrate by setting the four side-specific variables (and `WELL_AUTH_SECRET` if you want a stable HMAC key).

If `WELL_AUTH_SECRET` is unset, the HMAC fallback is `well-auth-v2`, a newline, the Patient password, a newline, and the Provider password. The legacy shared password is not part of that fallback. Rotating a side password changes the fallback key and invalidates outstanding tickets for both sides. Set `WELL_AUTH_SECRET` when tickets should survive a password change.

`step: "credentials"` checks the username and password for the given side. On success the response includes a 6-digit code created for that attempt and a signed, side-bound challenge (about 5 minutes). `step: "otp"` checks the code against that challenge and the same side. A side with missing users or password returns 503 and that portal stays locked.

Logic checks: `node functions/api/well-auth.test.mjs`.

## `GET /api/jobs`

Remote-only Indeed and LinkedIn for CAREER. `source=indeed` or `source=linkedin`. `q` and `location` are optional keywords. Remote is forced; a `remote=0` query does not turn it off. Secrets stay in Cloudflare Pages environment variables — never in `js/cognation-config.js`.

| Variable | Purpose |
| --- | --- |
| `INDEED_PARTNER_APP_ID` | Indeed Publisher plugin partner app id. **Partner approval required.** |
| `INDEED_PLACEMENT_ID` | Indeed Publisher plugin placement id. **Partner approval required.** |
| `LINKEDIN_CLIENT_ID` | LinkedIn app client id. Pair with the secret, or set the token instead. |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn app secret. Never returned to the browser. |
| `LINKEDIN_ACCESS_TOKEN` | Optional token in place of client id + secret. |

`INDEED_PUBLISHER_ID` and `INDEED_API_KEY` are **ignored**. The old Publisher search API is retired and is not called.

| Keys | Response |
| --- | --- |
| Indeed ids missing or unusable | `200`, `mode: "not_configured"`, `jobs: []` |
| Both Indeed ids set | `200`, `mode: "plugin"`, official script URL, `data-indeed-search-where=Remote`, `jobs: []` (Indeed renders the results) |
| LinkedIn keys missing | `200`, `mode: "not_configured"`, `jobs: []` |
| LinkedIn token, or client id + secret | `200`, `mode: "partner_blocked"`, `jobs: []` |

LinkedIn’s [Job Posting API](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview) is write-only and not open to new partnerships. This function does not scrape either site and does not call another job board.

Logic checks: `node functions/api/jobs.test.mjs`.

Do **not** HTML-scrape job boards.

Deploy with the site root (functions/ sibling to index.html):

```bash
unset GITHUB_TOKEN
npx wrangler pages deploy . --project-name=waymakers --commit-dirty=true
```
