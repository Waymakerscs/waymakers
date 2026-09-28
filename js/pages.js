/**
 * PAGES — Cognation Yellow Pages (local business directory).
 *
 * Demo seed data only. Live Google Places / Maps needs a free backend later
 * (same constraint as Nationwide news — do NOT call paid Google APIs from the client).
 *
 * Swap path: implement fetchPagesListings(category, query) against your backend;
 * renderPages() already consumes that Promise.
 */
(function () {
  "use strict";

  var CATEGORIES = [
    "All categories",
    "Auto repair",
    "Barber",
    "Café",
    "Daycare",
    "Dentist",
    "Doctor",
    "Electrician",
    "Florist",
    "Groomer",
    "Handyman",
    "House cleaner",
    "Landscaper",
    "Lawyer",
    "Pet store",
    "Plumber",
    "Restaurant",
  ];

  /**
   * Chicago-area flavored fictional/demo listings.
   * Fields: name, category, blurb, phone, neighborhood
   * Optional claim fields: towerHandle, towerClaimed
   *
   * Listings learn Tower identity only via an explicit claim/handle link
   * (towerHandle and/or towerClaimed: true) — never by guessing from
   * Doctor/Dentist category or inventing handles for every provider.
   * Unclaimed rows show phone/neighborhood only (no Tower page, no IP call).
   */
  var DEMO_LISTINGS = [
    { name: "Ashland Avenue Barber Co.", category: "Barber", blurb: "Classic cuts, hot towel shaves, walk-ins welcome.", phone: "(773) 555-0142", neighborhood: "Lincoln Park" },
    { name: "Belmont Pet Emporium", category: "Pet store", blurb: "Food, toys, and weekend adoption events.", phone: "(773) 555-0198", neighborhood: "Lakeview" },
    { name: "Bridgeport Bloom Florist", category: "Florist", blurb: "Same-day bouquets and funeral arrangements.", phone: "(312) 555-0177", neighborhood: "Bridgeport" },
    { name: "Bronzeville Family Dentistry", category: "Dentist", blurb: "Cleanings, crowns, and gentle care for kids.", phone: "(773) 555-0114", neighborhood: "Bronzeville", towerHandle: "bronzeville-dds", towerClaimed: true },
    { name: "Clark Street Café", category: "Café", blurb: "Pour-overs, pastries, neighborhood Wi-Fi.", phone: "(312) 555-0160", neighborhood: "Andersonville" },
    { name: "Devon Spark Electric", category: "Electrician", blurb: "Panel upgrades, outlets, ceiling fans, licensed.", phone: "(773) 555-0133", neighborhood: "West Ridge" },
    { name: "Edgewater Handyman Pros", category: "Handyman", blurb: "Mounts, drywall, odd jobs — evenings OK.", phone: "(773) 555-0181", neighborhood: "Edgewater" },
    { name: "Garfield Park Landscaping", category: "Landscaper", blurb: "Mow, mulch, seasonal cleanups, small yards.", phone: "(773) 555-0125", neighborhood: "Garfield Park" },
    { name: "Halsted House Cleaners", category: "House cleaner", blurb: "Weekly/biweekly deep cleans, eco supplies.", phone: "(312) 555-0190", neighborhood: "Lincoln Square" },
    { name: "Hyde Park Family Medicine — Dr. Maya Chen", category: "Doctor", blurb: "WELL demo PCP · primary care, annual wellness, same-week sick slots.", phone: "(773) 555-0155", neighborhood: "Hyde Park", towerHandle: "maya-chen", towerClaimed: true },
    { name: "Hyde Park Pediatric Care", category: "Doctor", blurb: "Well-child visits and same-week sick slots.", phone: "(773) 555-0156", neighborhood: "Hyde Park" },
    { name: "Irving Park Auto Works", category: "Auto repair", blurb: "Brakes, oil, diagnostics — honest estimates.", phone: "(773) 555-0108", neighborhood: "Irving Park" },
    { name: "Jefferson Park Plumbing", category: "Plumber", blurb: "Clogs, water heaters, emergency call-outs.", phone: "(773) 555-0149", neighborhood: "Jefferson Park" },
    { name: "Kedzie Kids Daycare", category: "Daycare", blurb: "Ages 2–5, outdoor yard, CPR-certified staff.", phone: "(773) 555-0172", neighborhood: "Logan Square" },
    { name: "Lakeview Legal Group", category: "Lawyer", blurb: "Wills, landlord-tenant, small claims help.", phone: "(312) 555-0119", neighborhood: "Lakeview" },
    { name: "Milwaukee Ave Grill", category: "Restaurant", blurb: "Burgers, shakes, late kitchen on weekends.", phone: "(773) 555-0166", neighborhood: "Wicker Park" },
    { name: "Northside Nail & Paw Groomer", category: "Groomer", blurb: "Dogs & cats, gentle baths, nail trims.", phone: "(773) 555-0138", neighborhood: "Ravenswood" },
    { name: "Oak Street Orthodontics", category: "Dentist", blurb: "Braces and clear aligners for teens & adults.", phone: "(312) 555-0184", neighborhood: "Near North" },
    { name: "Pilsen Pasta House", category: "Restaurant", blurb: "Handmade pasta, red-sauce classics, patio.", phone: "(312) 555-0121", neighborhood: "Pilsen" },
    { name: "Queen of Sheba Café", category: "Café", blurb: "Ethiopian coffee ceremony & light bites.", phone: "(773) 555-0152", neighborhood: "Uptown" },
    { name: "Roscoe Village Veterinary Grooming", category: "Groomer", blurb: "Full-service groom next door to the clinic.", phone: "(773) 555-0194", neighborhood: "Roscoe Village" },
    { name: "South Loop Sparkle Clean", category: "House cleaner", blurb: "Condo specialists, move-in/out packages.", phone: "(312) 555-0103", neighborhood: "South Loop" },
    { name: "Taylor Street Barber Shop", category: "Barber", blurb: "Fades, beard lineups, old-school chairs.", phone: "(312) 555-0175", neighborhood: "Little Italy" },
    { name: "Ukrainian Village Electric Co.", category: "Electrician", blurb: "Rewires, EV chargers, code corrections.", phone: "(773) 555-0144", neighborhood: "Ukrainian Village" },
    { name: "Violet & Vine Florist", category: "Florist", blurb: "Wedding work and weekly office arrangements.", phone: "(312) 555-0188", neighborhood: "West Loop" },
    { name: "Western Avenue Auto Clinic", category: "Auto repair", blurb: "Tires, alignments, state inspections.", phone: "(773) 555-0111", neighborhood: "Lincoln Square" },
    { name: "Albany Park Family Law", category: "Lawyer", blurb: "Divorce mediation and custody paperwork.", phone: "(773) 555-0169", neighborhood: "Albany Park" },
    { name: "Back of the Yards Plumbing", category: "Plumber", blurb: "Sewer cameras, sump pumps, re-pipes.", phone: "(773) 555-0128", neighborhood: "Back of the Yards" },
    { name: "Cicero Court Café", category: "Café", blurb: "Breakfast burritos and strong drip coffee.", phone: "(773) 555-0158", neighborhood: "Archer Heights" },
    { name: "Dunning Daycare Nest", category: "Daycare", blurb: "Infant through pre-K, bilingual staff.", phone: "(773) 555-0191", neighborhood: "Dunning" },
    { name: "Elsie's Evergreen Landscaping", category: "Landscaper", blurb: "Native plantings and patio beds.", phone: "(773) 555-0136", neighborhood: "Evergreen Park" },
    { name: "Foster Pet Supply", category: "Pet store", blurb: "Bulk food, aquariums, local rescue board.", phone: "(773) 555-0106", neighborhood: "North Center" },
    { name: "Grand Crossing Handyman", category: "Handyman", blurb: "Fences, painting, appliance hookups.", phone: "(773) 555-0179", neighborhood: "Greater Grand Crossing" },
    { name: "Heartland Internal Medicine", category: "Doctor", blurb: "Primary care, labs on-site, telehealth.", phone: "(312) 555-0147", neighborhood: "Streeterville", towerHandle: "heartland-md", towerClaimed: true },
    { name: "Montrose Electric & Lighting", category: "Electrician", blurb: "Track lighting and kitchen remodels.", phone: "(773) 555-0123", neighborhood: "Ravenswood" },
    { name: "Norridge Neighborhood Cleaners", category: "House cleaner", blurb: "Housekeeping for busy families.", phone: "(708) 555-0182", neighborhood: "Norridge" },
    { name: "Old Town Italian Kitchen", category: "Restaurant", blurb: "Thin crust, family tables, cash welcome.", phone: "(312) 555-0150", neighborhood: "Old Town" },
    { name: "Portage Park Barbers", category: "Barber", blurb: "Kids' first cuts and senior discounts.", phone: "(773) 555-0163", neighborhood: "Portage Park" },
    { name: "Rogers Park Pipe Pros", category: "Plumber", blurb: "Frozen pipes, fixture swaps, fair rates.", phone: "(773) 555-0117", neighborhood: "Rogers Park" },
    { name: "South Shore Pet Spa", category: "Groomer", blurb: "Mobile van grooming by appointment.", phone: "(773) 555-0186", neighborhood: "South Shore" },
    { name: "Wicker Park Wellness MD", category: "Doctor", blurb: "Walk-in clinic for colds and physicals.", phone: "(773) 555-0140", neighborhood: "Wicker Park" },
  ];

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  /**
   * Stub for a later free Google Places / Maps backend.
   * TODO: live Google local fetch needs free backend later (do not call paid Google APIs from the browser).
   * @param {string} category - category filter or "All categories"
   * @param {string} query - name/keyword search
   * @returns {Promise<Array>}
   */
  function fetchPagesListings(category, query) {
    // Demo path — filter local seed. Replace body with fetch('/api/pages?...') when backend exists.
    return Promise.resolve(filterDemoListings(category, query));
  }

  function filterDemoListings(category, query) {
    var cat = (category || "All categories").trim();
    var q = (query || "").trim().toLowerCase();
    return DEMO_LISTINGS.filter(function (item) {
      if (cat && cat !== "All categories" && item.category !== cat) return false;
      if (!q) return true;
      var hay = (
        item.name +
        " " +
        item.category +
        " " +
        item.blurb +
        " " +
        item.neighborhood +
        " " +
        (item.phone || "") +
        " " +
        (item.towerHandle || "")
      ).toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice().sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }

  function letterOf(name) {
    var ch = (name || "").charAt(0).toUpperCase();
    return /[A-Z]/.test(ch) ? ch : "#";
  }

  function groupByLetter(listings) {
    var map = {};
    listings.forEach(function (item) {
      var L = letterOf(item.name);
      if (!map[L]) map[L] = [];
      map[L].push(item);
    });
    return map;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildCategoryOptions(select) {
    select.innerHTML = "";
    CATEGORIES.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
  }

  function buildAzBar(nav, presentLetters) {
    nav.innerHTML = "";
    LETTERS.forEach(function (L) {
      var a = document.createElement("a");
      a.href = "#pages-letter-" + L;
      a.className = "pages-az-link";
      a.textContent = L;
      a.setAttribute("data-pages-letter", L);
      if (!presentLetters[L]) {
        a.classList.add("is-disabled");
        a.setAttribute("aria-disabled", "true");
        a.tabIndex = -1;
      }
      a.addEventListener("click", function (e) {
        if (a.classList.contains("is-disabled")) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        var target = document.getElementById("pages-letter-" + L);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      nav.appendChild(a);
    });
  }


  /**
   * Claimed = explicit Cognation handle on the listing (provider claimed it).
   * Do not invent handles from category or business name.
   */
  function listingTowerHandle(item) {
    if (!item) return "";
    var h = (item.towerHandle || "").trim().toLowerCase();
    return h;
  }

  function isClaimedListing(item) {
    if (!item) return false;
    var handle = listingTowerHandle(item);
    if (!handle) return false;
    if (item.towerClaimed === false) return false;
    return true;
  }

  function switchMainTab(tabId) {
    var tab = document.getElementById(tabId);
    if (tab) tab.click();
  }

  function goToTowerProfile(handle) {
    if (!handle) return;
    var hash = "tower-profile-" + handle;
    switchMainTab("tab-tower");
    if (typeof window.CognationTowerApplySide === "function") {
      window.CognationTowerApplySide("public");
    }
    if (location.hash === "#" + hash) {
      window.setTimeout(function () {
        var el = document.getElementById(hash);
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else {
      location.hash = hash;
    }
  }

  function showPagesCallHint(message) {
    var existing = document.querySelector("[data-pages-call-hint]");
    if (existing) existing.remove();
    var hint = document.createElement("p");
    hint.className = "pages-call-hint";
    hint.setAttribute("data-pages-call-hint", "");
    hint.setAttribute("role", "status");
    hint.textContent = message;
    var shell = document.querySelector("[data-pages-shell]");
    if (shell) {
      var intro = shell.querySelector(".pages-intro") || shell;
      intro.appendChild(hint);
    } else {
      document.body.appendChild(hint);
    }
    window.setTimeout(function () {
      if (hint.parentNode) hint.parentNode.removeChild(hint);
    }, 4500);
  }

  function startProviderIpCall(item) {
    switchMainTab("tab-well");
    if (typeof window.CognationWellApplySide === "function") {
      window.CognationWellApplySide("patient");
    }
    var WC = window.CognationWellCall;
    if (WC && typeof WC.setActiveRole === "function" && typeof WC.startCall === "function") {
      WC.setActiveRole("patient");
      if (item && item.name) {
        try {
          WC.peerLabel = item.name;
        } catch (e) {}
      }
      WC.startCall();
      return;
    }
    showPagesCallHint("Open the WELL tab (Patient side) to place an IP call — WebRTC stack still loading.");
  }

  function appendListingActions(li, item) {
    /* Tower + Call only when the listing was claimed with a Cognation handle */
    if (!isClaimedListing(item)) return;
    var handle = listingTowerHandle(item);

    var actions = document.createElement("div");
    actions.className = "pages-listing-actions";

    var towerLink = document.createElement("a");
    towerLink.className = "pages-tower-link";
    towerLink.href = "#tower-profile-" + handle;
    towerLink.textContent = "Tower · @" + handle;
    towerLink.setAttribute("data-pages-tower", handle);
    towerLink.addEventListener("click", function (e) {
      e.preventDefault();
      goToTowerProfile(handle);
    });
    actions.appendChild(towerLink);

    var callBtn = document.createElement("button");
    callBtn.type = "button";
    callBtn.className = "pages-call-btn";
    callBtn.textContent = "Call via IP";
    callBtn.setAttribute("data-pages-call-ip", handle);
    callBtn.setAttribute("aria-label", "Call " + (item.name || "provider") + " via IP");
    callBtn.addEventListener("click", function () {
      startProviderIpCall(item);
    });
    actions.appendChild(callBtn);

    li.appendChild(actions);
  }

  function renderListings(container, emptyEl, listings) {
    container.innerHTML = "";
    if (!listings.length) {
      emptyEl.hidden = false;
      container.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    container.hidden = false;

    var groups = groupByLetter(listings);
    var present = {};
    LETTERS.forEach(function (L) {
      if (groups[L] && groups[L].length) present[L] = true;
    });
    if (groups["#"] && groups["#"].length) present["#"] = true;

    var az = container.closest("[data-pages-shell]");
    if (az) {
      var nav = az.querySelector("[data-pages-az]");
      if (nav) buildAzBar(nav, present);
    }

    var order = LETTERS.slice();
    if (groups["#"]) order.push("#");

    order.forEach(function (L) {
      var items = groups[L];
      if (!items || !items.length) return;

      var section = document.createElement("section");
      section.className = "pages-letter-section";
      section.id = "pages-letter-" + L;
      section.setAttribute("aria-labelledby", "pages-letter-heading-" + L);

      var h = document.createElement("h4");
      h.className = "pages-letter-heading";
      h.id = "pages-letter-heading-" + L;
      h.textContent = L;
      section.appendChild(h);

      var ul = document.createElement("ul");
      ul.className = "pages-listing-list";
      ul.setAttribute("aria-label", "Businesses starting with " + L);

      items.forEach(function (item) {
        var li = document.createElement("li");
        li.className = "pages-listing";
        if (isClaimedListing(item)) li.classList.add("pages-listing--claimed");
        li.innerHTML =
          '<div class="pages-listing-row">' +
          '<span class="pages-chip">' +
          escapeHtml(item.category) +
          "</span>" +
          '<strong class="pages-listing-name">' +
          escapeHtml(item.name) +
          "</strong>" +
          "</div>" +
          '<p class="pages-listing-blurb">' +
          escapeHtml(item.blurb) +
          "</p>" +
          '<p class="pages-listing-meta">' +
          '<a class="pages-phone" href="tel:' +
          escapeHtml(String(item.phone).replace(/[^\d+]/g, "")) +
          '">' +
          escapeHtml(item.phone) +
          "</a>" +
          '<span class="pages-neighborhood">' +
          escapeHtml(item.neighborhood) +
          "</span>" +
          "</p>";
        appendListingActions(li, item);
        ul.appendChild(li);
      });

      section.appendChild(ul);
      container.appendChild(section);
    });
  }

  function renderPages(root) {
    var search = root.querySelector("[data-pages-search]");
    var category = root.querySelector("[data-pages-category]");
    var results = root.querySelector("[data-pages-results]");
    var empty = root.querySelector("[data-pages-empty]");
    var countEl = root.querySelector("[data-pages-count]");
    var az = root.querySelector("[data-pages-az]");

    if (!search || !category || !results || !empty) return;

    buildCategoryOptions(category);
    if (az) buildAzBar(az, {});

    function refresh() {
      var cat = category.value;
      var q = search.value;
      fetchPagesListings(cat, q).then(function (listings) {
        if (countEl) {
          countEl.textContent =
            listings.length === 1
              ? "1 listing"
              : listings.length + " listings";
        }
        renderListings(results, empty, listings);
      });
    }

    search.addEventListener("input", refresh);
    category.addEventListener("change", refresh);
    refresh();
  }

  function boot() {
    document.querySelectorAll("[data-pages-shell]").forEach(renderPages);
  }

  window.fetchPagesListings = fetchPagesListings;
  window.CognationPagesDemo = DEMO_LISTINGS;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
