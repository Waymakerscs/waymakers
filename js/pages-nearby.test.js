/**
 * Node tests for PAGES nearby filtering.
 * Run: node js/pages-nearby.test.js
 */
"use strict";

var assert = require("assert");
require("./pages-nearby.js");
require("./pages.js");

var near = globalThis.WaymakersPagesNearby;
var listings = globalThis.CognationPagesDemo;

var LOOP = { lat: 41.8781, lng: -87.6298 };
var NYC = { lat: 40.7128, lng: -74.006 };
var clark = listings.filter(function (item) {
  return item.name === "Clark Street Café";
})[0];

assert.ok(isFinite(clark.lat) && isFinite(clark.lng), "storefront has coordinates");
assert.ok(near.milesBetween(LOOP.lat, LOOP.lng, clark.lat, clark.lng) < near.RADIUS_MILES);
assert.ok(near.milesBetween(NYC.lat, NYC.lng, clark.lat, clark.lng) > near.RADIUS_MILES);

var inChicago = near.withinRadius(listings, LOOP.lat, LOOP.lng);
assert.ok(inChicago.some(function (item) { return item.name === "Clark Street Café"; }));
assert.ok(inChicago.every(function (item) { return item.distanceMiles <= near.RADIUS_MILES; }));
assert.ok(inChicago.length >= 20, "chicago device sees nearby storefronts");

var inNyc = near.withinRadius(listings, NYC.lat, NYC.lng);
assert.strictEqual(inNyc.length, 0, "no chicago businesses for a new york device");

assert.strictEqual(near.withinRadius(listings, NaN, LOOP.lng).length, 0);
assert.strictEqual(near.withinRadius(listings, null, null).length, 0);

var denied = near.nearbyResult(listings, { ok: false, reason: "denied" });
assert.strictEqual(denied.located, false);
assert.strictEqual(denied.listings.length, 0);
assert.strictEqual(denied.showRetry, true);
assert.ok(/Enable location/i.test(denied.message));
assert.ok(/will not show businesses from another city/i.test(denied.message));

var unavailable = near.nearbyResult(listings, { ok: false, reason: "unavailable" });
assert.strictEqual(unavailable.listings.length, 0);
assert.ok(/will not show a default city/i.test(unavailable.message));

var pending = near.nearbyResult(listings, null);
assert.strictEqual(pending.listings.length, 0);
assert.strictEqual(pending.showRetry, false);
assert.ok(/Checking your location/i.test(pending.message));

var grantedNyc = near.nearbyResult(listings, { ok: true, lat: NYC.lat, lng: NYC.lng });
assert.strictEqual(grantedNyc.located, true);
assert.strictEqual(grantedNyc.listings.length, 0);
assert.ok(/No listings within 25 miles/i.test(grantedNyc.message));

var grantedLoop = near.nearbyResult(listings, { ok: true, lat: LOOP.lat, lng: LOOP.lng });
assert.strictEqual(grantedLoop.located, true);
assert.ok(grantedLoop.listings.length > 0);
assert.ok(/within 25 miles/i.test(grantedLoop.message));

var tight = near.withinRadius(listings, clark.lat, clark.lng, 0.2);
assert.ok(tight.some(function (item) { return item.name === "Clark Street Café"; }));
assert.ok(tight.every(function (item) { return item.distanceMiles <= 0.2; }));
assert.ok(
  !tight.some(function (item) { return item.name === "Hyde Park Family Medicine — Dr. Maya Chen"; }),
  "a tight radius does not pull in the whole city"
);

var edgewater = listings.filter(function (item) {
  return item.name === "Edgewater Handyman Pros";
})[0];
assert.ok(!isFinite(edgewater.lat));
assert.ok(!near.withinRadius([edgewater], LOOP.lat, LOOP.lng).length);

console.log(
  "pages-nearby.test.js ok (loop " +
    inChicago.length +
    ", nyc " +
    inNyc.length +
    ", radius " +
    near.RADIUS_MILES +
    " mi)"
);
