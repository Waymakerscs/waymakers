/**
 * Node tests for PAGES → Apple Maps directions.
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
assert.strictEqual(dir.isUsableAddress(clark), true);
var clarkUrl = dir.appleMapsDirectionsUrl(clark);
assert.strictEqual(
  clarkUrl,
  "https://maps.apple.com/?daddr=" + encodeURIComponent(clark)
);
assert.ok(clarkUrl.indexOf("maps://") === -1, "desktop-safe https link");
assert.ok(clarkUrl.indexOf("https://maps.apple.com/?daddr=") === 0);

assert.strictEqual(dir.appleMapsDirectionsUrl("  " + clark + "  "), clarkUrl);
assert.strictEqual(
  dir.appleMapsDirectionsUrl("123 Main St & Oak, Chicago"),
  "https://maps.apple.com/?daddr=" + encodeURIComponent("123 Main St & Oak, Chicago")
);
assert.ok(dir.appleMapsDirectionsUrl("123 Main St & Oak, Chicago").indexOf("&daddr") === -1);
assert.ok(dir.appleMapsDirectionsUrl("123 Main St & Oak, Chicago").indexOf("%26") !== -1);

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
    assert.ok(href.indexOf("https://maps.apple.com/?daddr=") === 0, item.name);
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
