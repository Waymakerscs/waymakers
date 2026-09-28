# Waymakers Pages Functions

## `GET /api/jobs`

Proxy stub for Indeed Publisher / LinkedIn Jobs. Secrets stay in Cloudflare Pages environment variables — never in `js/cognation-config.js`.

| Variable | Purpose |
| --- | --- |
| `INDEED_PUBLISHER_ID` | Indeed Publisher / affiliate id |
| `INDEED_API_KEY` | Optional secret if Indeed issues one |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `LINKEDIN_ACCESS_TOKEN` | LinkedIn partner Jobs API (partner-gated) |

Without credentials the endpoint returns `mode: "deeplink"` plus an honest search URL. The browser adapters show labeled **external** cards that open Indeed/LinkedIn search filtered by location.

Do **not** HTML-scrape job boards as the permanent solution (brittle + ToS risk).

Deploy with the site root (functions/ sibling to index.html):

```bash
unset GITHUB_TOKEN
npx wrangler pages deploy . --project-name=waymakers --commit-dirty=true
```
