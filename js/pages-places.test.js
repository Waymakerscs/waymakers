/**
 * Node tests for PAGES Places source selection.
 * Run: node js/pages-places.test.js
 */
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

require("./pages-directions.js");
require("./pages-nearby.js");
require("./pages-places.js");
require("./pages.js");

var places = globalThis.WaymakersPagesPlaces;
var nearby = globalThis.WaymakersPagesNearby;
var pages = globalThis.WaymakersPages;
var dir = globalThis.WaymakersPagesDirections;
var demo = globalThis.CognationPagesDemo;

var OKC = { lat: 35.4676, lng: -97.5164 };
var LOOP = { lat: 41.8781, lng: -87.6298 };
var CHICAGO_NAMES = demo.map(function (item) {
  return item.name;
});

function memoryStorage(initial) {
  var data = Object.assign({}, initial);
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: function (key, value) {
      data[key] = String(value);
    },
  };
}

assert.strictEqual(places.readDemoGate("", memoryStorage()), false);
assert.strictEqual(places.readDemoGate("?demo=1", memoryStorage({ "waymakers.demo.unlock.v1": "1" })), false);
assert.strictEqual(places.readDemoGate("?pagesDemo=1", memoryStorage()), true);
assert.strictEqual(places.readDemoGate("?demo=1&pagesDemo=1", memoryStorage()), true);
assert.strictEqual(
  places.readDemoGate("", memoryStorage({ "waymakers.pages.demo.v1": "1" })),
  true
);
var store = memoryStorage();
places.persistDemoGate("?demo=1", store);
assert.strictEqual(store.getItem(places.DEMO_STORAGE_KEY), null);
places.persistDemoGate("?pagesDemo=1", store);
assert.strictEqual(store.getItem(places.DEMO_STORAGE_KEY), "1");

var closed = places.selectPagesSource({
  demoEnabled: false,
  payload: { ok: false, configured: false, mode: "unconfigured", listings: [] },
  demoListings: demo,
});
assert.strictEqual(closed.mode, "unconfigured");
assert.strictEqual(closed.listings.length, 0);
assert.ok(/not configured/i.test(closed.message));
assert.ok(/demo listings/i.test(closed.message));

var missing = places.selectPagesSource({ demoEnabled: false, demoListings: demo });
assert.strictEqual(missing.listings.length, 0);
assert.strictEqual(missing.mode, "unconfigured");

var errored = places.selectPagesSource({
  demoEnabled: false,
  payload: { ok: false, configured: true, mode: "error", listings: [] },
  demoListings: demo,
});
assert.strictEqual(errored.mode, "error");
assert.strictEqual(errored.listings.length, 0);
assert.ok(/unavailable/i.test(errored.message));

var okcListing = {
  name: "Bricktown Books",
  category: "Book store",
  blurb: "Book store · Google Places",
  phone: "(405) 555-0199",
  neighborhood: "Oklahoma City",
  address: "100 E Main St, Oklahoma City, OK 73102, USA",
  lat: 35.468,
  lng: -97.52,
  source: "google-places",
};
var chicagoLeak = {
  name: "Clark Street Café",
  category: "Café",
  address: "5411 N Clark St, Chicago, IL 60640",
  lat: 41.9804,
  lng: -87.6685,
  phone: "(312) 555-0160",
  source: "google-places",
};
var picked = places.selectPagesSource({
  demoEnabled: false,
  payload: {
    ok: true,
    configured: true,
    mode: "places",
    listings: [okcListing, chicagoLeak, { name: "Should drop", source: "demo", lat: OKC.lat, lng: OKC.lng }],
  },
  demoListings: demo,
});
assert.strictEqual(picked.mode, "places");
assert.strictEqual(picked.listings.length, 2);
assert.ok(picked.listings.every(function (item) { return item.source !== "demo"; }));

var url = places.buildPagesUrl(OKC.lat, OKC.lng, "books", "All categories");
assert.ok(url.indexOf("/api/pages?") === 0);
assert.ok(url.indexOf("lat=35.4676") !== -1);
assert.ok(url.indexOf("lng=-97.5164") !== -1);
assert.ok(url.indexOf("q=books") !== -1);
assert.ok(url.indexOf("category=") === -1);
assert.ok(url.indexOf("googleapis") === -1);

assert.strictEqual(nearby.withinRadius(demo, OKC.lat, OKC.lng).length, 0);
assert.ok(nearby.withinRadius(demo, LOOP.lat, LOOP.lng).length > 0);

function run(viewPromise, assertView) {
  return viewPromise.then(assertView);
}

var originalDemo = places.isDemoEnabled;
places.isDemoEnabled = function () {
  return false;
};

var fetchCalls = 0;
global.fetch = function () {
  fetchCalls += 1;
  return Promise.reject(new Error("location denied must not fetch"));
};

run(pages.loadPagesView("All categories", "", { ok: false, reason: "denied" }), function (view) {
  assert.strictEqual(fetchCalls, 0);
  assert.strictEqual(view.located, false);
  assert.strictEqual(view.listings.length, 0);
  assert.strictEqual(view.showRetry, true);
  assert.ok(/Enable location/i.test(view.message));
  assert.ok(!view.listings.some(function (item) { return CHICAGO_NAMES.indexOf(item.name) !== -1; }));
})
  .then(function () {
    fetchCalls = 0;
    global.fetch = function () {
      fetchCalls += 1;
      return Promise.resolve({
        status: 200,
        json: async function () {
          return {
            ok: false,
            configured: false,
            mode: "unconfigured",
            listings: [],
            message: places.NOT_CONFIGURED,
          };
        },
      });
    };
    return pages.loadPagesView("All categories", "", { ok: true, lat: OKC.lat, lng: OKC.lng });
  })
  .then(function (view) {
    assert.strictEqual(fetchCalls, 1);
    assert.strictEqual(view.mode, "unconfigured");
    assert.strictEqual(view.footer, "unconfigured");
    assert.strictEqual(view.listings.length, 0);
    assert.ok(/not configured/i.test(view.message));
    assert.ok(!/Clark Street|Ashland Avenue/.test(view.message));
    return pages.loadPagesView("All categories", "", { ok: true, lat: LOOP.lat, lng: LOOP.lng });
  })
  .then(function (chicagoUnconfigured) {
    assert.strictEqual(chicagoUnconfigured.listings.length, 0);
    assert.strictEqual(chicagoUnconfigured.mode, "unconfigured");
    global.fetch = function () {
      return Promise.resolve({
        status: 404,
        json: async function () {
          return { error: { code: "not_found", message: "The requested path could not be found" } };
        },
      });
    };
    return pages.loadPagesView("All categories", "", { ok: true, lat: OKC.lat, lng: OKC.lng });
  })
  .then(function (missingFunction) {
    assert.strictEqual(missingFunction.mode, "unconfigured");
    assert.strictEqual(missingFunction.listings.length, 0);
    assert.ok(/not configured/i.test(missingFunction.message));
    assert.ok(!missingFunction.listings.some(function (item) { return /Chicago/.test(item.address || ""); }));
    global.fetch = function (requestUrl) {
      assert.ok(String(requestUrl).indexOf("/api/pages?") === 0);
      assert.ok(String(requestUrl).indexOf("googleapis") === -1);
      return Promise.resolve({
        status: 200,
        json: async function () {
          return {
            ok: true,
            configured: true,
            mode: "places",
            listings: [okcListing, chicagoLeak],
            message: "Businesses within 25 miles of you.",
          };
        },
      });
    };
    return pages.loadPagesView("All categories", "", { ok: true, lat: OKC.lat, lng: OKC.lng });
  })
  .then(function (live) {
    assert.strictEqual(live.mode, "places");
    assert.strictEqual(live.footer, "places");
    assert.strictEqual(live.listings.length, 1);
    assert.strictEqual(live.listings[0].name, "Bricktown Books");
    assert.ok(live.listings[0].distanceMiles < 25);
    assert.ok(!live.listings.some(function (item) { return item.name === "Clark Street Café"; }));
    assert.ok(dir.isUsableAddress(live.listings[0].address));
    var iphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    var android =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    assert.ok(dir.directionsHrefForListing(live.listings[0], iphone).indexOf("https://maps.apple.com/?daddr=") === 0);
    assert.ok(dir.directionsHrefForListing(live.listings[0], android).indexOf("dir_action=navigate") !== -1);
    assert.strictEqual(dir.directionsHrefForListing({ name: "No address", address: "" }, iphone), "");
    places.isDemoEnabled = function () {
      return true;
    };
    var demoFetches = 0;
    global.fetch = function () {
      demoFetches += 1;
      return Promise.reject(new Error("demo gate must not call Google"));
    };
    return pages.loadPagesView("All categories", "", { ok: true, lat: OKC.lat, lng: OKC.lng }).then(function (demoOkc) {
      assert.strictEqual(demoFetches, 0);
      assert.strictEqual(demoOkc.mode, "demo");
      assert.strictEqual(demoOkc.listings.length, 0);
      assert.ok(/Demo catalog only/i.test(demoOkc.message));
      assert.ok(/not live Google Places/i.test(demoOkc.message));
      assert.ok(/No sample listings within 25 miles/i.test(demoOkc.message));
      return pages.loadPagesView("All categories", "", { ok: true, lat: LOOP.lat, lng: LOOP.lng });
    }).then(function (demoLoop) {
      assert.strictEqual(demoFetches, 0);
      assert.strictEqual(demoLoop.mode, "demo");
      assert.ok(demoLoop.listings.length > 0);
      assert.ok(demoLoop.listings.every(function (item) { return item.source === "demo"; }));
      assert.ok(demoLoop.listings.every(function (item) { return item.distanceMiles <= 25; }));
      assert.ok(/Demo catalog only/i.test(demoLoop.message));
      assert.ok(demoLoop.listings.some(function (item) { return item.name === "Clark Street Café"; }));
      places.isDemoEnabled = originalDemo;
      var client = ["pages.js", "pages-places.js", "pages-nearby.js", "pages-directions.js"].map(function (name) {
        return fs.readFileSync(path.join(__dirname, name), "utf8");
      }).join("\n");
      assert.ok(!/places\.googleapis\.com|maps\.googleapis\.com/.test(client));
      assert.ok(!/GOOGLE_PLACES_API_KEY/.test(client));
      console.log("pages-places.test.js ok");
    });
  })
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
