/**
 * JOBS — applicant-facing openings board.
 *
 * Posts are keyed by companyId (shared with WELL companies that use the service
 * and with PAGES directory listings). Filter via select, hash (#jobs/<companyId>),
 * or WaymakersJobs.filterByCompany(id) from Pages “View jobs” links.
 *
 * Not a company workspace (that’s WELL) and not a directory (that’s PAGES).
 */
(function () {
  "use strict";

  var DEMO_JOBS = [
    {
      id: "j-hpfm-ma",
      companyId: "hyde-park-family-medicine",
      title: "Medical Assistant",
      type: "Full-time",
      location: "Hyde Park, Chicago",
      blurb: "Room patients, vitals, and chart prep in our WELL-connected clinic.",
      posted: "2026-09-12",
    },
    {
      id: "j-hpfm-front",
      companyId: "hyde-park-family-medicine",
      title: "Front Desk Coordinator",
      type: "Full-time",
      location: "Hyde Park, Chicago",
      blurb: "Schedule visits, verify insurance, and greet patients.",
      posted: "2026-09-18",
    },
    {
      id: "j-heart-rn",
      companyId: "heartland-internal-medicine",
      title: "Registered Nurse — Ambulatory",
      type: "Full-time",
      location: "Streeterville, Chicago",
      blurb: "Triage, care coordination, and telehealth support for internal medicine.",
      posted: "2026-09-10",
    },
    {
      id: "j-heart-bill",
      companyId: "heartland-internal-medicine",
      title: "Billing Specialist",
      type: "Part-time",
      location: "Streeterville / hybrid",
      blurb: "Claims follow-up and patient statements for a growing practice.",
      posted: "2026-09-20",
    },
    {
      id: "j-bronze-hygienist",
      companyId: "bronzeville-family-dentistry",
      title: "Dental Hygienist",
      type: "Full-time",
      location: "Bronzeville, Chicago",
      blurb: "Cleanings, patient education, and digital charting.",
      posted: "2026-09-08",
    },
    {
      id: "j-grill-cook",
      companyId: "milwaukee-ave-grill",
      title: "Line Cook",
      type: "Full-time",
      location: "Wicker Park, Chicago",
      blurb: "Weekend nights preferred · burgers, grill, and expo support.",
      posted: "2026-09-22",
    },
    {
      id: "j-grill-server",
      companyId: "milwaukee-ave-grill",
      title: "Server",
      type: "Part-time",
      location: "Wicker Park, Chicago",
      blurb: "Evenings and brunch · tips pooled.",
      posted: "2026-09-15",
    },
    {
      id: "j-clark-barista",
      companyId: "clark-street-cafe",
      title: "Barista",
      type: "Part-time",
      location: "Andersonville, Chicago",
      blurb: "Pour-overs, pastry case, and friendly neighborhood service.",
      posted: "2026-09-14",
    },
  ];

  var activeFilter = "";
  var shellRoot = null;

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function filterJobs(companyId) {
    var id = (companyId || "").trim();
    if (!id) return DEMO_JOBS.slice();
    return DEMO_JOBS.filter(function (j) {
      return j.companyId === id;
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
      li.className = "jobs-card";
      li.setAttribute("data-job-id", job.id);
      li.setAttribute("data-company-id", job.companyId);
      li.innerHTML =
        '<div class="jobs-card-row">' +
        '<strong class="jobs-card-title">' +
        escapeHtml(job.title) +
        "</strong>" +
        '<span class="jobs-chip">' +
        escapeHtml(job.type) +
        "</span>" +
        "</div>" +
        '<p class="jobs-card-company">' +
        escapeHtml(companyName(job.companyId)) +
        "</p>" +
        '<p class="jobs-card-blurb">' +
        escapeHtml(job.blurb) +
        "</p>" +
        '<p class="jobs-card-meta">' +
        '<span class="jobs-location">' +
        escapeHtml(job.location) +
        "</span>" +
        '<span class="jobs-posted">Posted ' +
        escapeHtml(job.posted) +
        "</span>" +
        "</p>" +
        '<div class="jobs-card-actions">' +
        '<button type="button" class="jobs-apply-btn" data-jobs-apply="' +
        escapeHtml(job.id) +
        '">Apply</button>' +
        "</div>";
      ul.appendChild(li);
    });

    container.appendChild(ul);

    container.querySelectorAll("[data-jobs-apply]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-jobs-apply");
        var job = DEMO_JOBS.filter(function (j) {
          return j.id === id;
        })[0];
        var name = job ? job.title + " @ " + companyName(job.companyId) : "this role";
        showApplyHint("Demo only — application for “" + name + "” is not live yet.");
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

  function updateFilterChrome(root, companyId) {
    var select = root.querySelector("[data-jobs-company]");
    var clearBtn = root.querySelector("[data-jobs-clear]");
    var banner = root.querySelector("[data-jobs-filter-banner]");
    var countEl = root.querySelector("[data-jobs-count]");
    if (select && select.value !== (companyId || "")) {
      select.value = companyId || "";
    }
    if (clearBtn) clearBtn.hidden = !companyId;
    if (banner) {
      if (companyId) {
        banner.hidden = false;
        banner.textContent = "Showing openings for " + companyName(companyId);
      } else {
        banner.hidden = true;
        banner.textContent = "";
      }
    }
    if (countEl) {
      var n = filterJobs(companyId).length;
      countEl.textContent = n === 1 ? "1 opening" : n + " openings";
    }
  }

  function applyFilter(companyId, opts) {
    opts = opts || {};
    activeFilter = (companyId || "").trim();
    if (!shellRoot) return;
    updateFilterChrome(shellRoot, activeFilter);
    var results = shellRoot.querySelector("[data-jobs-results]");
    var empty = shellRoot.querySelector("[data-jobs-empty]");
    if (results && empty) {
      renderJobs(results, empty, filterJobs(activeFilter), activeFilter);
    }
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
    applyFilter(companyId, { updateHash: true });
  }

  function clearFilter() {
    applyFilter("", { updateHash: true });
  }

  function renderShell(root) {
    shellRoot = root;
    var select = root.querySelector("[data-jobs-company]");
    var clearBtn = root.querySelector("[data-jobs-clear]");
    if (!select) return;

    var fromHash = parseHashCompany();
    buildCompanySelect(select, fromHash || activeFilter);

    select.addEventListener("change", function () {
      applyFilter(select.value, { updateHash: true });
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearFilter();
      });
    }

    applyFilter(fromHash || activeFilter, { updateHash: !!fromHash });
  }

  function onHashChange() {
    var h = (location.hash || "").replace(/^#/, "");
    if (h.indexOf("jobs") !== 0) return;
    var id = parseHashCompany();
    switchToJobsTab();
    applyFilter(id, { updateHash: false });
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
