/**
 * WELL demo step-up gate.
 *
 * Not production auth · not HIPAA · demo EHR only.
 * PHI must not leave the browser.
 *
 * Unlock is the non-secret flag WAYMAKERSConfig.well.demoUnlock
 * (alias: CognationConfig.well.demoUnlock). No password or OTP ships here.
 *
 * Session: sessionStorage cognation.well.auth.v1 (clears on tab close).
 * Key name is Cognation naming debt — keep it so existing demo sessions
 * and callers do not break. Rename is a follow-up.
 */
(function () {
  "use strict";

  var AUTH_KEY = "cognation.well.auth.v1";
  var TTL_MS = 4 * 60 * 60 * 1000; /* optional soft TTL note; tab close still ends session */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function demoUnlockEnabled() {
    var cfg = window.WAYMAKERSConfig || window.CognationConfig || {};
    var well = cfg.well;
    if (well && typeof well.demoUnlock === "boolean") return well.demoUnlock;
    return true;
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
    var form = $('[data-well-auth-form="demo"]', root);
    var offline = $("[data-well-auth-offline]", root);
    var chrome = $("[data-well-demo-chrome]", root);
    if (form) form.hidden = !on;
    if (offline) offline.hidden = on;
    if (chrome) chrome.hidden = !on;
  }

  function resetDemoForm(root) {
    var input = $("#well-auth-username", root);
    if (input) input.value = "";
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
        secured.hidden = false; /* keep in DOM for well.js queries, but inert */
      } else {
        secured.removeAttribute("aria-hidden");
        secured.removeAttribute("inert");
      }
    }

    /* Hide chart roots from AT while locked */
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
    writeSession({
      ok: true,
      user: username,
      at: Date.now(),
      factor: "demo-unlock",
      note: "demo EHR · not production auth · sessionStorage · expires on tab close · soft TTL 4h",
    });
    setLockedUi(root, false);
    document.dispatchEvent(
      new CustomEvent("cognation:well-auth", { detail: { unlocked: true, user: username } })
    );
  }

  function lock(root, opts) {
    opts = opts || {};
    writeSession(null);
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
          setStatus(root, "credentials", "Enter a display name for this demo session.", true);
          return;
        }
        setStatus(root, "credentials", "");
        unlock(root, user);
      });
    }

    if (lockBtn) {
      lockBtn.addEventListener("click", function () {
        lock(root, { message: "WELL locked. Acknowledge the demo notice to open the chart again." });
      });
    }
  }

  function boot() {
    $all("[data-well-app]").forEach(function (root) {
      wireRoot(root);
      ensureGate(root);
    });

    /* When main site logs out, also clear WELL clinical session */
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
