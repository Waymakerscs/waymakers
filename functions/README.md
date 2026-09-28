# Waymakers Pages Functions

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
