/**
 * WELL second authentication locks (step-up), one per portal side.
 *
 * Separate from WAYMAKERS site sign-in. Patient and Provider do not share
 * a session. Unlocking Patient does not open Provider, and the reverse.
 * Each side needs its own username, password, and one-time code:
 *   1. WELL username + password for that side, checked by POST /api/well-auth
 *   2. the one-time code that endpoint issues for this attempt and this side
 *
 * No password and no fixed code ship in this file. Pages env holds
 * WELL_AUTH_PATIENT_USERS, WELL_AUTH_PATIENT_PASSWORD,
 * WELL_AUTH_PROVIDER_USERS, and WELL_AUTH_PROVIDER_PASSWORD
 * (see functions/api/well-auth.js). Legacy WELL_AUTH_USERS / WELL_AUTH_PASSWORD
 * do not open either side. Site demo unlock (?demo=1 / Demo unlock) does not
 * open these locks.
 *
 * Sessions (cleared on tab close, soft TTL 4h):
 *   cognation.well.auth.patient.v1
 *   cognation.well.auth.provider.v1
 * The older shared key cognation.well.auth.v1 is removed on boot and never
 * grants either portal, so a leftover shared session cannot open both sides.
 * Lock Patient / Lock Provider clears only that side.
 * CognationWellAuth.lock() and site sign-out clear both.
 *
 * The chart behind the lock is still a local demo EHR. Not HIPAA.
 * PHI must not leave the browser.
 */
(function () {
  "use strict";

  var AUTH_KEYS = {
    patient: "cognation.well.auth.patient.v1",
    provider: "cognation.well.auth.provider.v1",
  };
  var LEGACY_AUTH_KEY = "cognation.well.auth.v1";
  var TTL_MS = 4 * 60 * 60 * 1000;

  var COPY = {
    patient: {
      eyebrow: "Your appointments",
      title: "Patient sign-in",
      desc: "Your own doctor appointments. This opens the Patient portal only. Work hours on the Provider side stay locked until you sign in there. Separate from WAYMAKERS site sign-in.",
      unlock: "Unlock Patient",
      lock: "Lock Patient",
      chip: "Patient session",
      lockedMsg: "Patient locked. Sign in again for your own doctor appointments. Work hours are unchanged.",
    },
    provider: {
      eyebrow: "Work hours",
      title: "Provider sign-in",
      desc: "Work hours for the staff schedule. This opens the Provider portal only. Your own doctor appointments stay locked until you sign in on the Patient side. Separate from WAYMAKERS site sign-in.",
      unlock: "Unlock Provider",
      lock: "Lock Provider",
      chip: "Provider session",
      lockedMsg: "Provider locked. Sign in again for work hours. Your own doctor appointments are unchanged.",
    },
  };

  var pending = {
    patient: emptyPending(),
    provider: emptyPending(),
  };
  var renderedSide = null;

  function emptyPending() {
    return { user: null, challenge: null, otp: null };
  }

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

  function normalizeSide(raw) {
    return raw === "provider" ? "provider" : raw === "patient" ? "patient" : "";
  }

  function currentSide(root) {
    var side = root && root.getAttribute ? root.getAttribute("data-well-side") : "";
    return side === "provider" ? "provider" : "patient";
  }

  function storageKey(side) {
    return AUTH_KEYS[side] || "";
  }

  function purgeLegacy() {
    try {
      sessionStorage.removeItem(LEGACY_AUTH_KEY);
    } catch (e) {}
  }

  function readSession(side) {
    side = normalizeSide(side);
    var key = storageKey(side);
    if (!key) return null;
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.ok || !data.at || data.side !== side) {
        sessionStorage.removeItem(key);
        return null;
      }
      if (TTL_MS && Date.now() - data.at > TTL_MS) {
        sessionStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeSession(side, data) {
    side = normalizeSide(side);
    var key = storageKey(side);
    if (!key) return;
    try {
      if (!data) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function isAuthenticated(side) {
    if (!normalizeSide(side)) {
      var root = $("[data-well-app]");
      side = currentSide(root);
    }
    return !!readSession(side);
  }

  function setStatus(root, which, message, isError) {
    var el = $(('[data-well-auth-status="' + which + '"]'), root);
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    if (el.classList && el.classList.toggle) el.classList.toggle("is-error", !!isError);
  }

  function setBusy(root, on) {
    $all(".well-auth-submit", root).forEach(function (btn) {
      btn.disabled = !!on;
    });
  }

  function paintCopy(root, side) {
    var copy = COPY[side] || COPY.patient;
    var eyebrow = $("[data-well-auth-eyebrow]", root);
    var title = $("#well-auth-title", root);
    var desc = $("#well-auth-desc", root);
    var chip = $("[data-well-session-label]", root);
    var lockBtn = $("[data-well-lock-btn]", root);
    if (eyebrow) eyebrow.textContent = copy.eyebrow;
    if (title) title.textContent = copy.title;
    if (desc) desc.textContent = copy.desc;
    if (chip) chip.textContent = copy.chip;
    if (lockBtn) lockBtn.textContent = copy.lock;
    $all("[data-well-auth-unlock]", root).forEach(function (btn) {
      btn.textContent = copy.unlock;
    });
    $all("[data-well-auth-side]", root).forEach(function (btn) {
      var on = btn.getAttribute("data-well-auth-side") === side;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (btn.classList && btn.classList.toggle) btn.classList.toggle("is-selected", on);
    });
    root.setAttribute("data-well-patient-auth", isAuthenticated("patient") ? "unlocked" : "locked");
    root.setAttribute("data-well-provider-auth", isAuthenticated("provider") ? "unlocked" : "locked");
  }

  function revealSideToggle(root) {
    var sideToggle = $("[data-well-side-toggle]", root);
    if (!sideToggle) return;
    sideToggle.hidden = false;
    sideToggle.setAttribute("aria-hidden", "false");
    $all("button", sideToggle).forEach(function (btn) {
      btn.disabled = false;
      if (btn.getAttribute("aria-selected") === "true") btn.tabIndex = 0;
    });
  }

  function setStep(root, step) {
    var side = currentSide(root);
    var slot = pending[side] || emptyPending();
    root.setAttribute("data-well-auth-step", String(step));
    $all("[data-well-auth-step-indicator]", root).forEach(function (el) {
      var n = el.getAttribute("data-well-auth-step-indicator");
      if (!el.classList || !el.classList.toggle) return;
      el.classList.toggle("is-active", n === String(step));
      el.classList.toggle("is-done", Number(n) < step);
    });
    var cred = $('[data-well-auth-form="credentials"]', root);
    var otp = $('[data-well-auth-form="otp"]', root);
    if (cred) cred.hidden = step !== 1;
    if (otp) otp.hidden = step !== 2;
    if (step !== 2) {
      var display = $("[data-well-auth-code-display]", root);
      if (display) display.textContent = "————";
      var otpInput = $("#well-auth-otp", root);
      if (otpInput) otpInput.value = "";
      setStatus(root, "otp", "");
    } else {
      var codeEl = $("[data-well-auth-code-display]", root);
      if (codeEl) codeEl.textContent = slot.otp || "————";
      setStatus(root, "credentials", "");
      window.setTimeout(function () {
        var o = $("#well-auth-otp", root);
        if (o && o.focus) o.focus();
      }, 30);
    }
    if (step === 1) {
      window.setTimeout(function () {
        var u = $("#well-auth-username", root);
        if (u && u.focus) u.focus();
      }, 30);
    }
  }

  function showUnlocked(root) {
    var side = currentSide(root);
    if (root.classList && root.classList.toggle) root.classList.toggle("is-locked", false);
    root.setAttribute("data-well-auth-state", "unlocked");
    paintCopy(root, side);
    var lock = $("[data-well-auth-lock]", root);
    if (lock) {
      lock.hidden = true;
      lock.setAttribute("aria-hidden", "true");
    }
    var secured = $("[data-well-secured]", root);
    if (secured) {
      secured.removeAttribute("aria-hidden");
      secured.removeAttribute("inert");
    }
    var sessionBar = $("[data-well-session-bar]", root);
    if (sessionBar) sessionBar.hidden = false;
    revealSideToggle(root);
  }

  function showLocked(root) {
    var side = currentSide(root);
    if (root.classList && root.classList.toggle) root.classList.toggle("is-locked", true);
    root.setAttribute("data-well-auth-state", "locked");
    paintCopy(root, side);
    var lock = $("[data-well-auth-lock]", root);
    if (lock) {
      lock.hidden = false;
      lock.setAttribute("aria-hidden", "false");
    }
    var secured = $("[data-well-secured]", root);
    if (secured) {
      secured.setAttribute("aria-hidden", "true");
      secured.setAttribute("inert", "");
    }
    var sessionBar = $("[data-well-session-bar]", root);
    if (sessionBar) sessionBar.hidden = true;
    revealSideToggle(root);
    var slot = pending[side];
    setStep(root, slot && slot.challenge ? 2 : 1);
  }

  function clearPending(side) {
    if (!pending[side]) return;
    pending[side] = emptyPending();
  }

  function unlock(root, username, side) {
    side = normalizeSide(side) || currentSide(root);
    clearPending(side);
    purgeLegacy();
    writeSession(side, {
      ok: true,
      user: username,
      side: side,
      at: Date.now(),
      factor: "password+otp",
      note: "sessionStorage · this side only · password+otp via /api/well-auth · tab close ends it · soft TTL 4h",
    });
    if (currentSide(root) === side) showUnlocked(root);
    else paintCopy(root, currentSide(root));
    document.dispatchEvent(
      new CustomEvent("cognation:well-auth", {
        detail: { unlocked: true, user: username, side: side },
      })
    );
  }

  function lockSides(root, sides, opts) {
    opts = opts || {};
    sides.forEach(function (side) {
      clearPending(side);
      writeSession(side, null);
    });
    purgeLegacy();
    var apply = function (r) {
      if (!r) return;
      if (isAuthenticated(currentSide(r))) showUnlocked(r);
      else showLocked(r);
      if (opts.message) setStatus(r, "credentials", opts.message, !!opts.isError);
    };
    if (root) apply(root);
    else $all("[data-well-app]").forEach(apply);
    document.dispatchEvent(
      new CustomEvent("cognation:well-auth", {
        detail: { unlocked: false, sides: sides.slice() },
      })
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

  function syncSide(root, opts) {
    opts = opts || {};
    var side = currentSide(root);
    var changed = renderedSide !== side;
    renderedSide = side;
    if (changed && opts.clearPassword !== false) {
      var pass = $("#well-auth-password", root);
      if (pass) pass.value = "";
      setStatus(root, "credentials", "");
      setStatus(root, "otp", "");
    }
    if (isAuthenticated(side)) showUnlocked(root);
    else showLocked(root);
  }

  function ensureGate(root) {
    root = root || $("[data-well-app]");
    if (!root) return isAuthenticated();
    syncSide(root, { clearPassword: false });
    return isAuthenticated(currentSide(root));
  }

  function onWellPanelShown() {
    $all("[data-well-app]").forEach(function (root) {
      ensureGate(root);
    });
  }

  function chooseSide(root, side) {
    side = normalizeSide(side);
    if (!side) return;
    if (currentSide(root) === side) {
      syncSide(root);
      return;
    }
    if (window.CognationWellApplySide) {
      window.CognationWellApplySide(side);
      return;
    }
    root.setAttribute("data-well-side", side);
    syncSide(root);
  }

  function wireRoot(root) {
    if (!root || root.__wellAuthWired) return;
    root.__wellAuthWired = true;

    var credForm = $('[data-well-auth-form="credentials"]', root);
    var otpForm = $('[data-well-auth-form="otp"]', root);
    var backBtn = $("[data-well-auth-back]", root);
    var lockBtn = $("[data-well-lock-btn]", root);

    $all("[data-well-auth-side]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        chooseSide(root, btn.getAttribute("data-well-auth-side"));
      });
    });

    if (credForm) {
      credForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var side = currentSide(root);
        var user = normalizeUser(($("#well-auth-username", root) || {}).value);
        var pass = String(($("#well-auth-password", root) || {}).value || "");
        if (!user || !pass) {
          setStatus(root, "credentials", "Enter your WELL username and password.", true);
          return;
        }
        setBusy(root, true);
        setStatus(root, "credentials", "Checking " + side + " sign-in…", false);
        postAuth({ step: "credentials", side: side, username: user, password: pass })
          .then(function (data) {
            if (!data.ok || !data.challenge || (data.side && data.side !== side)) {
              if (currentSide(root) === side) {
                setStatus(
                  root,
                  "credentials",
                  (data.side && data.side !== side
                    ? "That sign-in is for the other WELL portal."
                    : data.error) || "WELL sign-in could not be completed.",
                  true
                );
              }
              return;
            }
            pending[side] = {
              user: data.user || user,
              challenge: data.challenge,
              otp: /^\d{6}$/.test(String(data.code || "")) ? String(data.code) : null,
            };
            if (currentSide(root) !== side) return;
            setStatus(root, "credentials", "");
            setStep(root, 2);
          })
          .catch(function () {
            if (currentSide(root) !== side) return;
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
        var side = currentSide(root);
        var slot = pending[side] || emptyPending();
        var input = $("#well-auth-otp", root);
        var code = String((input && input.value) || "").replace(/\s+/g, "");
        if (!slot.challenge || !slot.user) {
          clearPending(side);
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
          side: side,
          username: slot.user,
          code: code,
          challenge: slot.challenge,
        })
          .then(function (data) {
            if (data.side && data.side !== side) {
              if (currentSide(root) === side) {
                clearPending(side);
                setStep(root, 1);
                setStatus(root, "credentials", "That verification code is for the other WELL portal.", true);
              }
              return;
            }
            if (!data.ok) {
              if (currentSide(root) !== side) return;
              if (data.restart) {
                clearPending(side);
                setStep(root, 1);
                setStatus(root, "credentials", data.error || "Enter your WELL password again.", true);
                return;
              }
              setStatus(root, "otp", data.error || "Wrong verification code.", true);
              return;
            }
            unlock(root, data.user || slot.user || side, side);
            if (currentSide(root) === side) setStatus(root, "otp", "");
          })
          .catch(function () {
            if (currentSide(root) !== side) return;
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
        clearPending(currentSide(root));
        setStep(root, 1);
        setStatus(root, "credentials", "");
      });
    }

    if (lockBtn) {
      lockBtn.addEventListener("click", function () {
        var side = currentSide(root);
        var pass = $("#well-auth-password", root);
        if (pass) pass.value = "";
        lockSides(root, [side], { message: COPY[side].lockedMsg });
      });
    }

    var otpInput = $("#well-auth-otp", root);
    if (otpInput) {
      otpInput.addEventListener("input", function () {
        otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
      });
    }

    document.addEventListener("cognation:well-side", function (ev) {
      var next = ev && ev.detail && ev.detail.side;
      if (next && root.getAttribute("data-well-side") !== next && !window.CognationWellApplySide) {
        root.setAttribute("data-well-side", next);
      }
      syncSide(root);
    });

    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        syncSide(root);
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-well-side"] });
    }
  }

  function boot() {
    purgeLegacy();
    $all("[data-well-app]").forEach(function (root) {
      wireRoot(root);
      ensureGate(root);
    });

    document.addEventListener("cognation:session-ended", function () {
      $all("[data-well-app]").forEach(function (root) {
        var pass = $("#well-auth-password", root);
        if (pass) pass.value = "";
      });
      lockSides(null, ["patient", "provider"], {
        message: "WELL locked. Sign in again on each portal you need.",
      });
    });
  }

  window.CognationWellAuth = {
    AUTH_KEY: LEGACY_AUTH_KEY,
    LEGACY_AUTH_KEY: LEGACY_AUTH_KEY,
    AUTH_KEYS: AUTH_KEYS,
    isAuthenticated: isAuthenticated,
    ensureGate: ensureGate,
    lockSide: function (side) {
      var normalized = normalizeSide(side);
      if (!normalized) return false;
      var root = $("[data-well-app]");
      lockSides(root, [normalized], {
        message: root && currentSide(root) === normalized ? COPY[normalized].lockedMsg : "",
      });
      return true;
    },
    lock: function () {
      lockSides(null, ["patient", "provider"], {
        message: "WELL locked. Sign in again on each portal you need.",
      });
    },
    unlockSession: function () {
      return false;
    },
    onWellPanelShown: onWellPanelShown,
    getSession: function (side) {
      if (!normalizeSide(side)) {
        var root = $("[data-well-app]");
        side = currentSide(root);
      }
      return readSession(side);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
