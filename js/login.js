/**
 * Cognation login gate — required username/password (client-side gate on Pages).
 * Not a substitute for server auth; fine for a private $0 preview.
 *
 * Session: cognation.session.v2
 */
(function () {
  "use strict";

  var SESSION_KEY = "cognation.session.v2";
  var EXPECTED_USER = "alexa";
  var EXPECTED_PASS = "TowerCommune26";

  var API_BASE =
    (window.CognationConfig && window.CognationConfig.apiBaseUrl) || "/api";

  var gate = document.getElementById("login-gate");
  var form = document.getElementById("login-form");
  var statusEl = document.getElementById("login-status");
  var openBtn = document.querySelector("[data-login-open]");

  if (!gate || !form) return;

  var lastFocus = null;

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.hidden = !message;
    statusEl.textContent = message || "";
    statusEl.classList.toggle("is-error", !!isError);
    statusEl.setAttribute("role", message ? "status" : "none");
  }

  function readLocalSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeLocalSession(data) {
    try {
      if (!data) localStorage.removeItem(SESSION_KEY);
      else localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function openGate(opts) {
    opts = opts || {};
    lastFocus = document.activeElement;
    gate.hidden = false;
    gate.setAttribute("aria-hidden", "false");
    document.body.classList.add("login-gate-open");
    if (opts.message) setStatus(opts.message, !!opts.isError);
    else setStatus("");
    var first = form.querySelector('input[name="username"]');
    if (first) {
      window.setTimeout(function () {
        first.focus();
      }, 10);
    }
    document.dispatchEvent(new CustomEvent("cognation:session-ended"));
  }

  function closeGate() {
    gate.hidden = true;
    gate.setAttribute("aria-hidden", "true");
    document.body.classList.remove("login-gate-open");
    setStatus("");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    else if (openBtn) openBtn.focus();
    document.dispatchEvent(new CustomEvent("cognation:session-started"));
  }

  function establishSession(username) {
    var session = {
      username: username,
      source: "password",
      startedAt: Date.now(),
    };
    writeLocalSession(session);
    closeGate();
    return session;
  }

  function normalizeLoginUser(raw) {
    var u = String(raw || "").trim().toLowerCase();
    if (!u) return "";
    if (u.charAt(0) === "@") u = u.slice(1);
    /* Accept common Alexa identity spellings as the demo account */
    var alexaAliases = {
      alexa: true,
      "alexa thomas": true,
      "alexa j thomas": true,
      "alexa j. thomas": true,
      "alexa-thomas": true,
      "alexa.thomas": true,
      "alexathomas": true,
    };
    if (alexaAliases[u]) return EXPECTED_USER;
    return u;
  }

  function login(username, password) {
    username = normalizeLoginUser(username);
    password = String(password || "").trim();
    if (username === EXPECTED_USER.toLowerCase() && password === EXPECTED_PASS) {
      return Promise.resolve(establishSession(EXPECTED_USER));
    }
    return Promise.reject(new Error("bad credentials"));
  }

  function logout(opts) {
    opts = opts || {};
    writeLocalSession(null);
    openGate({
      message: opts.message || "Signed out. Sign in to continue.",
      isError: !!opts.isError,
    });
    return Promise.resolve();
  }

  function isAuthenticated() {
    return !!readLocalSession();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var userInput = form.querySelector('input[name="username"]');
    var passInput = form.querySelector('input[name="password"]');
    var countryInput = form.querySelector('select[name="country"]');
    var username = userInput ? userInput.value.trim() : "";
    var password = passInput ? passInput.value : "";
    var country = countryInput ? countryInput.value : "United States";
    setStatus("Signing in…", false);
    login(username, password).then(
      function () {
        try {
          localStorage.setItem("cognation.member.country.v1", country || "United States");
        } catch (err) {}
        if (window.CognationMemberCountry) {
          window.CognationMemberCountry.set(country || "United States");
        }
        setStatus("");
      },
      function () {
        setStatus("Wrong username or password.", true);
      }
    );
  });

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      openGate();
    });
  }

  /* Escape does not skip login */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !gate.hidden) {
      e.preventDefault();
    }
  });

  gate.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || gate.hidden) return;
    var focusable = gate.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  window.CognationAuth = {
    openGate: openGate,
    closeGate: closeGate,
    login: function (u, p) {
      return login(u, p == null ? "" : p);
    },
    logout: logout,
    isAuthenticated: isAuthenticated,
    getSession: readLocalSession,
    SESSION_KEY: SESSION_KEY,
    apiBaseUrl: API_BASE,
  };


  document.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest && ev.target.closest("[data-cognation-logout]");
    if (!btn) return;
    ev.preventDefault();
    logout({ message: "Signed out. Sign in to continue." });
  });

  function boot() {
    /* Clear old demo sessions so they cannot bypass */
    try {
      localStorage.removeItem("cognation.session.demo.v1");
    } catch (e) {}
    if (readLocalSession()) closeGate();
    else openGate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
