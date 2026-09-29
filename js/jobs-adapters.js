/**
 * CAREER remote-source adapters — Indeed and LinkedIn only.
 *
 * The browser calls GET /api/jobs and never holds API secrets.
 * Missing keys, a partner block, or a failed request become a status
 * object with jobs: []. This file does not invent listings or deep-link cards.
 *
 * Indeed, once INDEED_PARTNER_APP_ID and INDEED_PLACEMENT_ID are set on
 * Cloudflare Pages, returns mode "plugin" for the official Publisher script.
 * LinkedIn returns mode "not_configured" or "partner_blocked".
 */
(function () {
  "use strict";

  var INDEED_PLUGIN_SCRIPT = "https://plugins.indeed.com/publisher-plugin/main.js";

  function cfg() {
    var root = window.WAYMAKERSConfig || window.CognationConfig || {};
    return root.jobs || {};
  }

  function defaultLocation() {
    return (cfg().defaultLocation || "Chicago, IL").trim();
  }

  function proxyBase() {
    return (cfg().apiProxyPath || "/api/jobs").replace(/\/$/, "");
  }

  function keywordsFor(opts) {
    opts = opts || {};
    return opts.query ? String(opts.query).trim() : "";
  }

  function unavailable(source) {
    var name = source === "linkedin" ? "LinkedIn" : "Indeed";
    return {
      ok: false,
      mode: "not_configured",
      source: source,
      remote: true,
      jobs: [],
      missing: [],
      message:
        name +
        " remote jobs are not configured. /api/jobs did not return a configuration response, so no listings are shown.",
    };
  }

  function fetchSource(source, opts) {
    opts = opts || {};
    if (typeof fetch !== "function") return Promise.resolve(unavailable(source));
    var url =
      proxyBase() +
      "?source=" +
      encodeURIComponent(source) +
      "&remote=1" +
      "&location=" +
      encodeURIComponent(String(opts.location || "").trim()) +
      "&q=" +
      encodeURIComponent(keywordsFor(opts));
    return fetch(url, { credentials: "omit" })
      .then(function (res) {
        return res.json().then(
          function (data) {
            return { res: res, data: data };
          },
          function () {
            return { res: res, data: null };
          }
        );
      })
      .then(function (parsed) {
        var data = parsed.data;
        if (!data || data.source !== source || !Array.isArray(data.jobs)) {
          return unavailable(source);
        }
        data.jobs = data.jobs.filter(function (job) {
          return job && job.remote === true && typeof job.url === "string" && /^https:\/\//i.test(job.url);
        });
        if (data.mode === "plugin") {
          var plugin = data.plugin;
          var where = plugin && plugin.attributes && plugin.attributes["data-indeed-search-where"];
          if (!plugin || plugin.scriptUrl !== INDEED_PLUGIN_SCRIPT || where !== "Remote") {
            return {
              ok: false,
              mode: "not_configured",
              source: source,
              remote: true,
              jobs: [],
              message:
                "Indeed’s response was not a remote-only official plugin, so it was not shown.",
            };
          }
        }
        return data;
      })
      .catch(function () {
        return unavailable(source);
      });
  }

  window.WaymakersJobsAdapters = {
    defaultLocation: defaultLocation,
    INDEED_PLUGIN_SCRIPT: INDEED_PLUGIN_SCRIPT,
    searchIndeed: function (opts) {
      return fetchSource("indeed", opts);
    },
    searchLinkedIn: function (opts) {
      return fetchSource("linkedin", opts);
    },
  };
})();
