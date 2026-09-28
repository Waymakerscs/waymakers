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

## Auth posture (no shipped demo secrets)

- Site sign-in is WAYMAKERS Supabase. A local demo is opt-in only: `?demo=1` or the **Demo unlock** control writes sessionStorage `waymakers.demo.unlock.v1`. Static JS does not contain a demo password or a fixed one-time code.
- WELL is a **local demo EHR**, not a production clinical system. After that unlock, WELL creates a 6-digit code in the browser at runtime. PHI must not leave the browser.
- `server/` (in-memory session + screen-break) is **not live** on the Pages site. Pages does not call it.

## Deferred backends (honest UI)

| Surface | Status |
| --- | --- |
| CAREER Indeed / LinkedIn | Deeplink only. `functions/api/jobs.js` is not a live listings API. |
| CAREER Waymakers Apply | Local demo. Not a live application. |
| Apple Health | Local demo · manual export only. No live HealthKit sync. |
| HOME | Not live. Post-sign-in hub is still missing. |
| Express session service | Stub. Not the Pages session. |
