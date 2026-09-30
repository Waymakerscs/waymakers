/**
 * Provider portal hire gate — browser-local demo.
 *
 * Creating a username and password does not open the Provider portal.
 * Waymakers staff record three checks in this browser only:
 *   driver's license reviewed, licensure reviewed, hired by Waymakers.
 * All three must be true before a self-created provider can sign in.
 *
 * No driver's license image, licensure image, or other identity document
 * is stored. The password is kept only as a hash. Nothing is uploaded.
 * Patient sign-in does not use this record.
 *
 * Storage key: waymakers.provider.verification.v1 (localStorage).
 */
(function (root) {
  "use strict";

  var STORAGE_KEY = "waymakers.provider.verification.v1";
  var HASH_LABEL = "waymakers.provider.verification.v1";

  function storage() {
    try {
      if (root.localStorage) return root.localStorage;
    } catch (e) {}
    return null;
  }

  function normalizeUser(raw) {
    var u = String(raw || "").trim().toLowerCase();
    if (u.charAt(0) === "@") u = u.slice(1);
    return u;
  }

  function validUsername(user) {
    return /^[a-z0-9._-]{3,40}$/.test(user);
  }

  function emptyDoc() {
    return { version: 1, applicants: {} };
  }

  function readDoc() {
    var store = storage();
    if (!store) return emptyDoc();
    try {
      var raw = store.getItem(STORAGE_KEY);
      if (!raw) return emptyDoc();
      var doc = JSON.parse(raw);
      if (!doc || typeof doc !== "object" || !doc.applicants || typeof doc.applicants !== "object") {
        return emptyDoc();
      }
      return doc;
    } catch (e) {
      return emptyDoc();
    }
  }

  function writeDoc(doc) {
    var store = storage();
    if (!store) return false;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(doc));
      return true;
    } catch (e) {
      return false;
    }
  }

  function bytesToHex(bytes) {
    var hex = "";
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i].toString(16);
      hex += b.length === 1 ? "0" + b : b;
    }
    return hex;
  }

  function hashPassword(username, password) {
    var subtle = root.crypto && root.crypto.subtle;
    if (!subtle || !root.TextEncoder) {
      return Promise.reject(new Error("hash-unavailable"));
    }
    var material = HASH_LABEL + "\n" + username + "\n" + String(password);
    return subtle
      .digest("SHA-256", new root.TextEncoder().encode(material))
      .then(function (buf) {
        return bytesToHex(new Uint8Array(buf));
      });
  }

  function recordOf(username) {
    var user = normalizeUser(username);
    if (!user) return null;
    var doc = readDoc();
    var rec = doc.applicants[user];
    if (!rec || typeof rec !== "object") return null;
    return rec;
  }

  function publicRecord(rec) {
    if (!rec) return null;
    return {
      username: rec.username,
      driversLicenseReviewed: !!rec.driversLicenseReviewed,
      licensureReviewed: !!rec.licensureReviewed,
      hired: !!rec.hired,
      hasPassword: !!rec.passwordHash,
    };
  }

  function isCleared(username) {
    var rec = recordOf(username);
    return !!(
      rec &&
      rec.driversLicenseReviewed === true &&
      rec.licensureReviewed === true &&
      rec.hired === true
    );
  }

  function hasLocalPassword(username) {
    var rec = recordOf(username);
    return !!(rec && rec.passwordHash);
  }

  function createApplicant(username, password) {
    var user = normalizeUser(username);
    var pass = String(password == null ? "" : password);
    if (!validUsername(user)) {
      return Promise.resolve({
        ok: false,
        error: "Use a 3–40 character username (letters, numbers, dot, _ or -).",
      });
    }
    if (!pass || pass.length > 256) {
      return Promise.resolve({
        ok: false,
        error: "Enter a password. A username and password do not open the Provider portal.",
      });
    }
    return hashPassword(user, pass)
      .then(function (passwordHash) {
        var doc = readDoc();
        doc.applicants[user] = {
          username: user,
          passwordHash: passwordHash,
          driversLicenseReviewed: false,
          licensureReviewed: false,
          hired: false,
          createdAt: Date.now(),
        };
        if (!writeDoc(doc)) {
          return {
            ok: false,
            error: "This browser could not save the username. Nothing was sent.",
          };
        }
        return { ok: true, user: user, cleared: false };
      })
      .catch(function () {
        return {
          ok: false,
          error: "This browser could not save the username. Nothing was sent.",
        };
      });
  }

  function passwordMatches(username, password) {
    var user = normalizeUser(username);
    var rec = recordOf(user);
    if (!rec || !rec.passwordHash) return Promise.resolve(false);
    return hashPassword(user, String(password == null ? "" : password))
      .then(function (passwordHash) {
        var current = recordOf(user);
        if (!current || !current.passwordHash) return false;
        if (current.passwordHash.length !== passwordHash.length) return false;
        var diff = 0;
        for (var i = 0; i < passwordHash.length; i++) {
          diff |= current.passwordHash.charCodeAt(i) ^ passwordHash.charCodeAt(i);
        }
        return diff === 0;
      })
      .catch(function () {
        return false;
      });
  }

  function setStaffChecks(username, flags) {
    var user = normalizeUser(username);
    flags = flags || {};
    if (!validUsername(user)) {
      return { ok: false, error: "Enter the provider username to verify." };
    }
    var doc = readDoc();
    var rec = doc.applicants[user];
    if (!rec || typeof rec !== "object") {
      rec = {
        username: user,
        passwordHash: "",
        driversLicenseReviewed: false,
        licensureReviewed: false,
        hired: false,
        createdAt: Date.now(),
      };
    }
    rec.driversLicenseReviewed = !!flags.driversLicenseReviewed;
    rec.licensureReviewed = !!flags.licensureReviewed;
    rec.hired = !!flags.hired;
    rec.reviewedAt = Date.now();
    doc.applicants[user] = rec;
    if (!writeDoc(doc)) {
      return {
        ok: false,
        error: "This browser could not save staff verification. Nothing was sent.",
      };
    }
    return { ok: true, user: user, cleared: isCleared(user), record: publicRecord(rec) };
  }

  root.WaymakersProviderVerification = {
    STORAGE_KEY: STORAGE_KEY,
    normalizeUser: normalizeUser,
    get: function (username) {
      return publicRecord(recordOf(username));
    },
    isCleared: isCleared,
    hasLocalPassword: hasLocalPassword,
    createApplicant: createApplicant,
    passwordMatches: passwordMatches,
    setStaffChecks: setStaffChecks,
  };
})(typeof window !== "undefined" ? window : global);
