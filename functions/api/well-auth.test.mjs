/**
 * Run: node functions/api/well-auth.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleWellAuth } from "./well-auth.js";

const ENV = {
  WELL_AUTH_USERS: "well-alexa, alexa",
  WELL_AUTH_PASSWORD: "unit-test-well-secret",
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

const missing = await read(
  await handleWellAuth(post({ step: "credentials", username: "alexa", password: "x" }), {}, { now: clock })
);
assert.equal(missing.status, 503);
assert.equal(missing.body.error, "WELL sign-in is not configured on this host.");

const wrong = await read(
  await handleWellAuth(
    post({ step: "credentials", username: "alexa", password: "nope" }),
    ENV,
    { now: clock }
  )
);
assert.equal(wrong.status, 401);
assert.equal(wrong.body.code, undefined);
assert.equal(JSON.stringify(wrong.body).includes("unit-test-well-secret"), false);

const unknown = await read(
  await handleWellAuth(
    post({ step: "credentials", username: "someone-else", password: ENV.WELL_AUTH_PASSWORD }),
    ENV,
    { now: clock }
  )
);
assert.equal(unknown.status, 401);

const ok = await read(
  await handleWellAuth(
    post({ step: "credentials", username: "@Alexa", password: ENV.WELL_AUTH_PASSWORD }),
    ENV,
    { now: clock }
  )
);
assert.equal(ok.status, 200);
assert.equal(ok.body.user, "alexa");
assert.match(ok.body.code, /^\d{6}$/);
assert.equal(typeof ok.body.challenge, "string");
assert.equal(JSON.stringify(ok.body).includes(ENV.WELL_AUTH_PASSWORD), false);

const badCode = await read(
  await handleWellAuth(
    post({ step: "otp", username: "alexa", code: "000000", challenge: ok.body.challenge }),
    ENV,
    { now: clock }
  )
);
assert.equal(badCode.status, 401);
assert.equal(badCode.body.restart, undefined);
assert.equal(badCode.body.error, "Wrong verification code.");

const unlocked = await read(
  await handleWellAuth(
    post({ step: "otp", username: "alexa", code: ok.body.code, challenge: ok.body.challenge }),
    ENV,
    { now: clock }
  )
);
assert.equal(unlocked.status, 200);
assert.equal(unlocked.body.ok, true);
assert.equal(unlocked.body.user, "alexa");
assert.equal(unlocked.body.code, undefined);

const swapped = await read(
  await handleWellAuth(
    post({
      step: "otp",
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
    post({ step: "otp", username: "alexa", code: ok.body.code, challenge: tampered }),
    ENV,
    { now: clock }
  )
);
assert.equal(forged.status, 401);
assert.equal(forged.body.restart, true);

now += 6 * 60 * 1000;
const expired = await read(
  await handleWellAuth(
    post({ step: "otp", username: "alexa", code: ok.body.code, challenge: ok.body.challenge }),
    ENV,
    { now: clock }
  )
);
assert.equal(expired.status, 401);
assert.equal(expired.body.restart, true);

const other = await read(
  await handleWellAuth(
    post({ step: "credentials", username: "well-alexa", password: ENV.WELL_AUTH_PASSWORD }),
    ENV,
    { now: clock }
  )
);
assert.equal(other.status, 200);
assert.equal(other.body.user, "well-alexa");

const client = readFileSync(new URL("../../js/well-auth.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const fn = readFileSync(new URL("./well-auth.js", import.meta.url), "utf8");
for (const src of [client, page, fn]) {
  assert.equal(src.includes("WellLock26"), false);
  assert.equal(src.includes("246801"), false);
  assert.equal(src.includes("unit-test-well-secret"), false);
  assert.equal(src.includes("clinical sign-in is not live"), false);
}
assert.equal(client.includes("waymakers.demo.unlock"), false);
assert.match(page, /data-well-auth-form="credentials"/);
assert.match(page, /Second authentication lock/);

console.log("well-auth tests passed");
