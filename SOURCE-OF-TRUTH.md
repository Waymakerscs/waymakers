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
- Browser storage keys `cognation.well.*` (including `cognation.well.portal.v1`, `cognation.well.auth.patient.v1`, and `cognation.well.auth.provider.v1`). `cognation.well.auth.v1` remains the historical shared-session name: it is deleted on WELL boot and no longer grants either portal.

A later rename must leave a working alias until every caller has moved. Dropping the alias in the same change will lock people out of sign-in or the WELL demo chart.

## Auth posture (no shipped secrets)

Two locks. They are not the same control.

- **Site sign-in** is WAYMAKERS Supabase. A local demo of the site shell is opt-in only: `?demo=1` or the **Demo unlock** control writes sessionStorage `waymakers.demo.unlock.v1`. That flag does not unlock WELL.
- **WELL sign-in** is a second lock per portal (`js/well-auth.js` + `POST /api/well-auth`). Patient and Provider each require that side’s username, password, and one-time code. Unlocking one side does not open the other. The same person may be on both allowlists with different passwords.
- Usernames and passwords live in Cloudflare Pages env, not in static JS: `WELL_AUTH_PATIENT_USERS`, `WELL_AUTH_PATIENT_PASSWORD`, `WELL_AUTH_PROVIDER_USERS`, `WELL_AUTH_PROVIDER_PASSWORD`. Optional `WELL_AUTH_SECRET` is the shared HMAC key for challenge tickets. Legacy `WELL_AUTH_USERS` / `WELL_AUTH_PASSWORD` are not read; if only those exist, the side fails closed (“not configured for this side”) so the old shared password cannot open both portals. The one-time code is created per attempt after that side’s password matches. It is not a fixed value in the repository.
- Sessions are side-bound (`cognation.well.auth.patient.v1` and `cognation.well.auth.provider.v1`, tab close ends them). Switching sides requires that side’s unlock. Lock Patient / Lock Provider clears only that side. Site sign-out (`CognationWellAuth.lock()`) clears both. The historical shared key `cognation.well.auth.v1` is discarded and does not open either side.
- WELL remains a **local demo EHR**, not a production clinical system and not HIPAA. PHI must not leave the browser. Patient PHI stays on `cognation.well.portal.v1`. Provider SOAP (S/O/A/P only) stays on `cognation.well.soap.v1`. The provider opens the chart from the visit. The patient releases that same chart to the next doctor; the release does not copy PHI into provider storage and does not empty the chart.
- `server/` (in-memory session + screen-break) is **not live** on the Pages site. Pages does not call it.

## Deferred backends (honest UI)

| Surface | Status |
| --- | --- |
| CAREER Indeed / LinkedIn | Deeplink only. `functions/api/jobs.js` is not a live listings API. |
| CAREER Waymakers Apply | Local demo. Not a live application. |
| Apple Health | Local demo · manual export only. No live HealthKit sync. |
| HOME | Not live. Post-sign-in hub is still missing. |
| Express session service | Stub. Not the Pages session. |
