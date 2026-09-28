/**
 * JOBS source adapters — Waymakers demo, Indeed Publisher, LinkedIn Jobs.
 *
 * Indeed Publisher API and LinkedIn Jobs API need partner / publisher credentials.
 * Secrets never ship in the browser: put them on a Pages Function (`/api/jobs`)
 * and keep only public IDs in `WAYMAKERSConfig.jobs` (cognation-config style).
 *
 * Without keys, adapters return clearly labeled *external* deep-link cards
 * (honest search URLs filtered by location) — not fake scraped listings.
 */
(function () {
  "use strict";

  function cfg() {
    var root = window.WAYMAKERSConfig || window.CognationConfig || {};
    return root.jobs || {};
  }

  function defaultLocation() {
    return (cfg().defaultLocation || "Chicago, IL").trim();
  }

  function trimLoc(loc) {
    var s = String(loc == null ? "" : loc).trim();
    return s || defaultLocation();
  }

  function keywordsFor(opts) {
    opts = opts || {};
    var parts = [];
    if (opts.query) parts.push(String(opts.query).trim());
    if (opts.companyName) parts.push(String(opts.companyName).trim());
    return parts.filter(Boolean).join(" ") || "healthcare";
  }

  /** Indeed job search deep link (public HTML search; no API key). */
  function indeedSearchUrl(location, query) {
    var params = new URLSearchParams();
    params.set("q", query || "healthcare");
    params.set("l", location || defaultLocation());
    return "https://www.indeed.com/jobs?" + params.toString();
  }

  /** LinkedIn job search deep link (public HTML search; no API key). */
  function linkedinSearchUrl(location, query) {
    var params = new URLSearchParams();
    params.set("keywords", query || "healthcare");
    params.set("location", location || defaultLocation());
    return "https://www.linkedin.com/jobs/search/?" + params.toString();
  }

  function externalCard(source, title, blurb, location, url) {
    return {
      id: "ext-" + source + "-" + encodeURIComponent(location || "any").slice(0, 48),
      source: source,
      external: true,
      title: title,
      type: "External",
      location: location || defaultLocation(),
      blurb: blurb,
      companyName: source === "indeed" ? "Indeed" : "LinkedIn",
      companyId: "",
      posted: "",
      url: url,
    };
  }

  function indeedConfigured() {
    var j = cfg().indeed || {};
    return !!(j.enabled && (j.publisherId || j.publicId));
  }

  function linkedinConfigured() {
    var j = cfg().linkedin || {};
    return !!(j.enabled && j.partnerConfigured);
  }

  function proxyBase() {
    return (cfg().apiProxyPath || "/api/jobs").replace(/\/$/, "");
  }

  /**
   * Optional live fetch via Pages Function when secrets / publisher IDs are set.
   * Returns null when the proxy is unavailable or returns non-listings mode.
   */
  function fetchViaProxy(source, opts) {
    opts = opts || {};
    if (typeof fetch !== "function") return Promise.resolve(null);
    var url =
      proxyBase() +
      "?source=" +
      encodeURIComponent(source) +
      "&location=" +
      encodeURIComponent(trimLoc(opts.location)) +
      "&q=" +
      encodeURIComponent(keywordsFor(opts));
    return fetch(url, { credentials: "omit" })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok || data.mode !== "listings" || !Array.isArray(data.jobs)) {
          return null;
        }
        return data.jobs.map(function (j, i) {
          return {
            id: j.id || source + "-api-" + i,
            source: source,
            external: true,
            title: j.title || "Opening",
            type: j.type || "External",
            location: j.location || trimLoc(opts.location),
            blurb: j.blurb || j.description || "",
            companyName: j.companyName || j.company || (source === "indeed" ? "Indeed" : "LinkedIn"),
            companyId: j.companyId || "",
            posted: j.posted || "",
            url: j.url || j.link || "",
          };
        });
      })
      .catch(function () {
        return null;
      });
  }

  /**
   * Indeed adapter: live listings when publisher + proxy ready; else deep-link card.
   * @returns {Promise<Array>}
   */
  function searchIndeed(opts) {
    opts = opts || {};
    var loc = trimLoc(opts.location);
    var q = keywordsFor(opts);
    var deeplink = [
      externalCard(
        "indeed",
        "Search Indeed near " + loc,
        "External · opens Indeed job search for “" +
          q +
          "” in " +
          loc +
          ". Not a scraped listing — apply on Indeed.",
        loc,
        indeedSearchUrl(loc, q)
      ),
    ];

    if (!indeedConfigured() && !(cfg().useApiProxy)) {
      return Promise.resolve(deeplink);
    }

    return fetchViaProxy("indeed", opts).then(function (jobs) {
      return jobs && jobs.length ? jobs : deeplink;
    });
  }

  /**
   * LinkedIn adapter: partner API via proxy when configured; else deep-link card.
   * @returns {Promise<Array>}
   */
  function searchLinkedIn(opts) {
    opts = opts || {};
    var loc = trimLoc(opts.location);
    var q = keywordsFor(opts);
    var deeplink = [
      externalCard(
        "linkedin",
        "Search LinkedIn near " + loc,
        "External · opens LinkedIn job search for “" +
          q +
          "” in " +
          loc +
          ". LinkedIn Jobs API is partner-gated — apply on LinkedIn.",
        loc,
        linkedinSearchUrl(loc, q)
      ),
    ];

    if (!linkedinConfigured() && !(cfg().useApiProxy)) {
      return Promise.resolve(deeplink);
    }

    return fetchViaProxy("linkedin", opts).then(function (jobs) {
      return jobs && jobs.length ? jobs : deeplink;
    });
  }

  window.WaymakersJobsAdapters = {
    defaultLocation: defaultLocation,
    indeedSearchUrl: indeedSearchUrl,
    linkedinSearchUrl: linkedinSearchUrl,
    indeedConfigured: indeedConfigured,
    linkedinConfigured: linkedinConfigured,
    searchIndeed: searchIndeed,
    searchLinkedIn: searchLinkedIn,
  };
})();
