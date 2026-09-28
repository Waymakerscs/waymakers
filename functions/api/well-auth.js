/**
 * POST /api/well-auth
 *
 * Second lock for WELL, separate from WAYMAKERS site sign-in.
 * Patient and Provider both stay behind this lock; it is not two passwords.
 *
 * Env (Cloudflare Pages → Settings → Environment variables). Never commit these:
 *   WELL_AUTH_USERS     comma-separated WELL usernames (example: well-alexa,alexa)
 *   WELL_AUTH_PASSWORD  WELL password checked on the server
 *   WELL_AUTH_SECRET    optional HMAC key for the one-time code; defaults to the password
 *
 * Step "credentials": username + password. On success the response includes a
 * one-time 6-digit code and a signed challenge. The code is created per attempt.
 * It is not a fixed value in the repository.
 * Step "otp": username + code + challenge. On success the browser may open the chart.
 */

var OTP_TTL_MS = 5 * 60 * 1000;
var MAX_BODY = 4096;

function noStoreHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: noStoreHeaders(),
  });
}

function normalizeUser(raw) {
  var u = String(raw || "").trim().toLowerCase();
  if (u.charAt(0) === "@") u = u.slice(1);
  return u;
}

function allowedUsers(env) {
  return String((env && env.WELL_AUTH_USERS) || "")
    .split(",")
    .map(function (part) {
      return normalizeUser(part);
    })
    .filter(Boolean)
    .slice(0, 32);
}

function configured(env) {
  return allowedUsers(env).length > 0 && String((env && env.WELL_AUTH_PASSWORD) || "").length > 0;
}

function authSecret(env) {
  var secret = String((env && env.WELL_AUTH_SECRET) || "");
  if (secret) return secret;
  return String((env && env.WELL_AUTH_PASSWORD) || "");
}

function bytesToB64Url(bytes) {
  var bin = "";
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(str) {
  var pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  var b64 = String(str || "").replace(/-/g, "+").replace(/_/g, "/") + pad;
  var bin = atob(b64);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256(text) {
  var digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return new Uint8Array(digest);
}

async function sameSecret(left, right) {
  var a = await sha256(left);
  var b = await sha256(right);
  return timingSafeEqual(a, b);
}

async function hmac(secret, message) {
  var key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  var sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function randomCode() {
  var buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

async function issueChallenge(env, username, code, exp) {
  var payload = JSON.stringify({ u: username, c: code, exp: exp });
  var sig = await hmac(authSecret(env), payload);
  var body = bytesToB64Url(new TextEncoder().encode(payload));
  return body + "." + bytesToB64Url(sig);
}

async function readChallenge(env, challenge) {
  var parts = String(challenge || "").split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  var payload;
  var provided;
  try {
    payload = new TextDecoder().decode(b64UrlToBytes(parts[0]));
    provided = b64UrlToBytes(parts[1]);
  } catch (e) {
    return null;
  }
  var expected = await hmac(authSecret(env), payload);
  if (!timingSafeEqual(provided, expected)) return null;
  try {
    var data = JSON.parse(payload);
    if (!data || typeof data.u !== "string" || typeof data.c !== "string" || typeof data.exp !== "number") {
      return null;
    }
    return data;
  } catch (e2) {
    return null;
  }
}

async function handleCredentials(env, body, now) {
  if (!configured(env)) {
    return json(503, {
      ok: false,
      error: "WELL sign-in is not configured on this host.",
    });
  }
  var user = normalizeUser(body.username);
  var password = String(body.password == null ? "" : body.password);
  var users = allowedUsers(env);
  var userOk = users.indexOf(user) !== -1;
  var passOk = password.length > 0 && password.length <= 256 && (await sameSecret(password, env.WELL_AUTH_PASSWORD));
  if (!userOk || !passOk) {
    return json(401, { ok: false, error: "Wrong WELL username or password." });
  }
  var code = randomCode();
  var exp = now() + OTP_TTL_MS;
  var challenge = await issueChallenge(env, user, code, exp);
  return json(200, {
    ok: true,
    step: "otp",
    user: user,
    code: code,
    challenge: challenge,
    expiresIn: Math.round(OTP_TTL_MS / 1000),
  });
}

async function handleOtp(env, body, now) {
  if (!configured(env)) {
    return json(503, {
      ok: false,
      error: "WELL sign-in is not configured on this host.",
    });
  }
  var user = normalizeUser(body.username);
  var code = String(body.code == null ? "" : body.code).replace(/\s+/g, "");
  var ticket = await readChallenge(env, body.challenge);
  if (!ticket || ticket.exp <= now() || ticket.u !== user) {
    return json(401, {
      ok: false,
      restart: true,
      error: "Verification expired. Enter your WELL password again.",
    });
  }
  if (!/^\d{6}$/.test(code) || !(await sameSecret(code, ticket.c))) {
    return json(401, { ok: false, error: "Wrong verification code." });
  }
  return json(200, { ok: true, user: user });
}

export async function handleWellAuth(request, env, opts) {
  opts = opts || {};
  var now = typeof opts.now === "function" ? opts.now : Date.now;
  if (!request || request.method !== "POST") {
    return json(405, { ok: false, error: "POST a WELL sign-in step." });
  }
  var text;
  try {
    text = await request.text();
  } catch (e) {
    return json(400, { ok: false, error: "WELL sign-in could not be read." });
  }
  if (text.length > MAX_BODY) {
    return json(413, { ok: false, error: "WELL sign-in request is too large." });
  }
  var body;
  try {
    body = JSON.parse(text);
  } catch (e2) {
    return json(400, { ok: false, error: "Enter a WELL username and password." });
  }
  if (!body || typeof body !== "object") {
    return json(400, { ok: false, error: "Enter a WELL username and password." });
  }
  if (body.step === "otp") return handleOtp(env || {}, body, now);
  if (body.step === "credentials" || body.step == null) return handleCredentials(env || {}, body, now);
  return json(400, { ok: false, error: "Unknown WELL sign-in step." });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function onRequestPost(context) {
  return handleWellAuth(context.request, (context && context.env) || {});
}
