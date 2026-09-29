/**
 * POST /api/well-auth
 *
 * Separate second locks for the WELL Patient and Provider portals.
 * Unlocking one side does not open the other. Same username may appear
 * on both allowlists with different passwords.
 *
 * Env (Cloudflare Pages → Settings → Environment variables). Never commit these:
 *   WELL_AUTH_PATIENT_USERS      comma-separated Patient usernames
 *   WELL_AUTH_PATIENT_PASSWORD   Patient password checked on the server
 *   WELL_AUTH_PROVIDER_USERS     comma-separated Provider usernames
 *   WELL_AUTH_PROVIDER_PASSWORD  Provider password checked on the server
 *   WELL_AUTH_SECRET             optional shared HMAC key for challenge tickets
 *
 * Legacy WELL_AUTH_USERS / WELL_AUTH_PASSWORD are not read. A host that still
 * has only those variables fails closed: "WELL sign-in is not configured for
 * this side." The old shared password cannot open either portal.
 *
 * WELL_AUTH_SECRET signs challenge tickets for both sides. If it is unset, the
 * documented fallback key is:
 *   well-auth-v2\n + WELL_AUTH_PATIENT_PASSWORD + \n + WELL_AUTH_PROVIDER_PASSWORD
 * The legacy shared password is not part of that fallback. Tickets embed the
 * side, so a Patient ticket cannot be replayed against Provider (or the reverse)
 * even when both sides share one HMAC key.
 *
 * Body.side or body.role is required on credentials and otp: "patient" | "provider".
 * Step "credentials": username + password for that side. Success returns a
 * one-time 6-digit code and a side-bound challenge. The code is created per
 * attempt. It is not a fixed value in the repository.
 * Step "otp": username + code + challenge for the same side.
 */

var OTP_TTL_MS = 5 * 60 * 1000;
var MAX_BODY = 4096;
var SIDES = { patient: true, provider: true };

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

function normalizeSide(raw) {
  var s = String(raw || "").trim().toLowerCase();
  return SIDES[s] ? s : "";
}

function readSide(body) {
  var hasSide = body.side != null && String(body.side).trim() !== "";
  var hasRole = body.role != null && String(body.role).trim() !== "";
  var side = hasSide ? normalizeSide(body.side) : "";
  var role = hasRole ? normalizeSide(body.role) : "";
  if (hasSide && !side) return "";
  if (hasRole && !role) return "";
  if (side && role && side !== role) return "";
  return side || role;
}

function sidePassword(env, side) {
  if (side === "patient") return String((env && env.WELL_AUTH_PATIENT_PASSWORD) || "");
  if (side === "provider") return String((env && env.WELL_AUTH_PROVIDER_PASSWORD) || "");
  return "";
}

function sideUsersRaw(env, side) {
  if (side === "patient") return String((env && env.WELL_AUTH_PATIENT_USERS) || "");
  if (side === "provider") return String((env && env.WELL_AUTH_PROVIDER_USERS) || "");
  return "";
}

function allowedUsers(env, side) {
  return sideUsersRaw(env, side)
    .split(",")
    .map(function (part) {
      return normalizeUser(part);
    })
    .filter(Boolean)
    .slice(0, 32);
}

function configured(env, side) {
  return !!SIDES[side] && allowedUsers(env, side).length > 0 && sidePassword(env, side).length > 0;
}

function authSecret(env) {
  var secret = String((env && env.WELL_AUTH_SECRET) || "");
  if (secret) return secret;
  return (
    "well-auth-v2\n" +
    sidePassword(env, "patient") +
    "\n" +
    sidePassword(env, "provider")
  );
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

async function issueChallenge(env, username, code, exp, side) {
  var payload = JSON.stringify({ u: username, c: code, exp: exp, s: side });
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
    if (
      !data ||
      typeof data.u !== "string" ||
      typeof data.c !== "string" ||
      typeof data.exp !== "number" ||
      !SIDES[data.s]
    ) {
      return null;
    }
    return data;
  } catch (e2) {
    return null;
  }
}

function notConfigured(side) {
  return json(503, {
    ok: false,
    side: side,
    error: "WELL sign-in is not configured for this side.",
  });
}

function chooseSide() {
  return json(400, {
    ok: false,
    error: "Choose Patient or Provider before signing in.",
  });
}

async function handleCredentials(env, body, now) {
  var side = readSide(body);
  if (!side) return chooseSide();
  if (!configured(env, side)) return notConfigured(side);
  var user = normalizeUser(body.username);
  var password = String(body.password == null ? "" : body.password);
  var users = allowedUsers(env, side);
  var userOk = users.indexOf(user) !== -1;
  var expected = sidePassword(env, side);
  var passOk = password.length > 0 && password.length <= 256 && (await sameSecret(password, expected));
  if (!userOk || !passOk) {
    return json(401, { ok: false, side: side, error: "Wrong WELL username or password." });
  }
  var code = randomCode();
  var exp = now() + OTP_TTL_MS;
  var challenge = await issueChallenge(env, user, code, exp, side);
  return json(200, {
    ok: true,
    step: "otp",
    side: side,
    user: user,
    code: code,
    challenge: challenge,
    expiresIn: Math.round(OTP_TTL_MS / 1000),
  });
}

async function handleOtp(env, body, now) {
  var side = readSide(body);
  if (!side) return chooseSide();
  if (!configured(env, side)) return notConfigured(side);
  var user = normalizeUser(body.username);
  var code = String(body.code == null ? "" : body.code).replace(/\s+/g, "");
  var ticket = await readChallenge(env, body.challenge);
  if (!ticket || ticket.exp <= now() || ticket.u !== user) {
    return json(401, {
      ok: false,
      side: side,
      restart: true,
      error: "Verification expired. Enter your WELL password again.",
    });
  }
  if (ticket.s !== side) {
    return json(401, {
      ok: false,
      side: side,
      restart: true,
      error: "That verification code is for the other WELL portal. Sign in on this side.",
    });
  }
  if (!/^\d{6}$/.test(code) || !(await sameSecret(code, ticket.c))) {
    return json(401, { ok: false, side: side, error: "Wrong verification code." });
  }
  return json(200, { ok: true, side: side, user: user });
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
