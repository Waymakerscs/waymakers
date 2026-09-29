/**
 * Run: node functions/api/well-auth.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { handleWellAuth } from "./well-auth.js";

const PATIENT_PASSWORD = "unit-test-patient-secret";
const PROVIDER_PASSWORD = "unit-test-provider-secret";
const LEGACY_PASSWORD = "unit-test-legacy-shared-secret";
const HMAC_SECRET = "unit-test-well-hmac";

const ENV = {
  WELL_AUTH_PATIENT_USERS: "well-alexa, alexa",
  WELL_AUTH_PATIENT_PASSWORD: PATIENT_PASSWORD,
  WELL_AUTH_PROVIDER_USERS: "alexa, well-provider",
  WELL_AUTH_PROVIDER_PASSWORD: PROVIDER_PASSWORD,
  WELL_AUTH_SECRET: HMAC_SECRET,
};

const ENV_NO_SECRET = {
  WELL_AUTH_PATIENT_USERS: "alexa",
  WELL_AUTH_PATIENT_PASSWORD: PATIENT_PASSWORD,
  WELL_AUTH_PROVIDER_USERS: "alexa",
  WELL_AUTH_PROVIDER_PASSWORD: PROVIDER_PASSWORD,
};

const LEGACY = {
  WELL_AUTH_USERS: "alexa, well-alexa",
  WELL_AUTH_PASSWORD: LEGACY_PASSWORD,
};

function post(body) {
  return new Request("https://waymakers.pages.dev/api/well-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function read(res) {
  return { status: res.status, body: await res.json() };
}

let now = 1_700_000_000_000;
const clock = () => now;

const missingSide = await read(
  await handleWellAuth(
    post({ step: "credentials", username: "alexa", password: PATIENT_PASSWORD }),
    ENV,
    { now: clock }
  )
);
assert.equal(missingSide.status, 400);
assert.equal(missingSide.body.error, "Choose Patient or Provider before signing in.");
assert.equal(missingSide.body.code, undefined);

const missingOtpSide = await read(
  await handleWellAuth(
    post({ step: "otp", username: "alexa", code: "123456", challenge: "a.b" }),
    ENV,
    { now: clock }
  )
);
assert.equal(missingOtpSide.status, 400);
assert.equal(missingOtpSide.body.ok, false);

const badSide = await read(
  await handleWellAuth(
    post({ step: "credentials", side: "both", username: "alexa", password: PATIENT_PASSWORD }),
    ENV,
    { now: clock }
  )
);
assert.equal(badSide.status, 400);

const conflict = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      side: "patient",
      role: "provider",
      username: "alexa",
      password: PATIENT_PASSWORD,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(conflict.status, 400);
assert.equal(conflict.body.error, "Choose Patient or Provider before signing in.");

const legacyOnly = await read(
  await handleWellAuth(
    post({ step: "credentials", side: "patient", username: "alexa", password: LEGACY_PASSWORD }),
    LEGACY,
    { now: clock }
  )
);
assert.equal(legacyOnly.status, 503);
assert.equal(legacyOnly.body.error, "WELL sign-in is not configured for this side.");
assert.equal(legacyOnly.body.side, "patient");
assert.equal(JSON.stringify(legacyOnly.body).includes(LEGACY_PASSWORD), false);

const legacyProvider = await read(
  await handleWellAuth(
    post({ step: "credentials", role: "provider", username: "alexa", password: LEGACY_PASSWORD }),
    LEGACY,
    { now: clock }
  )
);
assert.equal(legacyProvider.status, 503);
assert.equal(legacyProvider.body.side, "provider");

const legacyPlusNew = await read(
  await handleWellAuth(
    post({ step: "credentials", side: "patient", username: "alexa", password: LEGACY_PASSWORD }),
    Object.assign({}, ENV, LEGACY),
    { now: clock }
  )
);
assert.equal(legacyPlusNew.status, 401);
assert.equal(legacyPlusNew.body.code, undefined);

const unconfiguredProvider = await read(
  await handleWellAuth(
    post({ step: "credentials", side: "provider", username: "alexa", password: PROVIDER_PASSWORD }),
    {
      WELL_AUTH_PATIENT_USERS: "alexa",
      WELL_AUTH_PATIENT_PASSWORD: PATIENT_PASSWORD,
    },
    { now: clock }
  )
);
assert.equal(unconfiguredProvider.status, 503);
assert.equal(unconfiguredProvider.body.error, "WELL sign-in is not configured for this side.");

const wrong = await read(
  await handleWellAuth(
    post({ step: "credentials", side: "patient", username: "alexa", password: "nope" }),
    ENV,
    { now: clock }
  )
);
assert.equal(wrong.status, 401);
assert.equal(wrong.body.code, undefined);
assert.equal(JSON.stringify(wrong.body).includes(PATIENT_PASSWORD), false);
assert.equal(JSON.stringify(wrong.body).includes(PROVIDER_PASSWORD), false);

const unknown = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      side: "patient",
      username: "someone-else",
      password: PATIENT_PASSWORD,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(unknown.status, 401);

const crossPassword = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      side: "provider",
      username: "alexa",
      password: PATIENT_PASSWORD,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(crossPassword.status, 401);
assert.equal(crossPassword.body.code, undefined);
assert.equal(crossPassword.body.ok, false);

const patientOnProviderListOnly = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      side: "patient",
      username: "well-provider",
      password: PROVIDER_PASSWORD,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(patientOnProviderListOnly.status, 401);

const ok = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      side: "patient",
      username: "@Alexa",
      password: PATIENT_PASSWORD,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(ok.status, 200);
assert.equal(ok.body.user, "alexa");
assert.equal(ok.body.side, "patient");
assert.match(ok.body.code, /^\d{6}$/);
assert.equal(typeof ok.body.challenge, "string");
assert.equal(JSON.stringify(ok.body).includes(PATIENT_PASSWORD), false);
assert.equal(JSON.stringify(ok.body).includes(PROVIDER_PASSWORD), false);
assert.equal(JSON.stringify(ok.body).includes(HMAC_SECRET), false);

const providerOk = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      role: "provider",
      username: "Alexa",
      password: PROVIDER_PASSWORD,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(providerOk.status, 200);
assert.equal(providerOk.body.user, "alexa");
assert.equal(providerOk.body.side, "provider");
assert.notEqual(providerOk.body.challenge, ok.body.challenge);
assert.notEqual(providerOk.body.code, ok.body.code);

const badCode = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "patient",
      username: "alexa",
      code: "000000",
      challenge: ok.body.challenge,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(badCode.status, 401);
assert.equal(badCode.body.restart, undefined);
assert.equal(badCode.body.error, "Wrong verification code.");

const crossTicket = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "provider",
      username: "alexa",
      code: ok.body.code,
      challenge: ok.body.challenge,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(crossTicket.status, 401);
assert.equal(crossTicket.body.ok, false);
assert.equal(crossTicket.body.restart, true);
assert.equal(crossTicket.body.user, undefined);
assert.match(crossTicket.body.error, /other WELL portal/);

const crossOtherWay = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "patient",
      username: "alexa",
      code: providerOk.body.code,
      challenge: providerOk.body.challenge,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(crossOtherWay.status, 401);
assert.equal(crossOtherWay.body.restart, true);
assert.match(crossOtherWay.body.error, /other WELL portal/);

const stillPatient = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "patient",
      username: "alexa",
      code: ok.body.code,
      challenge: ok.body.challenge,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(stillPatient.status, 200);
assert.equal(stillPatient.body.ok, true);
assert.equal(stillPatient.body.user, "alexa");
assert.equal(stillPatient.body.side, "patient");
assert.equal(stillPatient.body.code, undefined);

const unlockedProvider = await read(
  await handleWellAuth(
    post({
      step: "otp",
      role: "provider",
      username: "alexa",
      code: providerOk.body.code,
      challenge: providerOk.body.challenge,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(unlockedProvider.status, 200);
assert.equal(unlockedProvider.body.side, "provider");
assert.equal(unlockedProvider.body.user, "alexa");

const swapped = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "patient",
      username: "well-alexa",
      code: ok.body.code,
      challenge: ok.body.challenge,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(swapped.status, 401);
assert.equal(swapped.body.restart, true);

const tampered = ok.body.challenge.slice(0, -4) + "aaaa";
const forged = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "patient",
      username: "alexa",
      code: ok.body.code,
      challenge: tampered,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(forged.status, 401);
assert.equal(forged.body.restart, true);

const wrongSecret = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "provider",
      username: "alexa",
      code: providerOk.body.code,
      challenge: providerOk.body.challenge,
    }),
    Object.assign({}, ENV, { WELL_AUTH_SECRET: "unit-test-other-hmac" }),
    { now: clock }
  )
);
assert.equal(wrongSecret.status, 401);
assert.equal(wrongSecret.body.restart, true);

now += 6 * 60 * 1000;
const expired = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "patient",
      username: "alexa",
      code: ok.body.code,
      challenge: ok.body.challenge,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(expired.status, 401);
assert.equal(expired.body.restart, true);

const other = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      side: "patient",
      username: "well-alexa",
      password: PATIENT_PASSWORD,
    }),
    ENV,
    { now: clock }
  )
);
assert.equal(other.status, 200);
assert.equal(other.body.user, "well-alexa");
assert.equal(other.body.side, "patient");

const fallbackIssue = await read(
  await handleWellAuth(
    post({
      step: "credentials",
      side: "provider",
      username: "alexa",
      password: PROVIDER_PASSWORD,
    }),
    ENV_NO_SECRET,
    { now: clock }
  )
);
assert.equal(fallbackIssue.status, 200);
assert.equal(fallbackIssue.body.side, "provider");
const fallbackUnlock = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "provider",
      username: "alexa",
      code: fallbackIssue.body.code,
      challenge: fallbackIssue.body.challenge,
    }),
    ENV_NO_SECRET,
    { now: clock }
  )
);
assert.equal(fallbackUnlock.status, 200);
assert.equal(fallbackUnlock.body.side, "provider");
const fallbackCross = await read(
  await handleWellAuth(
    post({
      step: "otp",
      side: "patient",
      username: "alexa",
      code: fallbackIssue.body.code,
      challenge: fallbackIssue.body.challenge,
    }),
    ENV_NO_SECRET,
    { now: clock }
  )
);
assert.equal(fallbackCross.status, 401);
assert.equal(fallbackCross.body.restart, true);

function loadClient(initial) {
  const store = new Map();
  const sessionStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
  if (initial) {
    for (const [key, value] of Object.entries(initial)) sessionStorage.setItem(key, value);
  }
  const attrs = {
    "data-well-app": "",
    "data-well-side": "patient",
    "data-well-auth-state": "locked",
  };
  const classNames = new Set(["is-locked"]);
  const root = {
    attrs,
    classList: {
      toggle(name, force) {
        if (force === true) classNames.add(name);
        else if (force === false) classNames.delete(name);
        else if (classNames.has(name)) classNames.delete(name);
        else classNames.add(name);
        return classNames.has(name);
      },
      add(name) {
        classNames.add(name);
      },
      remove(name) {
        classNames.delete(name);
      },
      contains(name) {
        return classNames.has(name);
      },
    },
    setAttribute(name, value) {
      attrs[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    removeAttribute(name) {
      delete attrs[name];
    },
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const listeners = {};
  const document = {
    readyState: "complete",
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener() {},
    dispatchEvent(ev) {
      (listeners[ev.type] || []).forEach((fn) => fn(ev));
      return true;
    },
    querySelector(sel) {
      if (sel === "[data-well-app]") return root;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === "[data-well-app]") return [root];
      return [];
    },
  };
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    JSON,
    Math,
    String,
    Number,
    Object,
    Array,
    Error,
    Promise,
    RegExp,
    parseInt,
    document,
    sessionStorage,
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    },
    fetch() {
      return Promise.reject(new Error("no network in unit test"));
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(clientSource, sandbox, { filename: "js/well-auth.js" });
  return { auth: sandbox.CognationWellAuth, sessionStorage, root };
}

function session(side, user) {
  return JSON.stringify({
    ok: true,
    user: user || "alexa",
    side,
    at: Date.now(),
    factor: "password+otp",
  });
}

const client = readFileSync(new URL("../../js/well-auth.js", import.meta.url), "utf8");
const clientSource = client;
const page = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const fn = readFileSync(new URL("./well-auth.js", import.meta.url), "utf8");
const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
const fnReadme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const sourceOfTruth = readFileSync(new URL("../../SOURCE-OF-TRUTH.md", import.meta.url), "utf8");

const purged = loadClient({
  "cognation.well.auth.v1": JSON.stringify({ ok: true, at: Date.now(), user: "alexa" }),
});
assert.equal(purged.sessionStorage.getItem("cognation.well.auth.v1"), null);
assert.equal(purged.auth.isAuthenticated("patient"), false);
assert.equal(purged.auth.isAuthenticated("provider"), false);

const isolated = loadClient();
isolated.sessionStorage.setItem("cognation.well.auth.patient.v1", session("patient"));
assert.equal(isolated.auth.isAuthenticated("patient"), true);
assert.equal(isolated.auth.isAuthenticated("provider"), false);
assert.equal(isolated.auth.getSession("provider"), null);
assert.equal(isolated.auth.getSession("patient").side, "patient");

isolated.sessionStorage.setItem("cognation.well.auth.provider.v1", session("patient"));
assert.equal(isolated.auth.isAuthenticated("provider"), false);
assert.equal(isolated.sessionStorage.getItem("cognation.well.auth.provider.v1"), null);
assert.equal(isolated.auth.isAuthenticated("patient"), true);

isolated.sessionStorage.setItem("cognation.well.auth.provider.v1", session("provider"));
assert.equal(isolated.auth.isAuthenticated("provider"), true);
isolated.root.setAttribute("data-well-side", "provider");
assert.equal(isolated.auth.isAuthenticated(), true);
isolated.root.setAttribute("data-well-side", "patient");
assert.equal(isolated.auth.isAuthenticated(), true);

assert.equal(isolated.auth.lockSide("patient"), true);
assert.equal(isolated.auth.isAuthenticated("patient"), false);
assert.equal(isolated.auth.isAuthenticated("provider"), true);
assert.equal(isolated.sessionStorage.getItem("cognation.well.auth.patient.v1"), null);
assert.equal(isolated.auth.getSession("provider").side, "provider");

isolated.auth.lock();
assert.equal(isolated.auth.isAuthenticated("patient"), false);
assert.equal(isolated.auth.isAuthenticated("provider"), false);
assert.equal(isolated.auth.lockSide("both"), false);

isolated.sessionStorage.setItem(
  "cognation.well.auth.v1",
  JSON.stringify({ ok: true, at: Date.now(), user: "alexa", side: "patient" })
);
assert.equal(isolated.auth.isAuthenticated("patient"), false);
assert.equal(isolated.auth.isAuthenticated("provider"), false);

for (const src of [client, page, fn]) {
  assert.equal(src.includes("WellLock26"), false);
  assert.equal(src.includes("246801"), false);
  assert.equal(src.includes(PATIENT_PASSWORD), false);
  assert.equal(src.includes(PROVIDER_PASSWORD), false);
  assert.equal(src.includes(LEGACY_PASSWORD), false);
  assert.equal(src.includes(HMAC_SECRET), false);
  assert.equal(src.includes("clinical sign-in is not live"), false);
}
assert.equal(client.includes("waymakers.demo.unlock"), false);
assert.match(client, /cognation\.well\.auth\.patient\.v1/);
assert.match(client, /cognation\.well\.auth\.provider\.v1/);
assert.match(client, /removeItem\(LEGACY_AUTH_KEY\)/);
assert.match(client, /side: side/);
assert.match(client, /lockSides\(root, \[side\]/);
assert.equal(/Patient and Provider stay locked until/.test(client), false);
assert.equal(/both stay behind this lock/.test(fn), false);
assert.equal(fn.includes("env.WELL_AUTH_USERS"), false);
assert.equal(fn.includes("env.WELL_AUTH_PASSWORD"), false);
assert.match(fn, /WELL_AUTH_PATIENT_USERS/);
assert.match(fn, /WELL_AUTH_PATIENT_PASSWORD/);
assert.match(fn, /WELL_AUTH_PROVIDER_USERS/);
assert.match(fn, /WELL_AUTH_PROVIDER_PASSWORD/);
assert.match(fn, /WELL_AUTH_SECRET/);
assert.match(fn, /ticket\.s !== side/);
assert.match(page, /data-well-auth-form="credentials"/);
assert.match(page, /data-well-auth-side="patient"/);
assert.match(page, /data-well-auth-side="provider"/);
assert.match(page, /Unlocking one side does not open the other/);
assert.match(page, /your own doctor appointments/);
assert.match(page, /Work hours on the Provider side stay locked/);
assert.match(client, /Your own doctor appointments\. This opens the Patient portal only/);
assert.match(client, /Work hours for the staff schedule\. This opens the Provider portal only/);
assert.match(client, /Your own doctor appointments stay locked until you sign in on the Patient side/);
assert.equal(/Patient and Provider stay locked until/.test(page), false);
assert.equal(/Second authentication lock/.test(page), false);
for (const doc of [readme, fnReadme, sourceOfTruth]) {
  assert.match(doc, /WELL_AUTH_PATIENT_USERS/);
  assert.match(doc, /WELL_AUTH_PATIENT_PASSWORD/);
  assert.match(doc, /WELL_AUTH_PROVIDER_USERS/);
  assert.match(doc, /WELL_AUTH_PROVIDER_PASSWORD/);
  assert.match(doc, /WELL_AUTH_SECRET/);
  assert.match(doc, /not configured for this side/);
}
assert.match(readme, /Opaque pills say Busy/);
assert.match(readme, /not a staff short name/);

console.log("well-auth tests passed");
