/**
 * Nearby PAGES listings from the device's real coordinates.
 * There is no city fallback: missing or denied location yields no listings.
 */
(function (root) {
  "use strict";

  var RADIUS_MILES = 25;
  var EARTH_MILES = 3958.7613;

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function milesBetween(lat1, lng1, lat2, lng2) {
    if (![lat1, lng1, lat2, lng2].every(isFinite)) return Infinity;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function withinRadius(listings, lat, lng, radiusMiles) {
    if (!isFinite(lat) || !isFinite(lng)) return [];
    var radius = typeof radiusMiles === "number" && isFinite(radiusMiles) ? radiusMiles : RADIUS_MILES;
    var out = [];
    (listings || []).forEach(function (item) {
      if (!item || !isFinite(item.lat) || !isFinite(item.lng)) return;
      var miles = milesBetween(lat, lng, item.lat, item.lng);
      if (miles <= radius + 1e-6) {
        var copy = {};
        Object.keys(item).forEach(function (key) {
          copy[key] = item[key];
        });
        copy.distanceMiles = miles;
        out.push(copy);
      }
    });
    out.sort(function (a, b) {
      return a.distanceMiles - b.distanceMiles;
    });
    return out;
  }

  function promptFor(reason) {
    if (reason === "pending") {
      return {
        message: "Checking your location to find businesses near you.",
        showRetry: false,
      };
    }
    if (reason === "denied") {
      return {
        message:
          "Location is blocked. Enable location for this site in your browser settings, then try again. Waymakers will not show businesses from another city.",
        showRetry: true,
      };
    }
    if (reason === "timeout") {
      return {
        message: "Location timed out. Try again. Waymakers will not show a default city.",
        showRetry: true,
      };
    }
    return {
      message:
        "Location is unavailable. Turn on location services for this browser and try again. Waymakers will not show a default city.",
      showRetry: true,
    };
  }

  /**
   * @param {Array} listings catalog (already category-filtered)
   * @param {{ok:boolean, lat?:number, lng?:number, reason?:string}|null} location
   *        null means still waiting. ok:false never fills in a city.
   */
  function nearbyResult(listings, location, radiusMiles) {
    var radius = typeof radiusMiles === "number" && isFinite(radiusMiles) ? radiusMiles : RADIUS_MILES;
    if (!location || location.ok !== true) {
      var prompt = promptFor(location && location.reason ? location.reason : "pending");
      return {
        listings: [],
        located: false,
        showRetry: prompt.showRetry,
        message: prompt.message,
        radiusMiles: radius,
      };
    }
    var near = withinRadius(listings, location.lat, location.lng, radius);
    return {
      listings: near,
      located: true,
      showRetry: false,
      radiusMiles: radius,
      message: near.length
        ? "Businesses within " + radius + " miles of you."
        : "No listings within " + radius + " miles of you.",
    };
  }

  root.WaymakersPagesNearby = {
    RADIUS_MILES: RADIUS_MILES,
    milesBetween: milesBetween,
    withinRadius: withinRadius,
    nearbyResult: nearbyResult,
  };
})(typeof window !== "undefined" ? window : globalThis);
