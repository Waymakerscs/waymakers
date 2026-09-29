# Waymakers Pages Functions

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

Proxy stub for Indeed Publisher / LinkedIn Jobs. Secrets stay in Cloudflare Pages environment variables — never in `js/cognation-config.js`.

| Variable | Purpose |
| --- | --- |
| `INDEED_PUBLISHER_ID` | Indeed Publisher / affiliate id |
| `INDEED_API_KEY` | Optional secret if Indeed issues one |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `LINKEDIN_ACCESS_TOKEN` | LinkedIn partner Jobs API (partner-gated) |

**Not live.** This Function is deeplink-only: it does not return job listings, even if Pages env vars are present. The response is `mode: "deeplink"` plus a public search URL. The CAREER tab labels those cards “Deeplink only · not live”. Wire official HTTP in `fetchIndeedListings` / `fetchLinkedInListings` before treating this as a listings API.

Do **not** HTML-scrape job boards as the permanent solution (brittle + ToS risk).

Deploy with the site root (functions/ sibling to index.html):

```bash
unset GITHUB_TOKEN
npx wrangler pages deploy . --project-name=waymakers --commit-dirty=true
```
