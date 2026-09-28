/**
 * WELL second authentication lock (step-up).
 *
 * Separate from WAYMAKERS site sign-in. Patient and Provider stay locked
 * until both factors succeed:
 *   1. WELL username + password, checked by POST /api/well-auth
 *   2. the one-time code that endpoint issues for this attempt
 *
 * No password and no fixed code ship in this file. Pages env holds
 * WELL_AUTH_USERS and WELL_AUTH_PASSWORD (see functions/api/well-auth.js).
 * Site demo unlock (?demo=1 / Demo unlock) does not open this lock.
 *
 * Session: sessionStorage cognation.well.auth.v1 (clears on tab close).
 * Key name is Cognation naming debt — keep it so existing callers work.
 *
 * The chart behind the lock is still a local demo EHR. Not HIPAA.
 * PHI must not leave the browser.
 */
(function () {
  "use strict";

  var AUTH_KEY = "cognation.well.auth.v1";
  var TTL_MS = 4 * 60 * 60 * 1000;

  var pendingOtp = null;
  var pendingUser = null;
  var pendingChallenge = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function apiUrl() {
    var base =
      (window.CognationConfig && window.CognationConfig.apiBaseUrl) ||
      (window.CognationAuth && window.CognationAuth.apiBaseUrl) ||
      "/api";
    return String(base).replace(/\/$/, "") + "/well-auth";
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

  function setBusy(root, on) {
    $all(".well-auth-submit", root).forEach(function (btn) {
      btn.disabled = !!on;
    });
  }

  function setStep(root, step) {
    root.setAttribute("data-well-auth-step", String(step));
    $all("[data-well-auth-step-indicator]", root).forEach(function (el) {
      var n = el.getAttribute("data-well-auth-step-indicator");
      el.classList.toggle("is-active", n === String(step));
      el.classList.toggle("is-done", Number(n) < step);
    });
    var cred = $('[data-well-auth-form="credentials"]', root);
    var otp = $('[data-well-auth-form="otp"]', root);
    if (cred) cred.hidden = step !== 1;
    if (otp) otp.hidden = step !== 2;
    if (step !== 2) {
      pendingOtp = null;
      pendingChallenge = null;
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
    } else if (step === 2) {
      var codeEl = $("[data-well-auth-code-display]", root);
      if (codeEl) codeEl.textContent = pendingOtp || "————";
      setStatus(root, "credentials", "");
      window.setTimeout(function () {
        var o = $("#well-auth-otp", root);
        if (o) o.focus();
      }, 30);
    }
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

    if (locked) {
      var pass = $("#well-auth-password", root);
      if (pass) pass.value = "";
      setStep(root, 1);
    }
  }

  function unlock(root, username) {
    pendingOtp = null;
    pendingUser = null;
    pendingChallenge = null;
    writeSession({
      ok: true,
      user: username,
      at: Date.now(),
      factor: "password+otp",
      note: "sessionStorage · password+otp via /api/well-auth · expires on tab close · soft TTL 4h",
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
    pendingChallenge = null;
    if (!root) {
      $all("[data-well-app]").forEach(function (r) {
        setLockedUi(r, true);
        setStatus(r, "credentials", opts.message || "", !!opts.isError);
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

  function postAuth(body) {
    return fetch(apiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          data = data && typeof data === "object" ? data : {};
          data.status = res.status;
          return data;
        });
    });
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

    var credForm = $('[data-well-auth-form="credentials"]', root);
    var otpForm = $('[data-well-auth-form="otp"]', root);
    var backBtn = $("[data-well-auth-back]", root);
    var lockBtn = $("[data-well-lock-btn]", root);

    if (credForm) {
      credForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var user = normalizeUser(($("#well-auth-username", root) || {}).value);
        var pass = String(($("#well-auth-password", root) || {}).value || "");
        if (!user || !pass) {
          setStatus(root, "credentials", "Enter your WELL username and password.", true);
          return;
        }
        setBusy(root, true);
        setStatus(root, "credentials", "Checking WELL sign-in…", false);
        postAuth({ step: "credentials", username: user, password: pass })
          .then(function (data) {
            if (!data.ok || !data.challenge) {
              setStatus(
                root,
                "credentials",
                data.error || "WELL sign-in could not be completed.",
                true
              );
              return;
            }
            pendingUser = data.user || user;
            pendingChallenge = data.challenge;
            pendingOtp = /^\d{6}$/.test(String(data.code || "")) ? String(data.code) : null;
            setStatus(root, "credentials", "");
            setStep(root, 2);
          })
          .catch(function () {
            setStatus(
              root,
              "credentials",
              "WELL sign-in could not be reached. The lock service has to be running on this host.",
              true
            );
          })
          .then(function () {
            setBusy(root, false);
          });
      });
    }

    if (otpForm) {
      otpForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $("#well-auth-otp", root);
        var code = String((input && input.value) || "").replace(/\s+/g, "");
        if (!pendingChallenge || !pendingUser) {
          setStep(root, 1);
          setStatus(root, "credentials", "Enter your WELL password again.", true);
          return;
        }
        if (!/^\d{6}$/.test(code)) {
          setStatus(root, "otp", "Enter the 6-digit verification code.", true);
          return;
        }
        setBusy(root, true);
        setStatus(root, "otp", "Checking verification code…", false);
        postAuth({
          step: "otp",
          username: pendingUser,
          code: code,
          challenge: pendingChallenge,
        })
          .then(function (data) {
            if (!data.ok) {
              if (data.restart) {
                setStep(root, 1);
                setStatus(root, "credentials", data.error || "Enter your WELL password again.", true);
                return;
              }
              setStatus(root, "otp", data.error || "Wrong verification code.", true);
              return;
            }
            unlock(root, data.user || pendingUser || "well");
            setStatus(root, "otp", "");
          })
          .catch(function () {
            setStatus(
              root,
              "otp",
              "WELL sign-in could not be reached. The lock service has to be running on this host.",
              true
            );
          })
          .then(function () {
            setBusy(root, false);
          });
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
        lock(root, {
          message: "WELL locked. Sign in again with your WELL username, password, and verification code.",
        });
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
    unlockSession: function () {
      return false;
    },
    onWellPanelShown: onWellPanelShown,
    getSession: readSession,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
