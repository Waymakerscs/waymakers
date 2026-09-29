/**
 * CAREER remote jobs — Indeed and LinkedIn only.
 *
 * Indeed display path (official): Publisher JavaScript plugin.
 *   https://docs.indeed.com/indeed-plus/publisher-js-plugin/
 *   Requires partner approval. There is no self-serve job-search API.
 *   The retired Publisher search API is not called. Job Sync is an employer
 *   write API and is not used as a listings feed.
 *
 * LinkedIn: no public job-search read API.
 *   https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview
 *   Job Posting is write-only, partner-gated, and not open to new partnerships.
 *   Credentials do not unlock a search. This module does not scrape.
 *
 * Cloudflare Pages env (never commit values):
 *   INDEED_PARTNER_APP_ID    Indeed-issued plugin partner app id
 *   INDEED_PLACEMENT_ID      Indeed-issued plugin placement id
 *   LINKEDIN_CLIENT_ID       LinkedIn app client id
 *   LINKEDIN_CLIENT_SECRET   LinkedIn app client secret
 *   LINKEDIN_ACCESS_TOKEN    optional token; or set client id + secret
 *
 * Ignored if present (retired; not a live search credential):
 *   INDEED_PUBLISHER_ID
 *   INDEED_API_KEY
 */

var INDEED_PLUGIN_SCRIPT = "https://plugins.indeed.com/publisher-plugin/main.js";

var DOCS = {
  indeedPlugin: "https://docs.indeed.com/indeed-plus/publisher-js-plugin/",
  indeedJobSync: "https://docs.indeed.com/job-sync-api/",
  linkedinJobPosting:
    "https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview",
};

var ENV = {
  INDEED_PARTNER_APP_ID: "INDEED_PARTNER_APP_ID",
  INDEED_PLACEMENT_ID: "INDEED_PLACEMENT_ID",
  LINKEDIN_CLIENT_ID: "LINKEDIN_CLIENT_ID",
  LINKEDIN_CLIENT_SECRET: "LINKEDIN_CLIENT_SECRET",
  LINKEDIN_ACCESS_TOKEN: "LINKEDIN_ACCESS_TOKEN",
};

var PLUGIN_ID = /^[A-Za-z0-9._:+/=-]{1,128}$/;

function trim(value) {
  return String(value == null ? "" : value).trim();
}

function cleanText(value, max) {
  return trim(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function indeedRemoteQuery(q, location) {
  var parts = [];
  var keywords = cleanText(q, 80);
  var loc = cleanText(location, 80);
  if (keywords) parts.push(keywords);
  if (loc && loc.toLowerCase() !== "remote") parts.push(loc);
  return {
    remoteOnly: true,
    workplace: "Remote",
    searchWhat: parts.join(" ").slice(0, 120),
    searchWhere: "Remote",
  };
}

function linkedInRemoteQuery(q, location) {
  return {
    remoteOnly: true,
    workplaceTypes: ["Remote"],
    keywords: cleanText(q, 120),
    location: cleanText(location, 80),
  };
}

function base(source, query) {
  return {
    ok: false,
    mode: "not_configured",
    source: source,
    remote: true,
    jobs: [],
    missing: [],
    rejected: [],
    partnerApprovalRequired: true,
    query: query,
  };
}

function ignoredIndeedKeys(env) {
  var names = [];
  if (trim(env && env.INDEED_PUBLISHER_ID)) names.push("INDEED_PUBLISHER_ID");
  if (trim(env && env.INDEED_API_KEY)) names.push("INDEED_API_KEY");
  return names;
}

function buildIndeedRemote(env, q, location) {
  env = env || {};
  var query = indeedRemoteQuery(q, location);
  var payload = base("indeed", query);
  payload.docs = DOCS.indeedPlugin;
  payload.notUsed = {
    retiredPublisherSearch: ignoredIndeedKeys(env),
    jobSync: DOCS.indeedJobSync,
  };

  var appId = trim(env.INDEED_PARTNER_APP_ID);
  var placementId = trim(env.INDEED_PLACEMENT_ID);
  var missing = [];
  if (!appId) missing.push(ENV.INDEED_PARTNER_APP_ID);
  if (!placementId) missing.push(ENV.INDEED_PLACEMENT_ID);
  var retired = ignoredIndeedKeys(env);
  var retiredNote = retired.length
    ? " " +
      retired.join(" and ") +
      (retired.length === 1 ? " is ignored." : " are ignored.") +
      " The old Indeed Publisher search API is retired and is not called."
    : "";

  if (missing.length) {
    payload.missing = missing;
    payload.message =
      "Indeed remote jobs are not configured. Set " +
      missing.join(" and ") +
      " on Cloudflare Pages (project waymakers → Settings → Environment variables). " +
      "Indeed’s official way to show its jobs on another site is the Publisher JavaScript plugin, which requires partner approval. " +
      "There is no self-serve job-search API. This response contains no listings." +
      retiredNote;
    return payload;
  }

  var rejected = [];
  if (!PLUGIN_ID.test(appId)) rejected.push(ENV.INDEED_PARTNER_APP_ID);
  if (!PLUGIN_ID.test(placementId)) rejected.push(ENV.INDEED_PLACEMENT_ID);
  if (rejected.length) {
    payload.rejected = rejected;
    payload.message =
      "Indeed remote jobs are not configured. " +
      rejected.join(" and ") +
      " is set, but the value is not a plugin identifier, so it was not sent to the browser. " +
      "No listings are shown.";
    return payload;
  }

  var attributes = {
    "data-indeed-plugin-type": "job-search",
    "data-indeed-partner-app-id": appId,
    "data-indeed-placement-id": placementId,
    "data-indeed-search-limit": "10",
    "data-indeed-search-where": "Remote",
  };
  if (query.searchWhat) {
    attributes["data-indeed-search-what"] = query.searchWhat;
  }

  payload.ok = true;
  payload.mode = "plugin";
  payload.message =
    "Indeed remote search uses the official Publisher plugin. The location is Remote. Indeed renders the jobs; Waymakers does not copy them into its own cards.";
  payload.plugin = {
    scriptUrl: INDEED_PLUGIN_SCRIPT,
    attributes: attributes,
  };
  return payload;
}

function linkedInStatus(env) {
  env = env || {};
  var token = trim(env.LINKEDIN_ACCESS_TOKEN);
  var id = trim(env.LINKEDIN_CLIENT_ID);
  var secret = trim(env.LINKEDIN_CLIENT_SECRET);
  if (token || (id && secret)) return { configured: true };
  var missing = [];
  if (!id) missing.push(ENV.LINKEDIN_CLIENT_ID);
  if (!secret) missing.push(ENV.LINKEDIN_CLIENT_SECRET);
  if (!token) missing.push(ENV.LINKEDIN_ACCESS_TOKEN);
  return { configured: false, missing: missing };
}

function buildLinkedInRemote(env, q, location) {
  var query = linkedInRemoteQuery(q, location);
  var payload = base("linkedin", query);
  payload.docs = DOCS.linkedinJobPosting;
  payload.acceptingNewJobPostingPartners = false;
  var status = linkedInStatus(env);

  if (!status.configured) {
    payload.missing = status.missing;
    payload.message =
      "LinkedIn remote jobs are not configured. Set LINKEDIN_ACCESS_TOKEN, or both LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET, on Cloudflare Pages (project waymakers → Settings → Environment variables). " +
      "LinkedIn does not offer a public job-search API. The Job Posting API is write-only, needs partner approval, and Microsoft is not accepting new Job Posting partnerships (request Apply Connect). " +
      "This response contains no listings.";
    return payload;
  }

  payload.mode = "partner_blocked";
  payload.credentialsPresent = true;
  payload.message =
    "LinkedIn credentials are set, but LinkedIn still has no job-search API for remote listings. " +
    "The Job Posting API cannot read the public jobs index, and new Job Posting partnerships are closed. No listings are shown.";
  return payload;
}

function isRemoteListing(job) {
  if (!job || typeof job !== "object") return false;
  if (job.remote === false) return false;
  var types = Array.isArray(job.workplaceTypes) ? job.workplaceTypes : [];
  var workplace = trim(job.workplace || job.workplaceType || "");
  var labeled = types.map(function (t) {
    return trim(t);
  });
  if (workplace) labeled.push(workplace);
  var nonRemote = labeled.some(function (t) {
    return /^(on-?site|hybrid|in-office|in office)$/i.test(t);
  });
  if (nonRemote) return false;
  var remote = labeled.some(function (t) {
    return /^(remote|fully remote|work from home)$/i.test(t);
  });
  return remote || job.remote === true;
}

function normalizeRemoteListing(job, source, index) {
  if (!isRemoteListing(job)) return null;
  var title = cleanText(job.title, 180);
  var url = trim(job.url || job.link);
  if (!title || !/^https:\/\//i.test(url) || url.length > 500) return null;
  return {
    id: cleanText(job.id, 80) || source + "-remote-" + index,
    source: source,
    remote: true,
    external: true,
    title: title,
    type: cleanText(job.type, 40) || "Remote",
    location: cleanText(job.location, 120) || "Remote",
    blurb: cleanText(job.blurb || job.description, 400),
    companyName:
      cleanText(job.companyName || job.company, 120) ||
      (source === "indeed" ? "Indeed" : "LinkedIn"),
    companyId: "",
    posted: cleanText(job.posted, 40),
    url: url,
  };
}

function listingsFromPartnerRows(rows, source) {
  if (!Array.isArray(rows)) return [];
  var out = [];
  rows.forEach(function (row, i) {
    var job = normalizeRemoteListing(row, source, i);
    if (job) out.push(job);
  });
  return out;
}

function buildJobsPayload(source, env, q, location) {
  var src = String(source || "").toLowerCase();
  if (src === "indeed") return buildIndeedRemote(env, q, location);
  if (src === "linkedin") return buildLinkedInRemote(env, q, location);
  return {
    ok: false,
    mode: "error",
    source: src,
    remote: true,
    jobs: [],
    message: "Unknown source. Use source=indeed or source=linkedin.",
  };
}

export {
  INDEED_PLUGIN_SCRIPT,
  DOCS,
  ENV,
  buildJobsPayload,
  buildIndeedRemote,
  buildLinkedInRemote,
  listingsFromPartnerRows,
  normalizeRemoteListing,
};
