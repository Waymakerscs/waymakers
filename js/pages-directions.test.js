/**
 * Node tests for PAGES turn-by-turn directions.
 * iOS and desktop: Apple Maps daddr + dirflg=d (not a pin).
 * Android: Google Maps dir_action=navigate (not a search pin).
 * Run: node js/pages-directions.test.js
 */
"use strict";

var assert = require("assert");
require("./pages-directions.js");
require("./pages.js");

var dir = globalThis.WaymakersPagesDirections;
var listings = globalThis.CognationPagesDemo;

assert.strictEqual(typeof dir.isUsableAddress, "function");
assert.strictEqual(typeof dir.appleMapsDirectionsUrl, "function");

var clark = "5411 N Clark St, Chicago, IL 60640";
var IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
var IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
var CRIOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1";
var IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
var ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
var ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function assertAppleNavigation(url, label) {
  assert.ok(url.indexOf("https://maps.apple.com/?daddr=") === 0, label || url);
  assert.ok(url.indexOf("&dirflg=d") !== -1, "driving directions: " + url);
  assert.ok(url.indexOf("maps://") === -1, url);
  assert.ok(url.indexOf("/place") === -1, "not a place card: " + url);
  assert.ok(!/[?&]q=/.test(url), "not a search pin: " + url);
  assert.ok(!/[?&]address=/.test(url), "not an address pin: " + url);
}

function assertGoogleNavigation(url, label) {
  assert.ok(
    url.indexOf("https://www.google.com/maps/dir/?api=1&destination=") === 0,
    label || url
  );
  assert.ok(url.indexOf("&travelmode=driving") !== -1, url);
  assert.ok(url.indexOf("&dir_action=navigate") !== -1, "turn-by-turn: " + url);
  assert.ok(url.indexOf("/maps/search") === -1, "not a search pin: " + url);
  assert.ok(!/[?&]query=/.test(url), "not search-first: " + url);
  assert.ok(url.indexOf("google.navigation:") === -1, url);
}

assert.strictEqual(dir.isUsableAddress(clark), true);
var clarkUrl = dir.appleMapsDirectionsUrl(clark);
assert.strictEqual(
  clarkUrl,
  "https://maps.apple.com/?daddr=" + encodeURIComponent(clark) + "&dirflg=d"
);
assertAppleNavigation(clarkUrl, "clark");
assert.strictEqual(dir.mapsPlatform(IPHONE), "ios");
assert.strictEqual(dir.mapsPlatform(IPAD), "ios");
assert.strictEqual(dir.mapsPlatform(CRIOS), "ios");
assert.strictEqual(dir.mapsPlatform(ANDROID), "android");
assert.strictEqual(dir.mapsPlatform(ANDROID_TABLET), "android");
assert.strictEqual(dir.mapsPlatform(DESKTOP), "desktop");
assert.strictEqual(dir.mapsPlatform(IPAD_DESKTOP_MODE), "desktop");
assertAppleNavigation(dir.navigationUrl(clark, IPHONE), "iphone");
assertAppleNavigation(dir.navigationUrl(clark, IPAD), "ipad");
assertAppleNavigation(dir.navigationUrl(clark, CRIOS), "crios");
assertAppleNavigation(dir.navigationUrl(clark, DESKTOP), "desktop");
assertAppleNavigation(dir.navigationUrl(clark, IPAD_DESKTOP_MODE), "ipad desktop mode");
assertAppleNavigation(dir.navigationUrl(clark), "default desktop");
assertGoogleNavigation(dir.navigationUrl(clark, ANDROID), "android");
assertGoogleNavigation(dir.navigationUrl(clark, ANDROID_TABLET), "android tablet");
assert.ok(dir.navigationUrl(clark, IPHONE).indexOf("google.com") === -1);
assert.ok(dir.navigationUrl(clark, ANDROID).indexOf("maps.apple.com") === -1);
assert.strictEqual(dir.prefersGoogleMaps(ANDROID), true);
assert.strictEqual(dir.prefersGoogleMaps(IPHONE), false);
assert.strictEqual(dir.prefersGoogleMaps(DESKTOP), false);

assert.strictEqual(dir.appleMapsDirectionsUrl("  " + clark + "  "), clarkUrl);
assert.strictEqual(
  dir.navigationUrl("123 Main St & Oak, Chicago", DESKTOP),
  "https://maps.apple.com/?daddr=" +
    encodeURIComponent("123 Main St & Oak, Chicago") +
    "&dirflg=d"
);
assert.ok(dir.navigationUrl("123 Main St & Oak, Chicago", ANDROID).indexOf("%26") !== -1);
assert.ok(dir.navigationUrl("123 Main St & Oak, Chicago", ANDROID).indexOf("&dir_action=navigate") !== -1);

[
  "",
  "   ",
  null,
  undefined,
  "N/A",
  "n/a",
  "TBD",
  "By appointment",
  "Mobile van",
  "online",
  "Lincoln Park",
  "Chicago, IL",
  "Chicago, IL 60614",
  "60614",
  "Suite 200",
  "9 Oak",
].forEach(function (bad) {
  assert.strictEqual(dir.isUsableAddress(bad), false, "unusable: " + bad);
  assert.strictEqual(dir.appleMapsDirectionsUrl(bad), "", "no href: " + bad);
  assert.strictEqual(dir.navigationUrl(bad, IPHONE), "", "ios hidden: " + bad);
  assert.strictEqual(dir.navigationUrl(bad, ANDROID), "", "android hidden: " + bad);
  assert.strictEqual(dir.navigationUrl(bad, DESKTOP), "", "desktop hidden: " + bad);
});

assert.strictEqual(dir.isUsableAddress("9 Oak Street"), true);
assert.strictEqual(dir.directionsHrefForListing(null), "");
assert.strictEqual(dir.directionsHrefForListing({}), "");
assert.strictEqual(dir.directionsHrefForListing({ address: "By appointment" }), "");
assert.strictEqual(
  dir.directionsHrefForListing({ name: "Clark Street Café", address: clark }),
  clarkUrl
);

var withLink = [];
var withoutLink = [];
listings.forEach(function (item) {
  var href = dir.directionsHrefForListing(item);
  if (href) {
    withLink.push(item.name);
    assertAppleNavigation(href, item.name);
    assertGoogleNavigation(dir.directionsHrefForListing(item, ANDROID), item.name);
    assert.strictEqual(dir.isUsableAddress(item.address), true, item.name);
  } else {
    withoutLink.push(item.name);
    assert.strictEqual(dir.isUsableAddress(item.address), false, item.name);
  }
});

assert.ok(withLink.indexOf("Clark Street Café") !== -1);
assert.ok(withLink.indexOf("Hyde Park Family Medicine — Dr. Maya Chen") !== -1);
assert.ok(withLink.indexOf("Milwaukee Ave Grill") !== -1);
assert.ok(withoutLink.indexOf("Devon Spark Electric") !== -1);
assert.ok(withoutLink.indexOf("Halsted House Cleaners") !== -1);
assert.ok(withoutLink.indexOf("Edgewater Handyman Pros") !== -1);
assert.ok(withoutLink.indexOf("South Shore Pet Spa") !== -1);
assert.strictEqual(withLink.length, 27, withLink.join(", "));
assert.strictEqual(withoutLink.length, 14, withoutLink.join(", "));

console.log("pages-directions.test.js ok (" + withLink.length + " directions, " + withoutLink.length + " hidden)");
