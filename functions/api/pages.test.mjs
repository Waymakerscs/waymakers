/**
 * Run: node functions/api/pages.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  handlePagesGet,
  RADIUS_MILES,
  RADIUS_METERS,
  NOT_CONFIGURED,
  buildPlacesRequest,
  milesBetween,
} from "./pages.js";

const KEY = "unit-test-places-key";
const OKC = { lat: 35.4676, lng: -97.5164 };
const CHICAGO = { lat: 41.9804, lng: -87.6685 };

function get(params, env, fetchImpl) {
  const url = new URL("https://waymakers.pages.dev/api/pages");
  Object.keys(params || {}).forEach(function (name) {
    if (params[name] != null) url.searchParams.set(name, String(params[name]));
  });
  return handlePagesGet(new Request(url), env || {}, { fetch: fetchImpl });
}

function googlePlace(overrides) {
  return Object.assign(
    {
      id: "okc-1",
      displayName: { text: "Bricktown Books", languageCode: "en" },
      formattedAddress: "100 E Main St, Oklahoma City, OK 73102, USA",
      nationalPhoneNumber: "(405) 555-0199",
      location: { latitude: 35.468, longitude: -97.52 },
      primaryType: "book_store",
      primaryTypeDisplayName: { text: "Book store", languageCode: "en" },
    },
    overrides || {}
  );
}

function jsonResponse(body, status) {
  return {
    ok: (status || 200) >= 200 && (status || 200) < 300,
    status: status || 200,
    text: async function () {
      return JSON.stringify(body);
    },
  };
}

const okcBooks = googlePlace();
const chicagoCafe = googlePlace({
  id: "chi-1",
  displayName: { text: "Clark Street Café", languageCode: "en" },
  formattedAddress: "5411 N Clark St, Chicago, IL 60640, USA",
  nationalPhoneNumber: "(312) 555-0160",
  location: { latitude: CHICAGO.lat, longitude: CHICAGO.lng },
  primaryType: "cafe",
  primaryTypeDisplayName: { text: "Cafe", languageCode: "en" },
});

assert.strictEqual(RADIUS_MILES, 25);
assert.ok(Math.abs(RADIUS_METERS - 40233.6) < 0.001);
assert.ok(RADIUS_METERS <= 50000);
assert.ok(milesBetween(OKC.lat, OKC.lng, CHICAGO.lat, CHICAGO.lng) > 25);

let calls = 0;
let denied = await get(
  { lat: OKC.lat, lng: OKC.lng },
  {},
  async function () {
    calls += 1;
    throw new Error("should not call Google");
  }
);
assert.strictEqual(calls, 0);
assert.strictEqual(denied.status, 200);
let deniedBody = await denied.json();
assert.strictEqual(deniedBody.configured, false);
assert.strictEqual(deniedBody.mode, "unconfigured");
assert.deepEqual(deniedBody.listings, []);
assert.strictEqual(deniedBody.message, NOT_CONFIGURED);
assert.ok(!/Clark Street|Chicago/.test(JSON.stringify(deniedBody)));
assert.strictEqual(denied.headers.get("Cache-Control"), "no-store");

let blank = await get({ lat: OKC.lat, lng: OKC.lng }, { GOOGLE_PLACES_API_KEY: "   " }, async function () {
  throw new Error("blank key must not call Google");
});
assert.strictEqual((await blank.json()).configured, false);

let seen = null;
let live = await get(
  { lat: OKC.lat, lng: OKC.lng, radius: "500000" },
  { GOOGLE_PLACES_API_KEY: KEY },
  async function (url, init) {
    seen = { url: String(url), init: init };
    return jsonResponse({ places: [okcBooks, chicagoCafe] });
  }
);
assert.ok(seen);
assert.strictEqual(seen.url, "https://places.googleapis.com/v1/places:searchNearby");
assert.strictEqual(seen.init.method, "POST");
assert.strictEqual(seen.init.headers["X-Goog-Api-Key"], KEY);
assert.ok(seen.url.indexOf(KEY) === -1);
assert.ok(!seen.init.body.includes(KEY));
let sent = JSON.parse(seen.init.body);
assert.ok(Math.abs(sent.locationRestriction.circle.radius - RADIUS_METERS) < 0.001);
assert.strictEqual(sent.rankPreference, "DISTANCE");
assert.strictEqual(sent.maxResultCount, 20);
assert.ok(!sent.includedTypes);
assert.strictEqual(live.status, 200);
let liveBody = await live.json();
assert.strictEqual(liveBody.configured, true);
assert.strictEqual(liveBody.mode, "places");
assert.strictEqual(liveBody.attribution, "Powered by Google");
assert.strictEqual(liveBody.listings.length, 1);
assert.strictEqual(liveBody.listings[0].name, "Bricktown Books");
assert.strictEqual(liveBody.listings[0].source, "google-places");
assert.strictEqual(liveBody.listings[0].phone, "(405) 555-0199");
assert.strictEqual(liveBody.listings[0].neighborhood, "Oklahoma City");
assert.ok(liveBody.listings[0].address.indexOf("100 E Main St") === 0);
assert.ok(liveBody.listings[0].distanceMiles < 25);
assert.ok(!liveBody.listings.some(function (item) { return /Chicago|Clark Street/.test(item.name + item.address); }));
assert.ok(!JSON.stringify(liveBody).includes(KEY));
assert.strictEqual(live.headers.get("Cache-Control"), "private, max-age=60");

let textSeen = null;
let text = await get(
  { lat: OKC.lat, lng: OKC.lng, q: "bookstore", category: "All categories" },
  { GOOGLE_PLACES_API_KEY: KEY },
  async function (url, init) {
    textSeen = { url: String(url), body: JSON.parse(init.body) };
    return jsonResponse({ places: [okcBooks] });
  }
);
assert.strictEqual(textSeen.url, "https://places.googleapis.com/v1/places:searchText");
assert.strictEqual(textSeen.body.textQuery, "bookstore");
assert.ok(textSeen.body.locationBias.circle.radius === RADIUS_METERS);
assert.strictEqual((await text.json()).listings[0].name, "Bricktown Books");

let dentist = buildPlacesRequest(OKC.lat, OKC.lng, "", "Dentist");
assert.strictEqual(dentist.endpoint, "searchNearby");
assert.deepEqual(dentist.body.includedTypes, ["dentist"]);

let daycare = buildPlacesRequest(OKC.lat, OKC.lng, "", "Daycare");
assert.strictEqual(daycare.endpoint, "searchText");
assert.strictEqual(daycare.body.textQuery, "daycare");

let injected = buildPlacesRequest(OKC.lat, OKC.lng, "pizza", "not-a-real-type");
assert.strictEqual(injected.body.textQuery, "pizza");
assert.ok(!injected.body.includedTypes);

let combo = buildPlacesRequest(OKC.lat, OKC.lng, "kids", "Dentist");
assert.strictEqual(combo.endpoint, "searchText");
assert.strictEqual(combo.body.textQuery, "kids Dentist");

let missingLoc = await get({ q: "cafe" }, { GOOGLE_PLACES_API_KEY: KEY }, async function () {
  throw new Error("missing coordinates must not call Google");
});
assert.strictEqual(missingLoc.status, 400);
let missingBody = await missingLoc.json();
assert.deepEqual(missingBody.listings, []);
assert.strictEqual(missingBody.configured, true);
assert.match(missingBody.message, /device location/i);

let failed = await get({ lat: OKC.lat, lng: OKC.lng }, { GOOGLE_PLACES_API_KEY: KEY }, async function () {
  return {
    ok: false,
    status: 403,
    text: async function () {
      return JSON.stringify({ error: { message: "API key " + KEY + " denied" } });
    },
  };
});
assert.strictEqual(failed.status, 502);
let failedBody = await failed.json();
assert.deepEqual(failedBody.listings, []);
assert.strictEqual(failedBody.configured, true);
assert.match(failedBody.message, /unavailable/i);
assert.ok(!JSON.stringify(failedBody).includes(KEY));
assert.ok(!/Clark Street|Chicago/.test(JSON.stringify(failedBody)));

let thrown = await get({ lat: OKC.lat, lng: OKC.lng }, { GOOGLE_PLACES_API_KEY: KEY }, async function () {
  throw new Error("network down " + KEY);
});
assert.strictEqual(thrown.status, 502);
assert.ok(!(await thrown.json()).listings.length);

const serverSrc = readFileSync(new URL("./pages.js", import.meta.url), "utf8");
assert.ok(!/Clark Street Café|Ashland Avenue Barber/.test(serverSrc));
assert.ok(serverSrc.includes("GOOGLE_PLACES_API_KEY"));
assert.ok(!serverSrc.includes(KEY));

const clientBlob = [
  "js/pages.js",
  "js/pages-places.js",
  "js/pages-nearby.js",
  "js/pages-directions.js",
  "index.html",
].map(function (path) {
  return readFileSync(new URL("../../" + path, import.meta.url), "utf8");
}).join("\n");
assert.ok(!/places\.googleapis\.com|maps\.googleapis\.com/.test(clientBlob));
assert.ok(!/GOOGLE_PLACES_API_KEY/.test(clientBlob));
assert.ok(!/AIza[0-9A-Za-z_\-]{10,}/.test(clientBlob));

console.log("functions/api/pages.test.mjs ok");
