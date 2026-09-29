/**
 * PAGES source selection. Live results come from GET /api/pages (Pages Function).
 * This file does not call Google and does not contain an API key.
 * The Chicago sample catalog is used only when the visitor explicitly opens
 * ?pagesDemo=1 (stored for the tab session as waymakers.pages.demo.v1).
 * Site demo unlock (?demo=1) does not turn that catalog on.
 */
(function (root) {
  "use strict";

  var API_PATH = "/api/pages";
  var DEMO_STORAGE_KEY = "waymakers.pages.demo.v1";

  var NOT_CONFIGURED =
    "Google Places is not configured. Waymakers will not show demo listings as businesses near you.";
  var PLACES_UNAVAILABLE =
    "Google Places is unavailable right now. Waymakers will not show a demo city instead.";

  function pagesDemoRequested(search) {
    return /(?:^|[?&])pagesDemo=1(?:&|$)/.test(String(search || ""));
  }

  function readDemoGate(search, storage) {
    if (pagesDemoRequested(search)) return true;
    try {
      if (storage && storage.getItem(DEMO_STORAGE_KEY) === "1") return true;
    } catch (e) {}
    return false;
  }

  function persistDemoGate(search, storage) {
    if (!pagesDemoRequested(search) || !storage) return;
    try {
      storage.setItem(DEMO_STORAGE_KEY, "1");
    } catch (e) {}
  }

  function currentSearch() {
    try {
      if (typeof location !== "undefined" && location && typeof location.search === "string") {
        return location.search;
      }
    } catch (e) {}
    return "";
  }

  function currentStorage() {
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage) return sessionStorage;
    } catch (e) {}
    return null;
  }

  function isDemoEnabled(search, storage) {
    return readDemoGate(search == null ? currentSearch() : search, storage === undefined ? currentStorage() : storage);
  }

  function buildPagesUrl(lat, lng, query, category) {
    var params = new URLSearchParams();
    params.set("lat", String(lat));
    params.set("lng", String(lng));
    var q = String(query || "").trim();
    if (q) params.set("q", q);
    var cat = String(category || "").trim();
    if (cat && cat !== "All categories") params.set("category", cat);
    return API_PATH + "?" + params.toString();
  }

  /**
   * Live mode never returns the demo catalog, even if it was passed in.
   * demoEnabled must be the explicit offline/dev gate.
   */
  function selectPagesSource(opts) {
    opts = opts || {};
    if (opts.demoEnabled === true) {
      return {
        mode: "demo",
        listings: Array.isArray(opts.demoListings) ? opts.demoListings.slice() : [],
        configured: false,
        message: "",
      };
    }
    var payload = opts.payload;
    if (!payload || payload.configured === false || payload.mode === "unconfigured") {
      return {
        mode: "unconfigured",
        listings: [],
        configured: false,
        message: (payload && payload.message) || NOT_CONFIGURED,
      };
    }
    if (payload.ok === true && Array.isArray(payload.listings)) {
      var live = payload.listings.filter(function (item) {
        return item && item.source !== "demo";
      });
      return {
        mode: "places",
        listings: live,
        configured: true,
        message: payload.message || "",
      };
    }
    return {
      mode: "error",
      listings: [],
      configured: payload.configured !== false,
      message: (payload && payload.message) || PLACES_UNAVAILABLE,
    };
  }

  function demoMessage(count, radiusMiles) {
    var radius = radiusMiles || 25;
    var banner = "Demo catalog only — not live Google Places.";
    if (count) {
      return banner + " Sample listings within " + radius + " miles of this device.";
    }
    return banner + " No sample listings within " + radius + " miles of this device.";
  }

  function footerText(mode) {
    if (mode === "demo") return "Demo catalog only · not live Google Places";
    if (mode === "unconfigured") return "Google Places is not configured";
    if (mode === "places") return "Powered by Google · within 25 miles of you";
    if (mode === "error") return "Google Places is unavailable";
    return "Nearby results come from Google Places after you share your location.";
  }

  root.WaymakersPagesPlaces = {
    API_PATH: API_PATH,
    DEMO_STORAGE_KEY: DEMO_STORAGE_KEY,
    NOT_CONFIGURED: NOT_CONFIGURED,
    PLACES_UNAVAILABLE: PLACES_UNAVAILABLE,
    pagesDemoRequested: pagesDemoRequested,
    readDemoGate: readDemoGate,
    persistDemoGate: persistDemoGate,
    isDemoEnabled: isDemoEnabled,
    buildPagesUrl: buildPagesUrl,
    selectPagesSource: selectPagesSource,
    demoMessage: demoMessage,
    footerText: footerText,
  };
})(typeof window !== "undefined" ? window : globalThis);
