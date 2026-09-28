/**
 * WELL demo step-up gate.
 *
 * Not production auth · not HIPAA · local demo EHR only.
 * PHI must not leave the browser.
 *
 * The chart opens only after sessionStorage waymakers.demo.unlock.v1
 * (?demo=1 or the "Demo unlock" control). No password and no one-time
 * code ship in this file. The 6-digit code is created in the browser
 * after that unlock, shown once, and kept only in memory.
 *
 * Session: sessionStorage cognation.well.auth.v1 (clears on tab close).
 * Key name is Cognation naming debt — keep it so existing callers work.
 */
(function () {
  "use strict";

  var AUTH_KEY = "cognation.well.auth.v1";
  var DEMO_UNLOCK_KEY = "waymakers.demo.unlock.v1";
  var TTL_MS = 4 * 60 * 60 * 1000;

  var pendingOtp = null;
  var pendingUser = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function demoUnlockEnabled() {
    if (window.WAYMAKERSDemo && typeof window.WAYMAKERSDemo.isUnlocked === "function") {
      return !!window.WAYMAKERSDemo.isUnlocked();
    }
    try {
      var raw = sessionStorage.getItem(DEMO_UNLOCK_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      return !!(data && data.ok);
    } catch (e) {
      return false;
    }
  }

  function generateOtp() {
    var n = 0;
    try {
      if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        var buf = new Uint32Array(1);
        window.crypto.getRandomValues(buf);
        n = buf[0];
      }
    } catch (e) {
      n = 0;
    }
    if (!n) n = Math.floor(Math.random() * 900000);
    return String(100000 + (n % 900000));
  }

  function readSession() {
    try {
      var raw = sessionStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.ok || !data.at) return null;
      if (TTL_MS && Date.now() - data.at > TTL_MS) {
        sessionStorage.removeItem(AUTH_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeSession(data) {
    try {
      if (!data) sessionStorage.removeItem(AUTH_KEY);
      else sessionStorage.setItem(AUTH_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function isAuthenticated() {
    return !!readSession();
  }

  function setStatus(root, which, message, isError) {
    var el = $(('[data-well-auth-status="' + which + '"]'), root);
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!isError);
  }

  function applyDemoMode(root) {
    var on = demoUnlockEnabled();
    var chrome = $("[data-well-demo-chrome]", root);
    var steps = $("[data-well-auth-steps]", root);
    var offline = $("[data-well-auth-offline]", root);
    if (chrome) chrome.hidden = !on;
    if (steps) steps.hidden = !on;
    if (offline) offline.hidden = on;
    if (!on) setStep(root, 0);
    else if (root.getAttribute("data-well-auth-step") !== "2") setStep(root, 1);
  }

  function setStep(root, step) {
    root.setAttribute("data-well-auth-step", String(step));
    $all("[data-well-auth-step-indicator]", root).forEach(function (el) {
      var n = el.getAttribute("data-well-auth-step-indicator");
      el.classList.toggle("is-active", n === String(step));
      el.classList.toggle("is-done", Number(n) < step);
    });
    var cred = $('[data-well-auth-form="demo"]', root);
    var otp = $('[data-well-auth-form="otp"]', root);
    var allowed = demoUnlockEnabled();
    if (cred) cred.hidden = !(allowed && step === 1);
    if (otp) otp.hidden = !(allowed && step === 2);
    if (step !== 2) {
      pendingOtp = null;
      var display = $("[data-well-auth-code-display]", root);
      if (display) display.textContent = "————";
      var otpInput = $("#well-auth-otp", root);
      if (otpInput) otpInput.value = "";
      setStatus(root, "otp", "");
    }
    if (step === 1) {
      window.setTimeout(function () {
        var u = $("#well-auth-username", root);
        if (u) u.focus();
      }, 30);
    } else if (step === 2 && allowed) {
      pendingOtp = generateOtp();
      var codeEl = $("[data-well-auth-code-display]", root);
      if (codeEl) codeEl.textContent = pendingOtp;
      setStatus(root, "credentials", "");
      window.setTimeout(function () {
        var o = $("#well-auth-otp", root);
        if (o) o.focus();
      }, 30);
    }
  }

  function resetDemoForm(root) {
    var input = $("#well-auth-username", root);
    if (input) input.value = "";
    pendingUser = null;
    setStatus(root, "credentials", "");
    applyDemoMode(root);
  }

  function setLockedUi(root, locked) {
    root.classList.toggle("is-locked", locked);
    root.setAttribute("data-well-auth-state", locked ? "locked" : "unlocked");

    var lock = $("[data-well-auth-lock]", root);
    var secured = $("[data-well-secured]", root);
    var sessionBar = $("[data-well-session-bar]", root);
    var sideToggle = $("[data-well-side-toggle]", root);

    if (lock) {
      lock.hidden = !locked;
      lock.setAttribute("aria-hidden", locked ? "false" : "true");
    }

    if (secured) {
      if (locked) {
        secured.setAttribute("aria-hidden", "true");
        secured.setAttribute("inert", "");
        secured.hidden = false;
      } else {
        secured.removeAttribute("aria-hidden");
        secured.removeAttribute("inert");
      }
    }

    $all("[data-well-patient-root], [data-well-provider-root]", root).forEach(function (el) {
      if (locked) {
        el.setAttribute("aria-hidden", "true");
        el.setAttribute("inert", "");
      } else {
        el.removeAttribute("aria-hidden");
        el.removeAttribute("inert");
      }
    });

    if (sessionBar) sessionBar.hidden = locked;
    if (sideToggle) {
      sideToggle.hidden = locked;
      sideToggle.setAttribute("aria-hidden", locked ? "true" : "false");
      $all("button", sideToggle).forEach(function (btn) {
        btn.disabled = locked;
        if (locked) {
          btn.tabIndex = -1;
        } else {
          btn.tabIndex = btn.getAttribute("aria-selected") === "true" ? 0 : -1;
        }
      });
    }

    if (locked) resetDemoForm(root);
  }

  function unlock(root, username) {
    pendingOtp = null;
    pendingUser = null;
    writeSession({
      ok: true,
      user: username,
      at: Date.now(),
      factor: "runtime-otp",
      note: "local demo EHR · code created in this browser · not production auth · tab close ends session",
    });
    setLockedUi(root, false);
    document.dispatchEvent(
      new CustomEvent("cognation:well-auth", { detail: { unlocked: true, user: username } })
    );
  }

  function lock(root, opts) {
    opts = opts || {};
    writeSession(null);
    pendingOtp = null;
    pendingUser = null;
    if (!root) {
      $all("[data-well-app]").forEach(function (r) {
        setLockedUi(r, true);
        setStatus(r, "credentials", opts.message || "");
      });
    } else {
      setLockedUi(root, true);
      setStatus(root, "credentials", opts.message || "", !!opts.isError);
    }
    document.dispatchEvent(
      new CustomEvent("cognation:well-auth", { detail: { unlocked: false } })
    );
  }

  function normalizeUser(raw) {
    var u = String(raw || "").trim().toLowerCase();
    if (u.charAt(0) === "@") u = u.slice(1);
    return u;
  }

  function ensureGate(root) {
    root = root || $("[data-well-app]");
    if (!root) return isAuthenticated();
    if (isAuthenticated()) {
      setLockedUi(root, false);
      return true;
    }
    setLockedUi(root, true);
    return false;
  }

  function onWellPanelShown() {
    $all("[data-well-app]").forEach(function (root) {
      ensureGate(root);
    });
  }

  function wireRoot(root) {
    if (!root || root.__wellAuthWired) return;
    root.__wellAuthWired = true;

    var demoForm = $('[data-well-auth-form="demo"]', root);
    var otpForm = $('[data-well-auth-form="otp"]', root);
    var backBtn = $("[data-well-auth-back]", root);
    var lockBtn = $("[data-well-lock-btn]", root);

    if (demoForm) {
      demoForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!demoUnlockEnabled()) {
          setStatus(root, "credentials", "WELL clinical sign-in is not live.", true);
          applyDemoMode(root);
          return;
        }
        var user = normalizeUser(($("#well-auth-username", root) || {}).value);
        if (!user) {
          setStatus(root, "credentials", "Enter a display name for this local demo.", true);
          return;
        }
        pendingUser = user;
        setStatus(root, "credentials", "");
        setStep(root, 2);
      });
    }

    if (otpForm) {
      otpForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!demoUnlockEnabled() || !pendingOtp) {
          setStatus(root, "otp", "Demo unlock is required before a code is created.", true);
          applyDemoMode(root);
          return;
        }
        var input = $("#well-auth-otp", root);
        var code = String((input && input.value) || "").replace(/\s+/g, "");
        if (!/^\d{6}$/.test(code) || code !== pendingOtp) {
          setStatus(root, "otp", "That code does not match the one created in this browser.", true);
          return;
        }
        unlock(root, pendingUser || "demo");
        setStatus(root, "otp", "");
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", function () {
        setStep(root, 1);
        setStatus(root, "credentials", "");
      });
    }

    if (lockBtn) {
      lockBtn.addEventListener("click", function () {
        lock(root, { message: "WELL locked. Demo unlock, then the code created in this browser, opens the chart again." });
      });
    }

    var otpInput = $("#well-auth-otp", root);
    if (otpInput) {
      otpInput.addEventListener("input", function () {
        otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
      });
    }
  }

  function boot() {
    $all("[data-well-app]").forEach(function (root) {
      wireRoot(root);
      ensureGate(root);
    });

    document.addEventListener("waymakers:demo-unlock", function () {
      $all("[data-well-app]").forEach(function (root) {
        if (!isAuthenticated()) applyDemoMode(root);
      });
    });

    document.addEventListener("cognation:session-ended", function () {
      lock(null);
    });
  }

  window.CognationWellAuth = {
    AUTH_KEY: AUTH_KEY,
    isAuthenticated: isAuthenticated,
    ensureGate: ensureGate,
    lock: function () {
      lock(null);
    },
    unlockSession: function (username) {
      if (!demoUnlockEnabled()) return false;
      var root = $("[data-well-app]");
      if (root) unlock(root, username || "demo");
      return true;
    },
    onWellPanelShown: onWellPanelShown,
    getSession: readSession,
    demoUnlockEnabled: demoUnlockEnabled,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
