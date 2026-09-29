/**
 * GET /api/jobs?source=indeed|linkedin&q=&location=
 *
 * Remote-only Indeed and LinkedIn for the CAREER tab. Secrets stay in
 * Cloudflare Pages env. The browser never receives client secrets or tokens.
 *
 *   INDEED_PARTNER_APP_ID
 *   INDEED_PLACEMENT_ID
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   LINKEDIN_ACCESS_TOKEN
 *
 * `remote` is always forced on. Missing keys return mode "not_configured"
 * and an empty jobs array. LinkedIn credentials still return mode
 * "partner_blocked" because LinkedIn has no job-search read API.
 * See functions/lib/jobs-sources.js and functions/README.md.
 */

import { buildJobsPayload } from "../lib/jobs-sources.js";

function headersFor(mode) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": mode === "plugin" ? "private, max-age=60" : "no-store",
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: headersFor("not_configured") });
}

export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var source = (url.searchParams.get("source") || "").toLowerCase();
  var location = url.searchParams.get("location") || "";
  var q = url.searchParams.get("q") || "";
  var env = (context && context.env) || {};

  try {
    var payload = buildJobsPayload(source, env, q, location);
    var status = payload.mode === "error" ? 400 : 200;
    return Response.json(payload, { status: status, headers: headersFor(payload.mode) });
  } catch (e) {
    void e;
    return Response.json(
      {
        ok: false,
        mode: "error",
        source: source,
        remote: true,
        jobs: [],
        message: "The jobs API failed closed and did not return listings.",
      },
      { status: 500, headers: headersFor("error") }
    );
  }
}
