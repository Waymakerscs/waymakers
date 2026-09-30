/**
 * Provider hire gate — local staff checklist, no documents.
 * Run: node js/provider-verification.test.js
 */
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

function memoryStorage() {
  var bag = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null;
    },
    setItem: function (key, value) {
      bag[key] = String(value);
    },
    dump: function () {
      return bag;
    },
  };
}

var store = memoryStorage();
global.localStorage = store;
require("./provider-verification.js");
var gate = global.WaymakersProviderVerification;

assert.ok(gate, "WaymakersProviderVerification is exported");
assert.strictEqual(gate.STORAGE_KEY, "waymakers.provider.verification.v1");

var src = fs.readFileSync(path.join(__dirname, "provider-verification.js"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src), "no network fetch");
assert.ok(!/\bXMLHttpRequest\b/.test(src), "no XHR");
assert.ok(!/\bFormData\b/.test(src), "no upload body");
assert.ok(!/indexedDB/.test(src), "does not store documents in IndexedDB");
assert.ok(!/type\s*=\s*["']file["']/.test(src), "no file input");
assert.ok(!/data:image/.test(src), "no image payload");

var authSrc = fs.readFileSync(path.join(__dirname, "well-auth.js"), "utf8");
assert.ok(/hasLocalPassword/.test(authSrc), "provider sign-in consults a local password");
assert.ok(/isCleared/.test(authSrc), "provider sign-in consults the staff checklist");
assert.ok(
  /A username and password do not open the Provider portal/.test(authSrc),
  "blocked copy is on the provider sign-in"
);
assert.ok(/postAuth\(/.test(authSrc), "server password step remains");
assert.ok(/function unlock\(/.test(authSrc));

function main() {
  return gate.createApplicant("NewProvider", "local-demo-pass").then(function (created) {
    assert.strictEqual(created.ok, true);
    assert.strictEqual(created.user, "newprovider");
    assert.strictEqual(created.cleared, false);
    assert.strictEqual(gate.isCleared("newprovider"), false);
    assert.strictEqual(gate.hasLocalPassword("newprovider"), true);
    assert.strictEqual(gate.isCleared("someone-else"), false);

    var raw = store.dump()[gate.STORAGE_KEY];
    assert.ok(raw.indexOf("local-demo-pass") < 0, "password is not stored");
    assert.ok(raw.indexOf("passwordHash") >= 0, "only a hash is stored");
    assert.ok(!/driversLicenseImage|licensureImage|imageData|data:image/.test(raw));

    var pub = gate.get("newprovider");
    assert.strictEqual(pub.driversLicenseReviewed, false);
    assert.strictEqual(pub.licensureReviewed, false);
    assert.strictEqual(pub.hired, false);
    assert.strictEqual(pub.hasPassword, true);
    assert.strictEqual(pub.passwordHash, undefined);

    return gate.passwordMatches("newprovider", "local-demo-pass");
  }).then(function (match) {
    assert.strictEqual(match, true);
    return gate.passwordMatches("newprovider", "wrong-pass");
  }).then(function (miss) {
    assert.strictEqual(miss, false);
    return gate.passwordMatches("@NewProvider", "local-demo-pass");
  }).then(function (alias) {
    assert.strictEqual(alias, true);

    var partial = gate.setStaffChecks("newprovider", {
      driversLicenseReviewed: true,
      licensureReviewed: true,
      hired: false,
    });
    assert.strictEqual(partial.ok, true);
    assert.strictEqual(partial.cleared, false);
    assert.strictEqual(gate.isCleared("newprovider"), false);

    var hired = gate.setStaffChecks("newprovider", {
      driversLicenseReviewed: true,
      licensureReviewed: true,
      hired: true,
    });
    assert.strictEqual(hired.ok, true);
    assert.strictEqual(hired.cleared, true);
    assert.strictEqual(gate.isCleared("newprovider"), true);

    return gate.createApplicant("newprovider", "another-pass");
  }).then(function (again) {
    assert.strictEqual(again.ok, true);
    assert.strictEqual(gate.isCleared("newprovider"), false, "a new username and password closes access");
    return gate.passwordMatches("newprovider", "another-pass");
  }).then(function (nextPass) {
    assert.strictEqual(nextPass, true);
    return gate.passwordMatches("newprovider", "local-demo-pass");
  }).then(function (oldPass) {
    assert.strictEqual(oldPass, false);

    var staffOnly = gate.setStaffChecks("allowlisted", {
      driversLicenseReviewed: true,
      licensureReviewed: true,
      hired: true,
    });
    assert.strictEqual(staffOnly.ok, true);
    assert.strictEqual(staffOnly.cleared, true);
    assert.strictEqual(gate.hasLocalPassword("allowlisted"), false);

    return gate.createApplicant("x", "secret");
  }).then(function (badName) {
    assert.strictEqual(badName.ok, false);
    assert.strictEqual(gate.hasLocalPassword("x"), false);
    console.log("provider-verification.test.js ok");
  });
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
