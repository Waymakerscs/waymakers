/**
 * Apple Maps directions for PAGES listings.
 *
 * Uses an https://maps.apple.com query URL (daddr). On iPhone and iPad that
 * opens the Maps app. On desktop it opens Apple Maps in the browser.
 * The maps:// scheme is not used — it is a dead link off Apple devices.
 */
(function (root) {
  "use strict";

  var PLACEHOLDERS = {
    "n/a": true,
    na: true,
    none: true,
    null: true,
    undefined: true,
    tbd: true,
    tba: true,
    unknown: true,
    online: true,
    remote: true,
    virtual: true,
    "by appointment": true,
    "call for address": true,
    "coming soon": true,
    "no address": true,
    "not available": true,
    mobile: true,
    "mobile van": true,
    "-": true,
    "—": true,
    "–": true,
    ".": true,
  };

  function collapse(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  /**
   * A usable listing address can be dropped into Apple Maps as a destination.
   * Neighborhood labels, city/zip only, and placeholders are not destinations.
   */
  function isUsableAddress(value) {
    var s = collapse(value);
    if (!s || s.length < 8) return false;
    if (PLACEHOLDERS[s.toLowerCase()]) return false;
    return /\b\d{1,6}\s+[A-Za-z0-9]/.test(s);
  }

  function appleMapsDirectionsUrl(address) {
    var s = collapse(address);
    if (!isUsableAddress(s)) return "";
    return "https://maps.apple.com/?daddr=" + encodeURIComponent(s);
  }

  function directionsHrefForListing(item) {
    if (!item) return "";
    return appleMapsDirectionsUrl(item.address);
  }

  root.WaymakersPagesDirections = {
    isUsableAddress: isUsableAddress,
    appleMapsDirectionsUrl: appleMapsDirectionsUrl,
    directionsHrefForListing: directionsHrefForListing,
  };
})(typeof window !== "undefined" ? window : globalThis);
