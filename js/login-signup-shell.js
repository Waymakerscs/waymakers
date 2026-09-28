/**
 * CGN-007 — Login/signup shell behavior.
 * Mode: [data-login-mode]="signin|signup" on [data-login-credentials-step]
 * Signup fields: age, country, state, phone, optional username
 * Single email: reuse #login-username (email address). Username auto-derives from email local-part when blank.
 * Persists member profile for COMMUNE age / dating gates.
 */
(function () {
  "use strict";

  var MEMBER_PROFILE_KEY = "waymakers.member.profile.v1";

  var step = document.querySelector("[data-login-credentials-step]");
  var form = document.getElementById("login-form");
  if (!step || !form) return;

  var toggleBtn = form.querySelector("[data-login-mode-toggle]");
  var signupFields = form.querySelector("[data-login-signup-fields]");
  var signinCountry = form.querySelector("[data-login-signin-country]");
  var signinCountrySelect = form.querySelector("[data-login-signin-country-select]");
  var signupCountrySelect = form.querySelector("[data-login-signup-country-select]");
  var stateSelect = form.querySelector("#state");
  var stateText = form.querySelector("[data-login-state-text]");
  var submitBtn = form.querySelector("[data-login-submit]");
  var titleEl = document.getElementById("login-gate-title");
  var descEl = document.getElementById("login-gate-desc");
  var statusEl = document.getElementById("login-status");
  var demoHint = form.querySelector("[data-login-demo-hint]");
  var passwordInput = form.querySelector("#login-password");

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("is-error", !!isError);
  }

  function readProfile() {
    try {
      var raw = localStorage.getItem(MEMBER_PROFILE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeProfile(fields) {
    var next = Object.assign({}, readProfile(), fields || {});
    try {
      localStorage.setItem(MEMBER_PROFILE_KEY, JSON.stringify(next));
    } catch (e) {}
    if (next.country) {
      try {
        localStorage.setItem("waymakers.member.country.v1", String(next.country));
      } catch (e2) {}
    }
    if (window.WAYMAKERSCommuneSwipe && window.WAYMAKERSCommuneSwipe.setMemberProfile) {
      try {
        window.WAYMAKERSCommuneSwipe.setMemberProfile(next);
      } catch (e3) {}
    }
    document.dispatchEvent(
      new CustomEvent("cognation:member-profile-updated", { detail: next })
    );
    return next;
  }

  function syncStateInputs(country) {
    var isUS = country === "United States";
    if (stateSelect && stateText) {
      stateSelect.hidden = !isUS;
      stateSelect.disabled = !isUS;
      stateText.hidden = isUS;
      stateText.disabled = isUS;
      if (isUS) {
        stateSelect.setAttribute("name", "state");
        stateText.removeAttribute("name");
      } else {
        stateText.setAttribute("name", "state");
        stateSelect.removeAttribute("name");
      }
    }
  }

  function setMode(mode) {
    mode = mode === "signup" ? "signup" : "signin";
    step.setAttribute("data-login-mode", mode);
    var isSignup = mode === "signup";

    if (signupFields) signupFields.hidden = !isSignup;
    if (signinCountry) signinCountry.hidden = isSignup;

    if (signinCountrySelect) {
      signinCountrySelect.disabled = isSignup;
      if (isSignup) signinCountrySelect.removeAttribute("name");
      else signinCountrySelect.setAttribute("name", "country");
    }
    if (signupCountrySelect) {
      signupCountrySelect.disabled = !isSignup;
      if (isSignup) signupCountrySelect.setAttribute("name", "country");
      else signupCountrySelect.removeAttribute("name");
    }

    form.querySelectorAll("[data-login-signup-fields] input, [data-login-signup-fields] select").forEach(function (el) {
      if (el === signupCountrySelect) return;
      if (el === stateText || el === stateSelect) {
        if (!isSignup) {
          el.disabled = true;
          el.removeAttribute("name");
        }
        return;
      }
      el.disabled = !isSignup;
    });
    if (isSignup && signupCountrySelect) syncStateInputs(signupCountrySelect.value);

    if (passwordInput) {
      passwordInput.setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
    }
    if (submitBtn) submitBtn.textContent = isSignup ? "Sign up" : "Sign in";
    if (toggleBtn) {
      toggleBtn.textContent = isSignup
        ? "Have an account? Sign in"
        : "Need an account? Sign up";
    }
    if (titleEl) titleEl.textContent = isSignup ? "Sign up" : "Sign in";
    if (descEl) {
      descEl.innerHTML = isSignup
        ? 'Create your <span data-brand>WAYMAKERS</span> account.'
        : 'Welcome to <span data-brand>WAYMAKERS</span>. Sign in with your account to continue.';
    }
    var userLabel = form.querySelector('label[for="login-username"]');
    if (userLabel) userLabel.textContent = "Email address";
    var userInput = form.querySelector("#login-username");
    if (userInput) {
      userInput.setAttribute("autocomplete", isSignup ? "email" : "username");
      userInput.setAttribute("inputmode", "email");
      if (!userInput.getAttribute("placeholder")) {
        userInput.setAttribute("placeholder", "you@example.com");
      }
    }
    if (demoHint) demoHint.hidden = true;
    setStatus("");
  }

  function markInvalid(el, bad) {
    if (!el) return;
    el.setAttribute("aria-invalid", bad ? "true" : "false");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function sanitizeUsername(raw) {
    return String(raw || "")
      .trim()
      .replace(/^@/, "")
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 40);
  }

  function deriveUsernameFromEmail(email) {
    var local = String(email || "").trim().split("@")[0] || "";
    var derived = sanitizeUsername(local);
    if (derived.length >= 3) return derived;
    /* Pad short local-parts so signup can proceed with a valid handle */
    if (derived.length > 0) return (derived + "user").slice(0, 40);
    return "user";
  }

  function isValidUsername(value) {
    return /^[A-Za-z0-9_-]{3,40}$/.test(String(value || "").trim());
  }

  /** Resolve username: prefer explicit field; if blank, derive from email. */
  function resolveSignupUsername(email) {
    var userEl = form.querySelector("#signup-username") || form.querySelector("[data-login-signup-username]");
    var typed = userEl ? sanitizeUsername(userEl.value) : "";
    if (typed) return { username: typed, derived: false, el: userEl };
    return {
      username: deriveUsernameFromEmail(email),
      derived: true,
      el: userEl,
    };
  }

  function validateSignup() {
    var ok = true;
    var age = form.querySelector("#age");
    var phone = form.querySelector("#phone");
    var emailEl = form.querySelector("#login-username");
    var userEl = form.querySelector("#signup-username") || form.querySelector("[data-login-signup-username]");
    var pass = form.querySelector("#login-password");
    var country = signupCountrySelect;
    var usernameIssue = false;

    function req(el, check) {
      var bad = !check(el);
      markInvalid(el, bad);
      if (bad) ok = false;
      return !bad;
    }

    /* Single required email — top field. Do not treat it as a username. */
    req(emailEl, function (el) {
      return el && isValidEmail(el.value);
    });
    req(pass, function (el) {
      return el && el.value.length > 0;
    });
    req(age, function (el) {
      if (!el || el.value === "") return false;
      var n = Number(el.value);
      return n >= 13 && n <= 120;
    });
    req(country, function (el) {
      return el && el.value;
    });
    if (country && country.value === "United States") {
      req(stateSelect, function (el) {
        return el && el.value;
      });
    } else {
      req(stateText, function (el) {
        return el && el.value.trim().length > 0;
      });
    }
    req(phone, function (el) {
      return el && el.value.trim().length >= 7;
    });

    /* Username: only validate when the user typed one, or after derive on submit.
       Blank is OK — we auto-derive from email local-part. */
    var emailVal = emailEl ? String(emailEl.value || "").trim() : "";
    var typedRaw = userEl ? String(userEl.value || "").trim() : "";
    if (typedRaw) {
      var sanitized = sanitizeUsername(typedRaw);
      var userOk = isValidUsername(sanitized);
      markInvalid(userEl, !userOk);
      if (!userOk) {
        ok = false;
        usernameIssue = true;
      }
    } else if (userEl) {
      markInvalid(userEl, false);
      /* If email is valid, ensure derived handle would be valid; else ignore until email fixed */
      if (isValidEmail(emailVal)) {
        var derived = deriveUsernameFromEmail(emailVal);
        if (!isValidUsername(derived)) {
          markInvalid(userEl, true);
          ok = false;
          usernameIssue = true;
        }
      }
    }

    return { ok: ok, usernameIssue: usernameIssue };
  }

  function collectSignupProfile() {
    var ageEl = form.querySelector("#age");
    var phoneEl = form.querySelector("#phone");
    var emailEl = form.querySelector("#login-username");
    var country =
      (signupCountrySelect && signupCountrySelect.value) ||
      "United States";
    var state = "";
    if (country === "United States") {
      state = stateSelect ? stateSelect.value : "";
    } else {
      state = stateText ? stateText.value.trim() : "";
    }
    var email = emailEl ? emailEl.value.trim() : "";
    var resolved = resolveSignupUsername(email);
    /* Reflect derived username into the field so the user sees what we used */
    if (resolved.derived && resolved.el && resolved.username) {
      resolved.el.value = resolved.username;
    } else if (resolved.el && !resolved.derived) {
      resolved.el.value = resolved.username;
    }
    return {
      age: ageEl ? parseInt(ageEl.value, 10) : null,
      country: country,
      state: state,
      phone: phoneEl ? phoneEl.value.trim() : "",
      email: email,
      username: resolved.username,
      updatedAt: Date.now(),
    };
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var cur = step.getAttribute("data-login-mode") || "signin";
      setMode(cur === "signup" ? "signin" : "signup");
    });
  }

  if (signupCountrySelect) {
    signupCountrySelect.addEventListener("change", function () {
      syncStateInputs(signupCountrySelect.value);
    });
  }

  /* Create a real account when Supabase is configured; retain local capture
     only for the offline demo. */
  form.addEventListener(
    "submit",
    function (e) {
      var mode = step.getAttribute("data-login-mode") || "signin";
      if (mode === "signup") {
        e.preventDefault();
        e.stopImmediatePropagation();
        var validation = validateSignup();
        if (!validation.ok) {
          if (validation.usernameIssue) {
            setStatus(
              "Use a 3–40 character username (letters, numbers, _ or -), or leave it blank to use your email name.",
              true
            );
          } else {
            setStatus("Please fix the highlighted fields.", true);
          }
          return;
        }
        var profile = collectSignupProfile();
        var password = (form.querySelector("#login-password") || {}).value || "";
        var handle = String(profile.username || "")
          .trim()
          .toLowerCase()
          .replace(/^@/, "")
          .replace(/[^a-z0-9_-]/g, "")
          .slice(0, 40);
        if (
          window.WAYMAKERSSupabase &&
          window.WAYMAKERSSupabase.configured &&
          window.WAYMAKERSSupabase.configured()
        ) {
          setStatus("Creating your WAYMAKERS account…", false);
          window.WAYMAKERSSupabase
            .signUp({
              email: profile.email,
              password: password,
              username: profile.username,
              handle: handle,
              displayName: profile.username,
            })
            .then(function (result) {
              writeProfile(profile);
              if (result && result.session && window.WAYMAKERSAuth) {
                return window.WAYMAKERSAuth.login(profile.email, password);
              }
              setMode("signin");
              setStatus(
                "Account created. Check your email to confirm it, then sign in with your email.",
                false
              );
              return null;
            })
            .catch(function (error) {
              setStatus(
                (error && error.message) || "Could not create your account. Please try again.",
                true
              );
            });
          return;
        }
        setStatus("Account sign-up is not configured. Please try again later.", true);
        return;
      }

      /* Sign-in: also capture country + keep any existing age */
      var countryInput = form.querySelector(
        '[data-login-signin-country-select], select[name="country"]'
      );
      var patch = {};
      if (countryInput && countryInput.value) patch.country = countryInput.value;
      /* If age field somehow visible/filled, keep it */
      var ageEl = form.querySelector("#age");
      if (ageEl && ageEl.value && !ageEl.disabled) {
        patch.age = parseInt(ageEl.value, 10);
      }
      if (Object.keys(patch).length) writeProfile(patch);
    },
    true
  );

  /* Hydrate from existing profile */
  (function hydrate() {
    var p = readProfile();
    var ageEl = form.querySelector("#age");
    var phoneEl = form.querySelector("#phone");
    var emailEl = form.querySelector("#login-username");
    var userEl = form.querySelector("#signup-username") || form.querySelector("[data-login-signup-username]");
    if (ageEl && p.age != null) ageEl.value = p.age;
    if (phoneEl && p.phone) phoneEl.value = p.phone;
    if (emailEl && p.email) emailEl.value = p.email;
    if (userEl && p.username) userEl.value = sanitizeUsername(p.username);
    if (signupCountrySelect && p.country) signupCountrySelect.value = p.country;
    if (signinCountrySelect && p.country) {
      try {
        signinCountrySelect.value = p.country;
      } catch (e) {}
    }
    if (p.country === "United States" && stateSelect && p.state) stateSelect.value = p.state;
    else if (stateText && p.state) stateText.value = p.state;
  })();

  setMode("signin");
})();
