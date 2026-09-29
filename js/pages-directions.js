/**
 * Turn-by-turn directions for PAGES listings.
 *
 * iPhone / iPad and desktop: Apple Maps driving directions
 *   https://maps.apple.com/?daddr=...&dirflg=d
 *   (current location → destination). Not a place pin (`q`, `address`, `/place`).
 * Android: Google Maps turn-by-turn
 *   https://www.google.com/maps/dir/?api=1&destination=...&travelmode=driving&dir_action=navigate
 *   Not a search pin (`/maps/search` or `query=`).
 * The maps:// and google.navigation: schemes are not used — they are dead links
 * off their own platforms. https links still open the native app on iOS and Android.
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
   * A usable listing address is a street destination for turn-by-turn navigation.
   * Neighborhood labels, city/zip only, and placeholders are not destinations.
   */
  function isUsableAddress(value) {
    var s = collapse(value);
    if (!s || s.length < 8) return false;
    if (PLACEHOLDERS[s.toLowerCase()]) return false;
    return /\b\d{1,6}\s+[A-Za-z0-9]/.test(s);
  }

  function userAgentString(userAgent) {
    if (userAgent != null) return String(userAgent);
    if (typeof navigator !== "undefined" && navigator.userAgent) return navigator.userAgent;
    return "";
  }

  function prefersGoogleMaps(userAgent) {
    return /Android/i.test(userAgentString(userAgent));
  }

  /** Apple Maps driving directions from the user's current location. Not a pin. */
  function appleTurnByTurnUrl(address) {
    return "https://maps.apple.com/?daddr=" + encodeURIComponent(address) + "&dirflg=d";
  }

  /** Google Maps turn-by-turn navigation. Not a search/place pin. */
  function googleTurnByTurnUrl(address) {
    return (
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(address) +
      "&travelmode=driving&dir_action=navigate"
    );
  }

  function navigationUrl(address, userAgent) {
    var s = collapse(address);
    if (!isUsableAddress(s)) return "";
    if (prefersGoogleMaps(userAgent)) return googleTurnByTurnUrl(s);
    return appleTurnByTurnUrl(s);
  }

  function appleMapsDirectionsUrl(address) {
    var s = collapse(address);
    if (!isUsableAddress(s)) return "";
    return appleTurnByTurnUrl(s);
  }

  function directionsHrefForListing(item, userAgent) {
    if (!item) return "";
    return navigationUrl(item.address, userAgent);
  }

  root.WaymakersPagesDirections = {
    isUsableAddress: isUsableAddress,
    prefersGoogleMaps: prefersGoogleMaps,
    appleMapsDirectionsUrl: appleMapsDirectionsUrl,
    navigationUrl: navigationUrl,
    directionsHrefForListing: directionsHrefForListing,
  };
})(typeof window !== "undefined" ? window : globalThis);
