/**
 * GET /api/pages?lat=&lng=&q=&category=
 *
 * Google Places for the PAGES tab. The API key stays in the Cloudflare Pages
 * environment (GOOGLE_PLACES_API_KEY). The browser never receives it and this
 * module never calls Google from a client bundle.
 *
 * Missing key: configured:false, listings:[], and no demo catalog.
 * Radius is fixed at 25 miles. Caller-supplied radius is ignored.
 * Nearby Search when browsing or filtering by a known place type.
 * Text Search when the visitor types a keyword (or a category with no type).
 */

var NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
var TEXT_URL = "https://places.googleapis.com/v1/places:searchText";
var FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.location",
  "places.primaryType",
  "places.primaryTypeDisplayName",
].join(",");

var RADIUS_MILES = 25;
var RADIUS_METERS = 25 * 1609.344;
var EARTH_MILES = 3958.7613;
var MAX_RESULTS = 20;

var NOT_CONFIGURED =
  "Google Places is not configured. Waymakers will not show demo listings as businesses near you.";
var PLACES_UNAVAILABLE =
  "Google Places is unavailable right now. Waymakers will not show a demo city instead.";
var LOCATION_REQUIRED =
  "A device location is required. Waymakers will not show a default city.";

/** Place types from Google Table A. Unknown categories never become includedTypes. */
var CATEGORY_TYPES = {
  "Auto repair": ["car_repair"],
  Barber: ["barber_shop"],
  "Café": ["cafe"],
  Dentist: ["dentist"],
  Doctor: ["doctor"],
  Electrician: ["electrician"],
  Florist: ["florist"],
  Lawyer: ["lawyer"],
  "Pet store": ["pet_store"],
  Plumber: ["plumber"],
  Restaurant: ["restaurant"],
};

/** Categories with no stable Table A type. Text Search only. */
var CATEGORY_TEXT = {
  Daycare: "daycare",
  Groomer: "pet groomer",
  Handyman: "handyman",
  "House cleaner": "house cleaning",
  Landscaper: "landscaper",
};

var KNOWN_CATEGORIES = {};
Object.keys(CATEGORY_TYPES).forEach(function (name) {
  KNOWN_CATEGORIES[name] = true;
});
Object.keys(CATEGORY_TEXT).forEach(function (name) {
  KNOWN_CATEGORIES[name] = true;
});

function corsHeaders(extra) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Cache-Control": "no-store",
  };
  if (extra) {
    Object.keys(extra).forEach(function (key) {
      headers[key] = extra[key];
    });
  }
  return headers;
}

function json(status, body, cache) {
  var headers = corsHeaders(
    cache ? { "Cache-Control": cache } : null
  );
  headers["Content-Type"] = "application/json; charset=utf-8";
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

function placesKey(env) {
  var raw = env && env.GOOGLE_PLACES_API_KEY;
  var key = String(raw == null ? "" : raw).trim();
  return key;
}

function scrub(value, key) {
  var text = String(value == null ? "" : value);
  if (key) text = text.split(key).join("[redacted]");
  return text;
}

function parseCoord(raw, min, max) {
  if (raw == null) return null;
  var text = String(raw).trim();
  if (!text) return null;
  var n = Number(text);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function cleanQuery(raw) {
  var text = String(raw == null ? "" : raw)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 80) text = text.slice(0, 80).trim();
  return text;
}

function normalizeCategory(raw) {
  var text = String(raw == null ? "" : raw).trim();
  if (!text || text === "All categories") return "";
  return KNOWN_CATEGORIES[text] ? text : "";
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function milesBetween(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
}

function textOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value.text === "string") return value.text.trim();
  return "";
}

function titleType(primaryType) {
  return String(primaryType || "")
    .replace(/_/g, " ")
    .replace(/\b[a-z]/g, function (ch) {
      return ch.toUpperCase();
    })
    .trim();
}

function localityFromAddress(address) {
  var parts = String(address || "")
    .split(",")
    .map(function (part) {
      return part.trim();
    })
    .filter(Boolean);
  if (!parts.length) return "";
  var last = parts[parts.length - 1].toLowerCase();
  if (last === "usa" || last === "us" || last === "united states") parts.pop();
  if (parts.length >= 2) return parts[parts.length - 2];
  return "";
}

/**
 * Nearby Search for browse and typed categories.
 * Text Search for keywords and categories that have no Table A type.
 * Radius is always the server constant.
 */
function buildPlacesRequest(lat, lng, q, category) {
  var query = cleanQuery(q);
  var cat = normalizeCategory(category);
  var text = "";
  if (query && cat) text = query + " " + (CATEGORY_TEXT[cat] || cat);
  else if (query) text = query;
  else if (cat && CATEGORY_TEXT[cat]) text = CATEGORY_TEXT[cat];

  var circle = {
    center: { latitude: lat, longitude: lng },
    radius: RADIUS_METERS,
  };

  if (!text && cat && CATEGORY_TYPES[cat]) {
    return {
      endpoint: "searchNearby",
      url: NEARBY_URL,
      body: {
        languageCode: "en",
        regionCode: "US",
        maxResultCount: MAX_RESULTS,
        rankPreference: "DISTANCE",
        includedTypes: CATEGORY_TYPES[cat].slice(),
        locationRestriction: { circle: circle },
      },
    };
  }

  if (text) {
    return {
      endpoint: "searchText",
      url: TEXT_URL,
      body: {
        textQuery: text,
        languageCode: "en",
        regionCode: "US",
        maxResultCount: MAX_RESULTS,
        rankPreference: "DISTANCE",
        locationBias: { circle: circle },
      },
    };
  }

  return {
    endpoint: "searchNearby",
    url: NEARBY_URL,
    body: {
      languageCode: "en",
      regionCode: "US",
      maxResultCount: MAX_RESULTS,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: circle },
    },
  };
}

function mapPlace(place, originLat, originLng) {
  if (!place || typeof place !== "object") return null;
  var loc = place.location || {};
  var lat = Number(loc.latitude);
  var lng = Number(loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  var miles = milesBetween(originLat, originLng, lat, lng);
  if (!(miles <= RADIUS_MILES + 1e-6)) return null;
  var name = textOf(place.displayName);
  if (!name) return null;
  var address = String(place.formattedAddress || "").replace(/\s+/g, " ").trim();
  var category = textOf(place.primaryTypeDisplayName) || titleType(place.primaryType) || "Local";
  var phone = String(place.nationalPhoneNumber || "").trim();
  return {
    name: name,
    category: category,
    blurb: category + " · Google Places",
    phone: phone,
    neighborhood: localityFromAddress(address),
    address: address,
    lat: lat,
    lng: lng,
    placeId: String(place.id || "").trim(),
    source: "google-places",
    distanceMiles: miles,
  };
}

function mapPlaces(payload, originLat, originLng) {
  var list = payload && Array.isArray(payload.places) ? payload.places : [];
  var seen = {};
  var out = [];
  list.forEach(function (place) {
    var item = mapPlace(place, originLat, originLng);
    if (!item) return;
    var key = item.placeId || item.name + "|" + item.address;
    if (seen[key]) return;
    seen[key] = true;
    out.push(item);
  });
  out.sort(function (a, b) {
    return a.distanceMiles - b.distanceMiles;
  });
  return out.slice(0, MAX_RESULTS);
}

function unconfiguredBody() {
  return {
    ok: false,
    configured: false,
    mode: "unconfigured",
    radiusMiles: RADIUS_MILES,
    listings: [],
    message: NOT_CONFIGURED,
  };
}

export async function handlePagesGet(request, env, opts) {
  opts = opts || {};
  var fetchImpl = opts.fetch || globalThis.fetch;
  var url = new URL(request.url);
  var key = placesKey(env);
  if (!key) {
    return json(200, unconfiguredBody());
  }

  var lat = parseCoord(url.searchParams.get("lat"), -90, 90);
  var lng = parseCoord(url.searchParams.get("lng"), -180, 180);
  if (lat == null || lng == null) {
    return json(400, {
      ok: false,
      configured: true,
      mode: "error",
      radiusMiles: RADIUS_MILES,
      listings: [],
      message: LOCATION_REQUIRED,
    });
  }

  var spec = buildPlacesRequest(
    lat,
    lng,
    url.searchParams.get("q"),
    url.searchParams.get("category")
  );

  var googleRes;
  try {
    var init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(spec.body),
    };
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      init.signal = AbortSignal.timeout(8000);
    }
    googleRes = await fetchImpl(spec.url, init);
  } catch (err) {
    return json(502, {
      ok: false,
      configured: true,
      mode: "error",
      radiusMiles: RADIUS_MILES,
      listings: [],
      message: PLACES_UNAVAILABLE,
    });
  }

  var raw = "";
  try {
    raw = await googleRes.text();
  } catch (readErr) {
    raw = "";
  }
  if (!googleRes || !googleRes.ok) {
    void scrub(raw, key);
    return json(502, {
      ok: false,
      configured: true,
      mode: "error",
      radiusMiles: RADIUS_MILES,
      listings: [],
      message: PLACES_UNAVAILABLE,
    });
  }

  var payload;
  try {
    payload = JSON.parse(raw);
  } catch (parseErr) {
    return json(502, {
      ok: false,
      configured: true,
      mode: "error",
      radiusMiles: RADIUS_MILES,
      listings: [],
      message: PLACES_UNAVAILABLE,
    });
  }

  var listings = mapPlaces(payload, lat, lng);
  var body = {
    ok: true,
    configured: true,
    mode: "places",
    endpoint: spec.endpoint,
    radiusMiles: RADIUS_MILES,
    attribution: "Powered by Google",
    listings: listings,
    message: listings.length
      ? "Businesses within " + RADIUS_MILES + " miles of you."
      : "No places within " + RADIUS_MILES + " miles of you.",
  };
  var encoded = JSON.stringify(body);
  if (encoded.indexOf(key) !== -1) {
    return json(502, {
      ok: false,
      configured: true,
      mode: "error",
      radiusMiles: RADIUS_MILES,
      listings: [],
      message: PLACES_UNAVAILABLE,
    });
  }
  return json(200, body, "private, max-age=60");
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  return handlePagesGet(context.request, (context && context.env) || {});
}

export {
  RADIUS_MILES,
  RADIUS_METERS,
  NOT_CONFIGURED,
  PLACES_UNAVAILABLE,
  buildPlacesRequest,
  mapPlaces,
  milesBetween,
};
