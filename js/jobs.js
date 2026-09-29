/**
 * JOBS — applicant-facing openings board.
 *
 * Posts are keyed by companyId (shared with WELL companies that use the service
 * and with PAGES directory listings). Filter via select, hash (#jobs/<companyId>),
 * or WaymakersJobs.filterByCompany(id) from Pages “View jobs” links.
 *
 * Sources: waymakers (company demo jobs) | indeed | linkedin.
 * Indeed and LinkedIn are remote-only and come from /api/jobs.
 * Missing keys or a partner block show a not-configured status — never invented listings.
 *
 * Not a company workspace (that’s WELL) and not a directory (that’s PAGES).
 */
(function () {
  "use strict";

  var DEMO_JOBS = [
    {
      id: "j-hpfm-ma",
      companyId: "hyde-park-family-medicine",
      source: "waymakers",
      title: "Medical Assistant",
      type: "Full-time",
      location: "Hyde Park, Chicago",
      blurb: "Room patients, vitals, and chart prep in our WELL-connected clinic.",
      posted: "2026-09-12",
    },
    {
      id: "j-hpfm-front",
      companyId: "hyde-park-family-medicine",
      source: "waymakers",
      title: "Front Desk Coordinator",
      type: "Full-time",
      location: "Hyde Park, Chicago",
      blurb: "Schedule visits, verify insurance, and greet patients.",
      posted: "2026-09-18",
    },
    {
      id: "j-heart-rn",
      companyId: "heartland-internal-medicine",
      source: "waymakers",
      title: "Registered Nurse — Ambulatory",
      type: "Full-time",
      location: "Streeterville, Chicago",
      blurb: "Triage, care coordination, and telehealth support for internal medicine.",
      posted: "2026-09-10",
    },
    {
      id: "j-heart-bill",
      companyId: "heartland-internal-medicine",
      source: "waymakers",
      title: "Billing Specialist",
      type: "Part-time",
      location: "Streeterville / hybrid",
      blurb: "Claims follow-up and patient statements for a growing practice.",
      posted: "2026-09-20",
    },
    {
      id: "j-bronze-hygienist",
      companyId: "bronzeville-family-dentistry",
      source: "waymakers",
      title: "Dental Hygienist",
      type: "Full-time",
      location: "Bronzeville, Chicago",
      blurb: "Cleanings, patient education, and digital charting.",
      posted: "2026-09-08",
    },
    {
      id: "j-grill-cook",
      companyId: "milwaukee-ave-grill",
      source: "waymakers",
      title: "Line Cook",
      type: "Full-time",
      location: "Wicker Park, Chicago",
      blurb: "Weekend nights preferred · burgers, grill, and expo support.",
      posted: "2026-09-22",
    },
    {
      id: "j-grill-server",
      companyId: "milwaukee-ave-grill",
      source: "waymakers",
      title: "Server",
      type: "Part-time",
      location: "Wicker Park, Chicago",
      blurb: "Evenings and brunch · tips pooled.",
      posted: "2026-09-15",
    },
    {
      id: "j-clark-barista",
      companyId: "clark-street-cafe",
      source: "waymakers",
      title: "Barista",
      type: "Part-time",
      location: "Andersonville, Chicago",
      blurb: "Pour-overs, pastry case, and friendly neighborhood service.",
      posted: "2026-09-14",
    },
  ];

  var activeFilter = "";
  var activeLocation = "";
  var activeSource = "";
  var shellRoot = null;
  var loadToken = 0;

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function adapters() {
    return window.WaymakersJobsAdapters || null;
  }

  function defaultLocation() {
    var A = adapters();
    return A && A.defaultLocation ? A.defaultLocation() : "Chicago, IL";
  }

  function companyName(id) {
    var C = window.WaymakersCompanies;
    var c = C && typeof C.get === "function" ? C.get(id) : null;
    return (c && c.name) || id || "Company";
  }

  function listCompaniesForFilter() {
    var C = window.WaymakersCompanies;
    if (C && typeof C.list === "function") return C.list();
    var seen = {};
    var out = [];
    DEMO_JOBS.forEach(function (j) {
      if (!seen[j.companyId]) {
        seen[j.companyId] = true;
        out.push({ id: j.companyId, name: j.companyId });
      }
    });
    return out;
  }

  function locationMatches(jobLoc, filterLoc) {
    var f = String(filterLoc || "").trim().toLowerCase();
    if (!f) return true;
    var hay = String(jobLoc || "").toLowerCase();
    if (hay.indexOf(f) !== -1) return true;
    /* loose: each whitespace token of the filter must appear somewhere */
    var tokens = f.split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) return true;
    return tokens.every(function (t) {
      return hay.indexOf(t) !== -1;
    });
  }

  function filterWaymakersJobs(companyId, location) {
    var id = (companyId || "").trim();
    return DEMO_JOBS.filter(function (j) {
      if (id && j.companyId !== id) return false;
      return locationMatches(j.location, location);
    });
  }

  function parseHashCompany() {
    var h = (location.hash || "").replace(/^#/, "");
    /* #jobs/<companyId> or #jobs?company=<id> */
    if (h.indexOf("jobs/") === 0) {
      return decodeURIComponent(h.slice(5).split(/[/?#]/)[0] || "");
    }
    if (h.indexOf("jobs?") === 0) {
      var q = h.slice(5);
      var m = /(?:^|&)company=([^&]+)/.exec(q);
      return m ? decodeURIComponent(m[1]) : "";
    }
    return "";
  }

  function setHashForFilter(companyId) {
    var id = (companyId || "").trim();
    var next = id ? "jobs/" + encodeURIComponent(id) : "jobs";
    if ((location.hash || "").replace(/^#/, "") === next) return;
    if (history && typeof history.replaceState === "function") {
      history.replaceState(null, "", "#" + next);
    } else {
      location.hash = next;
    }
  }

  function buildCompanySelect(select, selectedId) {
    select.innerHTML = "";
    var all = document.createElement("option");
    all.value = "";
    all.textContent = "All companies";
    select.appendChild(all);
    listCompaniesForFilter().forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    select.value = selectedId || "";
  }

  function sourceLabel(source) {
    if (source === "indeed") return "Indeed";
    if (source === "linkedin") return "LinkedIn";
    return "Waymakers";
  }

  function displayCompany(job) {
    if (job.companyName) return job.companyName;
    if (job.companyId) return companyName(job.companyId);
    return sourceLabel(job.source);
  }

  function renderJobs(container, emptyEl, jobs, companyId) {
    container.innerHTML = "";
    if (!jobs.length) {
      emptyEl.hidden = false;
      emptyEl.textContent = companyId
        ? "No openings posted for " + companyName(companyId) + " right now."
        : "No openings match.";
      container.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    container.hidden = false;

    var ul = document.createElement("ul");
    ul.className = "jobs-list";
    ul.setAttribute("aria-label", "Job openings");

    jobs.forEach(function (job) {
      var li = document.createElement("li");
      li.className =
        "jobs-card" + (job.external ? " jobs-card--external" : "");
      li.setAttribute("data-job-id", job.id);
      if (job.companyId) li.setAttribute("data-company-id", job.companyId);
      li.setAttribute("data-jobs-source", job.source || "waymakers");

      var chips =
        '<span class="jobs-chip">' +
        escapeHtml(job.type || "") +
        "</span>" +
        '<span class="jobs-chip jobs-chip--source">' +
        escapeHtml(sourceLabel(job.source)) +
        "</span>";
      if (job.external) {
        chips +=
          '<span class="jobs-chip jobs-chip--remote">Remote</span>' +
          '<span class="jobs-chip jobs-chip--external">External</span>';
      } else {
        chips += '<span class="jobs-chip jobs-chip--deferred">Local demo</span>';
      }

      var actions;
      var safeUrl = job.external && /^https:\/\//i.test(String(job.url || "")) ? job.url : "";
      if (safeUrl) {
        actions =
          '<div class="jobs-card-actions">' +
          '<a class="jobs-apply-btn jobs-apply-btn--external" href="' +
          escapeHtml(safeUrl) +
          '" target="_blank" rel="noopener noreferrer">View on ' +
          escapeHtml(sourceLabel(job.source)) +
          "</a>" +
          "</div>";
      } else {
        actions =
          '<div class="jobs-card-actions">' +
          '<button type="button" class="jobs-apply-btn" data-jobs-apply="' +
          escapeHtml(job.id) +
          '">Apply (local demo)</button>' +
          "</div>";
      }

      var meta =
        '<p class="jobs-card-meta">' +
        '<span class="jobs-location">' +
        escapeHtml(job.location || "") +
        "</span>" +
        (job.posted
          ? '<span class="jobs-posted">Posted ' +
            escapeHtml(job.posted) +
            "</span>"
          : "") +
        "</p>";

      li.innerHTML =
        '<div class="jobs-card-row">' +
        '<strong class="jobs-card-title">' +
        escapeHtml(job.title) +
        "</strong>" +
        chips +
        "</div>" +
        '<p class="jobs-card-company">' +
        escapeHtml(displayCompany(job)) +
        "</p>" +
        '<p class="jobs-card-blurb">' +
        escapeHtml(job.blurb) +
        "</p>" +
        meta +
        actions;
      ul.appendChild(li);
    });

    container.appendChild(ul);

    container.querySelectorAll("[data-jobs-apply]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-jobs-apply");
        var job = DEMO_JOBS.filter(function (j) {
          return j.id === id;
        })[0];
        var name = job
          ? job.title + " @ " + companyName(job.companyId)
          : "this role";
        showApplyHint(
          "Demo only — application for “" + name + "” is not live yet."
        );
      });
    });
  }

  function showApplyHint(message) {
    if (!shellRoot) return;
    var existing = shellRoot.querySelector("[data-jobs-hint]");
    if (existing) existing.remove();
    var hint = document.createElement("p");
    hint.className = "jobs-hint";
    hint.setAttribute("data-jobs-hint", "");
    hint.setAttribute("role", "status");
    hint.textContent = message;
    var intro = shellRoot.querySelector(".jobs-intro") || shellRoot;
    intro.appendChild(hint);
    window.setTimeout(function () {
      if (hint.parentNode) hint.parentNode.removeChild(hint);
    }, 4500);
  }

  function updateFilterChrome(root, companyId, location, source, count) {
    var select = root.querySelector("[data-jobs-company]");
    var locInput = root.querySelector("[data-jobs-location]");
    var sourceSelect = root.querySelector("[data-jobs-source]");
    var clearBtn = root.querySelector("[data-jobs-clear]");
    var banner = root.querySelector("[data-jobs-filter-banner]");
    var countEl = root.querySelector("[data-jobs-count]");

    if (select && select.value !== (companyId || "")) {
      select.value = companyId || "";
    }
    if (locInput && document.activeElement !== locInput) {
      locInput.value = location || "";
    }
    if (sourceSelect && sourceSelect.value !== (source || "")) {
      sourceSelect.value = source || "";
    }
    if (clearBtn) {
      clearBtn.hidden = !(companyId || location || source);
    }
    if (banner) {
      var parts = [];
      if (companyId) parts.push("company “" + companyName(companyId) + "”");
      if (location) parts.push("near “" + location + "”");
      if (source) parts.push("source " + sourceLabel(source));
      if (source === "indeed" || source === "linkedin") parts.push("remote jobs only");
      if (parts.length) {
        banner.hidden = false;
        banner.textContent = "Showing openings for " + parts.join(" · ");
      } else {
        banner.hidden = true;
        banner.textContent = "";
      }
    }
    if (countEl) {
      if (typeof count === "string") {
        countEl.textContent = count;
      } else {
        var n = typeof count === "number" ? count : 0;
        countEl.textContent = n === 1 ? "1 opening" : n + " openings";
      }
    }
  }

  function docsLink(url) {
    if (typeof url !== "string") return null;
    var ok =
      url.indexOf("https://docs.indeed.com/") === 0 ||
      url.indexOf("https://learn.microsoft.com/en-us/linkedin/") === 0;
    if (!ok) return null;
    var a = document.createElement("a");
    a.className = "jobs-source-status__docs";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Official docs";
    return a;
  }

  function mountIndeedPlugin(section, plugin) {
    var A = adapters();
    var allowed = A && A.INDEED_PLUGIN_SCRIPT;
    if (!plugin || !allowed || plugin.scriptUrl !== allowed) return;
    var attrs = plugin.attributes || {};
    if (attrs["data-indeed-search-where"] !== "Remote") return;
    var mount = document.createElement("div");
    mount.className = "jobs-indeed-plugin";
    Object.keys(attrs).forEach(function (key) {
      if (key.indexOf("data-indeed-") !== 0) return;
      mount.setAttribute(key, String(attrs[key]));
    });
    section.appendChild(mount);
    var existing = document.querySelector("script[data-indeed-plugin-script]");
    if (existing) existing.remove();
    var script = document.createElement("script");
    script.src = allowed;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-indeed-plugin-script", "");
    script.addEventListener("error", function () {
      var note = document.createElement("p");
      note.className = "jobs-source-status__detail";
      note.textContent = "Indeed’s plugin did not load. No listings were added in its place.";
      section.appendChild(note);
    });
    document.head.appendChild(script);
  }

  function renderFeed(feed) {
    var source = feed && feed.source ? feed.source : "";
    var section = document.createElement("section");
    section.className =
      "jobs-source-status jobs-source-status--" +
      String((feed && feed.mode) || "error").replace(/[^a-z_]/g, "");
    section.setAttribute("data-jobs-remote-source", source);
    section.setAttribute("role", "status");

    var title = document.createElement("h4");
    title.className = "jobs-source-status__title";
    title.textContent = sourceLabel(source) + " · remote";
    section.appendChild(title);

    var detail = document.createElement("p");
    detail.className = "jobs-source-status__detail";
    detail.textContent = (feed && feed.message) || "Not configured.";
    section.appendChild(detail);

    if (feed && feed.mode === "not_configured" && feed.missing && feed.missing.length) {
      var keys = document.createElement("p");
      keys.className = "jobs-source-status__keys";
      keys.textContent = "Cloudflare Pages env still needed: " + feed.missing.join(", ") + ".";
      section.appendChild(keys);
    }
    if (feed && feed.rejected && feed.rejected.length) {
      var rejected = document.createElement("p");
      rejected.className = "jobs-source-status__keys";
      rejected.textContent = "Set, but not usable (value not shown): " + feed.rejected.join(", ") + ".";
      section.appendChild(rejected);
    }
    var link = docsLink(feed && feed.docs);
    if (link) section.appendChild(link);

    if (feed && feed.mode === "plugin") mountIndeedPlugin(section, feed.plugin);

    var jobs = feed && Array.isArray(feed.jobs) ? feed.jobs : [];
    if (feed && feed.mode === "listings" && jobs.length) {
      var list = document.createElement("ul");
      list.className = "jobs-list";
      jobs.forEach(function (job) {
        var li = document.createElement("li");
        li.className = "jobs-card jobs-card--external";
        li.setAttribute("data-job-id", job.id || "");
        li.setAttribute("data-jobs-source", job.source || source);
        li.innerHTML =
          '<div class="jobs-card-row"><strong class="jobs-card-title">' +
          escapeHtml(job.title) +
          "</strong>" +
          '<span class="jobs-chip jobs-chip--remote">Remote</span>' +
          '<span class="jobs-chip jobs-chip--source">' +
          escapeHtml(sourceLabel(job.source || source)) +
          "</span></div>" +
          '<p class="jobs-card-company">' +
          escapeHtml(job.companyName || sourceLabel(source)) +
          "</p>" +
          (job.blurb ? '<p class="jobs-card-blurb">' + escapeHtml(job.blurb) + "</p>" : "") +
          '<p class="jobs-card-meta"><span class="jobs-location">' +
          escapeHtml(job.location || "Remote") +
          "</span></p>" +
          '<div class="jobs-card-actions"><a class="jobs-apply-btn jobs-apply-btn--external" href="' +
          escapeHtml(job.url) +
          '" target="_blank" rel="noopener noreferrer">View on ' +
          escapeHtml(sourceLabel(job.source || source)) +
          "</a></div>";
        list.appendChild(li);
      });
      section.appendChild(list);
    }
    return section;
  }

  function paintRemote(feeds, showRemote) {
    if (!shellRoot) return;
    var remoteEl = shellRoot.querySelector("[data-jobs-remote]");
    if (!remoteEl) return;
    remoteEl.hidden = !showRemote;
    remoteEl.replaceChildren();
    if (!showRemote) return;
    (feeds || []).forEach(function (feed) {
      remoteEl.appendChild(renderFeed(feed));
    });
  }

  function listingCount(feeds) {
    var n = 0;
    (feeds || []).forEach(function (feed) {
      if (feed && feed.mode === "listings" && Array.isArray(feed.jobs)) n += feed.jobs.length;
    });
    return n;
  }

  function gatherJobs(companyId, location, source) {
    var src = (source || "").trim().toLowerCase();
    var wantWm = !src || src === "waymakers";
    var wantIndeed = !src || src === "indeed";
    var wantLi = !src || src === "linkedin";
    var A = adapters();
    var companyLabel = companyId ? companyName(companyId) : "";
    var externalOpts = {
      location: (location || "").trim(),
      query: companyLabel,
    };

    var waymakers = wantWm
      ? filterWaymakersJobs(companyId, location).map(function (j) {
          return Object.assign({}, j, { source: j.source || "waymakers" });
        })
      : [];

    var indeedP = wantIndeed
      ? A && A.searchIndeed
        ? A.searchIndeed(externalOpts)
        : Promise.resolve(null)
      : Promise.resolve(null);
    var linkedinP = wantLi
      ? A && A.searchLinkedIn
        ? A.searchLinkedIn(externalOpts)
        : Promise.resolve(null)
      : Promise.resolve(null);

    return Promise.all([indeedP, linkedinP]).then(function (pair) {
      var feeds = [];
      if (wantIndeed) feeds.push(pair[0]);
      if (wantLi) feeds.push(pair[1]);
      return { waymakers: waymakers, feeds: feeds.filter(Boolean) };
    });
  }

  function applyFilter(companyId, opts) {
    opts = opts || {};
    activeFilter = (companyId || "").trim();
    if (typeof opts.location === "string") activeLocation = opts.location.trim();
    if (typeof opts.source === "string") {
      activeSource = opts.source.trim().toLowerCase();
    }
    if (!shellRoot) return;

    var token = ++loadToken;
    updateFilterChrome(
      shellRoot,
      activeFilter,
      activeLocation,
      activeSource,
      "Loading…"
    );

    var results = shellRoot.querySelector("[data-jobs-results]");
    var empty = shellRoot.querySelector("[data-jobs-empty]");
    var remoteEl = shellRoot.querySelector("[data-jobs-remote]");
    var localHeading = shellRoot.querySelector("[data-jobs-local-heading]");
    if (localHeading) localHeading.hidden = true;
    if (remoteEl) {
      remoteEl.replaceChildren();
      if (activeSource === "waymakers") {
        remoteEl.hidden = true;
      } else {
        remoteEl.hidden = false;
        var checking = document.createElement("p");
        checking.className = "jobs-loading";
        checking.setAttribute("role", "status");
        checking.textContent =
          activeSource === "linkedin"
            ? "Checking LinkedIn…"
            : activeSource === "indeed"
              ? "Checking Indeed…"
              : "Checking Indeed and LinkedIn…";
        remoteEl.appendChild(checking);
      }
    }
    if (results) {
      results.innerHTML =
        '<p class="jobs-loading" role="status">Loading openings…</p>';
      results.hidden = false;
    }
    if (empty) empty.hidden = true;

    gatherJobs(activeFilter, activeLocation, activeSource).then(function (
      payload
    ) {
      if (token !== loadToken || !shellRoot) return;
      var jobs = (payload && payload.waymakers) || [];
      var feeds = (payload && payload.feeds) || [];
      var showRemote = activeSource !== "waymakers";
      var showLocal = activeSource !== "indeed" && activeSource !== "linkedin";
      paintRemote(feeds, showRemote);
      var localHeading = shellRoot.querySelector("[data-jobs-local-heading]");
      if (localHeading) {
        localHeading.hidden = !(showLocal && showRemote && jobs.length);
      }
      var visible = showLocal ? jobs : [];
      var openingCount = visible.length + listingCount(feeds);
      var pluginLive = feeds.some(function (feed) {
        return feed && feed.mode === "plugin";
      });
      var partnerBlocked = feeds.some(function (feed) {
        return feed && feed.mode === "partner_blocked";
      });
      var notConfigured = feeds.some(function (feed) {
        return !feed || feed.mode === "not_configured" || feed.mode === "error";
      });
      var countLabel = openingCount === 1 ? "1 opening" : openingCount + " openings";
      if (openingCount === 0 && pluginLive && !partnerBlocked && !notConfigured) {
        countLabel = "Indeed remote search loaded";
      } else if (openingCount === 0 && !showLocal && partnerBlocked && !notConfigured) {
        countLabel = "Remote listings unavailable";
      } else if (openingCount === 0 && !showLocal && !pluginLive) {
        countLabel = "Remote feeds not configured";
      }
      updateFilterChrome(
        shellRoot,
        activeFilter,
        activeLocation,
        activeSource,
        countLabel
      );
      if (results && empty) {
        if (!showLocal) {
          results.innerHTML = "";
          results.hidden = true;
          empty.hidden = true;
        } else {
          renderJobs(results, empty, visible, activeFilter);
        }
      }
    });

    if (opts.updateHash !== false) setHashForFilter(activeFilter);
  }

  function switchToJobsTab() {
    var tab = document.getElementById("tab-jobs");
    if (tab) tab.click();
  }

  /**
   * Pages → Jobs: open JOBS tab filtered to this company.
   */
  function filterByCompany(companyId) {
    switchToJobsTab();
    applyFilter(companyId, {
      updateHash: true,
      location: activeLocation,
      source: activeSource,
    });
  }

  function clearFilter() {
    activeLocation = "";
    activeSource = "";
    if (shellRoot) {
      var locInput = shellRoot.querySelector("[data-jobs-location]");
      var sourceSelect = shellRoot.querySelector("[data-jobs-source]");
      if (locInput) locInput.value = "";
      if (sourceSelect) sourceSelect.value = "";
    }
    applyFilter("", { updateHash: true, location: "", source: "" });
  }

  function readChromeFilters(root) {
    var locInput = root.querySelector("[data-jobs-location]");
    var sourceSelect = root.querySelector("[data-jobs-source]");
    return {
      location: locInput ? locInput.value.trim() : activeLocation,
      source: sourceSelect ? sourceSelect.value.trim() : activeSource,
    };
  }

  function renderShell(root) {
    shellRoot = root;
    var select = root.querySelector("[data-jobs-company]");
    var clearBtn = root.querySelector("[data-jobs-clear]");
    var locInput = root.querySelector("[data-jobs-location]");
    var sourceSelect = root.querySelector("[data-jobs-source]");
    if (!select) return;

    var fromHash = parseHashCompany();
    buildCompanySelect(select, fromHash || activeFilter);

    if (locInput && !locInput.value && !activeLocation) {
      locInput.placeholder = "City, region, or zip (e.g. " + defaultLocation() + ")";
    }
    if (locInput && activeLocation) locInput.value = activeLocation;
    if (sourceSelect && activeSource) sourceSelect.value = activeSource;

    select.addEventListener("change", function () {
      var chrome = readChromeFilters(root);
      applyFilter(select.value, {
        updateHash: true,
        location: chrome.location,
        source: chrome.source,
      });
    });

    if (locInput) {
      var locTimer = null;
      function onLocChange() {
        window.clearTimeout(locTimer);
        locTimer = window.setTimeout(function () {
          var chrome = readChromeFilters(root);
          applyFilter(activeFilter, {
            updateHash: false,
            location: chrome.location,
            source: chrome.source,
          });
        }, 280);
      }
      locInput.addEventListener("input", onLocChange);
      locInput.addEventListener("change", onLocChange);
    }

    if (sourceSelect) {
      sourceSelect.addEventListener("change", function () {
        var chrome = readChromeFilters(root);
        applyFilter(activeFilter, {
          updateHash: false,
          location: chrome.location,
          source: chrome.source,
        });
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearFilter();
      });
    }

    applyFilter(fromHash || activeFilter, {
      updateHash: !!fromHash,
      location: activeLocation,
      source: activeSource,
    });
  }

  function onHashChange() {
    var h = (location.hash || "").replace(/^#/, "");
    if (h.indexOf("jobs") !== 0) return;
    var id = parseHashCompany();
    switchToJobsTab();
    applyFilter(id, {
      updateHash: false,
      location: activeLocation,
      source: activeSource,
    });
  }

  function boot() {
    document.querySelectorAll("[data-jobs-shell]").forEach(renderShell);
    window.addEventListener("hashchange", onHashChange);
    /* Deep-link on load */
    if ((location.hash || "").replace(/^#/, "").indexOf("jobs") === 0) {
      onHashChange();
    }
  }

  window.WaymakersJobs = {
    filterByCompany: filterByCompany,
    clearFilter: clearFilter,
    getFilter: function () {
      return activeFilter;
    },
    getLocation: function () {
      return activeLocation;
    },
    getSource: function () {
      return activeSource;
    },
    list: function () {
      return DEMO_JOBS.slice();
    },
    DEMO: DEMO_JOBS,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
