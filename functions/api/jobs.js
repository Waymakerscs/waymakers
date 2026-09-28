/**
 * GET /api/jobs?source=indeed|linkedin&location=&q=
 *
 * Proxy stub for Indeed Publisher / LinkedIn Jobs when secrets exist on the
 * Pages project. Client never holds API secrets — only optional public IDs
 * in js/cognation-config.js (WAYMAKERSConfig.jobs).
 *
 * Env (Cloudflare Pages → Settings → Environment variables):
 *   INDEED_PUBLISHER_ID   — Indeed Publisher / affiliate public id (server-held)
 *   INDEED_API_KEY        — if Indeed issues a secret for your account
 *   LINKEDIN_CLIENT_ID    — LinkedIn partner app (Jobs API is partner-gated)
 *   LINKEDIN_CLIENT_SECRET
 *   LINKEDIN_ACCESS_TOKEN — or use OAuth flow when partnership is approved
 *
 * Without credentials: returns mode "deeplink" with honest search URLs
 * (same as the client adapter). Never scrapes HTML as the permanent path.
 */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=300",
  };
}

function indeedSearchUrl(location, q) {
  const params = new URLSearchParams();
  params.set("q", q || "healthcare");
  params.set("l", location || "Chicago, IL");
  return "https://www.indeed.com/jobs?" + params.toString();
}

function linkedinSearchUrl(location, q) {
  const params = new URLSearchParams();
  params.set("keywords", q || "healthcare");
  params.set("location", location || "Chicago, IL");
  return "https://www.linkedin.com/jobs/search/?" + params.toString();
}

function deeplinkPayload(source, location, q) {
  const url =
    source === "linkedin"
      ? linkedinSearchUrl(location, q)
      : indeedSearchUrl(location, q);
  return {
    ok: true,
    mode: "deeplink",
    source,
    location,
    q,
    message:
      source === "linkedin"
        ? "LinkedIn Jobs API is partner-gated. Set LINKEDIN_* secrets after partnership approval, or use the deep-link card."
        : "Indeed Publisher credentials not configured. Set INDEED_PUBLISHER_ID (and INDEED_API_KEY if required), or use the deep-link card.",
    searchUrl: url,
    jobs: [],
  };
}

/**
 * Placeholder for a real Indeed Publisher Job Search call.
 * Wire the official endpoint here once you have a publisher account —
 * do not HTML-scrape indeed.com.
 */
async function fetchIndeedListings(env, location, q) {
  const publisherId = env.INDEED_PUBLISHER_ID || "";
  if (!publisherId) return null;
  // Stub: credentials present but live HTTP not wired in v1.
  // Return null so the client falls back to deep-link cards until the
  // official Publisher Job Search URL + params are confirmed for your account.
  void q;
  void location;
  void env.INDEED_API_KEY;
  return null;
}

/**
 * Placeholder for LinkedIn partner Jobs API.
 */
async function fetchLinkedInListings(env, location, q) {
  const ready =
    env.LINKEDIN_ACCESS_TOKEN ||
    (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET);
  if (!ready) return null;
  void q;
  void location;
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const source = (url.searchParams.get("source") || "indeed").toLowerCase();
  const location = (url.searchParams.get("location") || "Chicago, IL").trim();
  const q = (url.searchParams.get("q") || "healthcare").trim();
  const env = context.env || {};

  try {
    if (source === "indeed") {
      const listings = await fetchIndeedListings(env, location, q);
      if (listings && listings.length) {
        return Response.json(
          { ok: true, mode: "listings", source, location, q, jobs: listings },
          { headers: corsHeaders() }
        );
      }
      return Response.json(deeplinkPayload("indeed", location, q), {
        headers: corsHeaders(),
      });
    }

    if (source === "linkedin") {
      const listings = await fetchLinkedInListings(env, location, q);
      if (listings && listings.length) {
        return Response.json(
          { ok: true, mode: "listings", source, location, q, jobs: listings },
          { headers: corsHeaders() }
        );
      }
      return Response.json(deeplinkPayload("linkedin", location, q), {
        headers: corsHeaders(),
      });
    }

    return Response.json(
      {
        ok: false,
        error: "Unknown source. Use source=indeed or source=linkedin.",
        jobs: [],
      },
      { status: 400, headers: corsHeaders() }
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: String(err && err.message ? err.message : err),
        jobs: [],
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}
