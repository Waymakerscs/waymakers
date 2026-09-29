# SOURCE OF TRUTH — WAYMAKERS

Canonical product, deploy target, and what must stay separate from Cognation.

## Product tree

| | |
| --- | --- |
| GitHub | [`Waymakerscs/waymakers`](https://github.com/Waymakerscs/waymakers) |
| Cloudflare Pages project | `waymakers` |
| Public site | `waymakers.pages.dev` |
| Product surfaces | **CAREER · HOME · WELL · PAGES** |

Canonical deploy path: **Waymakerscs/waymakers → `waymakers.pages.dev`.**

Do **not** deploy `waymakers-repo`. That checkout is Cognation-shaped and is not this product.

## Box working copy

On the working machine, the product checkout is:

`/workspace/waymakers`

Deploy Pages from that CAREER / HOME / WELL / PAGES tree (this GitHub repository). Do not deploy from `waymakers-repo`.

## Split from Cognation

Cognation stays on its own Pages site and its own Supabase project.

| | WAYMAKERS | Cognation (do not touch) |
| --- | --- | --- |
| Pages | `waymakers` / `waymakers.pages.dev` | `cognation-3md.pages.dev` |
| Supabase | Project referenced by `js/cognation-config.js` (`WAYMAKERSConfig`) | Cognation Supabase project |

Do not point WAYMAKERS config, functions, or deploys at the Cognation Pages project or the Cognation Supabase project. Do not copy Cognation secrets into this repo.

## Naming debt (follow-up — do not break auth here)

These names are inherited from Cognation and are **not** renamed in the security/org pass:

- `js/cognation-config.js` and the `CognationConfig` alias (kept beside `WAYMAKERSConfig`)
- `Cognation*` script aliases (`CognationAuth`, `CognationSupabase`, `CognationWellAuth`, and similar)
- Browser storage keys `cognation.well.*` (including `cognation.well.auth.v1` and `cognation.well.portal.v1`)

A later rename must leave a working alias until every caller has moved. Dropping the alias in the same change will lock people out of sign-in or the WELL demo chart.

## Auth posture (no shipped secrets)

Two locks. They are not the same control.

- **Site sign-in** is WAYMAKERS Supabase. A local demo of the site shell is opt-in only: `?demo=1` or the **Demo unlock** control writes sessionStorage `waymakers.demo.unlock.v1`. That flag does not unlock WELL.
- **WELL sign-in** is the second lock (`js/well-auth.js` + `POST /api/well-auth`). Patient and Provider stay locked until a WELL username, password, and one-time code succeed. Usernames and the password live in Cloudflare Pages env (`WELL_AUTH_USERS`, `WELL_AUTH_PASSWORD`), not in static JS. The code is created per attempt after the password matches. It is not a fixed value in the repository.
- Patient and Provider are portal sides inside the unlocked chart, not a second pair of passwords. Both sides use the same WELL session (`cognation.well.auth.v1`, tab close ends it).
- WELL remains a **local demo EHR**, not a production clinical system and not HIPAA. PHI must not leave the browser.
- `server/` (in-memory session + screen-break) is **not live** on the Pages site. Pages does not call it.

## Deferred backends (honest UI)

| Surface | Status |
| --- | --- |
| CAREER Indeed / LinkedIn | Remote only. Fail closed until Pages env is set. Indeed mounts the official Publisher plugin after partner approval. LinkedIn has no job-search read API, so credentials still return no listings. No scrape and no substitute boards. |
| CAREER Waymakers Apply | Local demo. Not a live application. |
| Apple Health | Local demo · manual export only. No live HealthKit sync. |
| HOME | Not live. Post-sign-in hub is still missing. |
| Express session service | Stub. Not the Pages session. |
