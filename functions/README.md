# Waymakers Pages Functions

## `POST /api/well-auth`

Second lock for the WELL chart. Separate from WAYMAKERS site sign-in. Patient and Provider both stay behind it.

| Variable | Purpose |
| --- | --- |
| `WELL_AUTH_USERS` | Comma-separated WELL usernames |
| `WELL_AUTH_PASSWORD` | WELL password. Checked on the server. Never commit it. |
| `WELL_AUTH_SECRET` | Optional HMAC key for the one-time code. Defaults to the password. |

`step: "credentials"` checks the username and password. On success the response includes a 6-digit code created for that attempt and a signed challenge (about 5 minutes). `step: "otp"` checks the code against that challenge. Without the env vars the function returns 503 and the chart stays locked.

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
