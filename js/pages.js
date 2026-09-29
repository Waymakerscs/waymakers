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
   * Optional: address — street address shown on the card. Directions links
   *   only when that string is a usable destination (see pages-directions.js).
   * Optional: companyId — shared slug with JOBS posts (and WELL when offersWell).
   *
   * PAGES is the local directory of what’s available. Listings with a companyId
   * get a “View jobs” link into the JOBS tab filtered to that company.
   * Tower / Commune / widgets are not wired here.
   */
  var DEMO_LISTINGS = [
    { name: "Ashland Avenue Barber Co.", category: "Barber", blurb: "Classic cuts, hot towel shaves, walk-ins welcome.", phone: "(773) 555-0142", neighborhood: "Lincoln Park", address: "2100 N Ashland Ave, Chicago, IL 60614" },
    { name: "Belmont Pet Emporium", category: "Pet store", blurb: "Food, toys, and weekend adoption events.", phone: "(773) 555-0198", neighborhood: "Lakeview", address: "3254 N Clark St, Chicago, IL 60657" },
    { name: "Bridgeport Bloom Florist", category: "Florist", blurb: "Same-day bouquets and funeral arrangements.", phone: "(312) 555-0177", neighborhood: "Bridgeport", address: "845 W 31st St, Chicago, IL 60608" },
    { name: "Bronzeville Family Dentistry", category: "Dentist", blurb: "Cleanings, crowns, and gentle care for kids.", phone: "(773) 555-0114", neighborhood: "Bronzeville", companyId: "bronzeville-family-dentistry", address: "447 E 47th St, Chicago, IL 60653" },
    { name: "Clark Street Café", category: "Café", blurb: "Pour-overs, pastries, neighborhood Wi-Fi.", phone: "(312) 555-0160", neighborhood: "Andersonville", companyId: "clark-street-cafe", address: "5411 N Clark St, Chicago, IL 60640" },
    { name: "Devon Spark Electric", category: "Electrician", blurb: "Panel upgrades, outlets, ceiling fans, licensed.", phone: "(773) 555-0133", neighborhood: "West Ridge" },
    { name: "Edgewater Handyman Pros", category: "Handyman", blurb: "Mounts, drywall, odd jobs — evenings OK.", phone: "(773) 555-0181", neighborhood: "Edgewater", address: "By appointment" },
    { name: "Garfield Park Landscaping", category: "Landscaper", blurb: "Mow, mulch, seasonal cleanups, small yards.", phone: "(773) 555-0125", neighborhood: "Garfield Park" },
    { name: "Halsted House Cleaners", category: "House cleaner", blurb: "Weekly/biweekly deep cleans, eco supplies.", phone: "(312) 555-0190", neighborhood: "Lincoln Square" },
    { name: "Hyde Park Family Medicine — Dr. Maya Chen", category: "Doctor", blurb: "WELL company · primary care, annual wellness, same-week sick slots.", phone: "(773) 555-0155", neighborhood: "Hyde Park", companyId: "hyde-park-family-medicine", address: "1525 E 53rd St, Chicago, IL 60615" },
    { name: "Hyde Park Pediatric Care", category: "Doctor", blurb: "Well-child visits and same-week sick slots.", phone: "(773) 555-0156", neighborhood: "Hyde Park", address: "1510 E 55th St, Chicago, IL 60615" },
    { name: "Irving Park Auto Works", category: "Auto repair", blurb: "Brakes, oil, diagnostics — honest estimates.", phone: "(773) 555-0108", neighborhood: "Irving Park", address: "3954 W Irving Park Rd, Chicago, IL 60618" },
    { name: "Jefferson Park Plumbing", category: "Plumber", blurb: "Clogs, water heaters, emergency call-outs.", phone: "(773) 555-0149", neighborhood: "Jefferson Park" },
    { name: "Kedzie Kids Daycare", category: "Daycare", blurb: "Ages 2–5, outdoor yard, CPR-certified staff.", phone: "(773) 555-0172", neighborhood: "Logan Square", address: "2556 N Kedzie Ave, Chicago, IL 60647" },
    { name: "Lakeview Legal Group", category: "Lawyer", blurb: "Wills, landlord-tenant, small claims help.", phone: "(312) 555-0119", neighborhood: "Lakeview", address: "3101 N Southport Ave, Chicago, IL 60657" },
    { name: "Milwaukee Ave Grill", category: "Restaurant", blurb: "Burgers, shakes, late kitchen on weekends.", phone: "(773) 555-0166", neighborhood: "Wicker Park", companyId: "milwaukee-ave-grill", address: "1554 N Milwaukee Ave, Chicago, IL 60622" },
    { name: "Northside Nail & Paw Groomer", category: "Groomer", blurb: "Dogs & cats, gentle baths, nail trims.", phone: "(773) 555-0138", neighborhood: "Ravenswood", address: "4501 N Damen Ave, Chicago, IL 60625" },
    { name: "Oak Street Orthodontics", category: "Dentist", blurb: "Braces and clear aligners for teens & adults.", phone: "(312) 555-0184", neighborhood: "Near North", address: "100 E Oak St, Chicago, IL 60611" },
    { name: "Pilsen Pasta House", category: "Restaurant", blurb: "Handmade pasta, red-sauce classics, patio.", phone: "(312) 555-0121", neighborhood: "Pilsen", address: "1848 S Ashland Ave, Chicago, IL 60608" },
    { name: "Queen of Sheba Café", category: "Café", blurb: "Ethiopian coffee ceremony & light bites.", phone: "(773) 555-0152", neighborhood: "Uptown", address: "4608 N Broadway, Chicago, IL 60640" },
    { name: "Roscoe Village Veterinary Grooming", category: "Groomer", blurb: "Full-service groom next door to the clinic.", phone: "(773) 555-0194", neighborhood: "Roscoe Village", address: "2156 W Roscoe St, Chicago, IL 60618" },
    { name: "South Loop Sparkle Clean", category: "House cleaner", blurb: "Condo specialists, move-in/out packages.", phone: "(312) 555-0103", neighborhood: "South Loop" },
    { name: "Taylor Street Barber Shop", category: "Barber", blurb: "Fades, beard lineups, old-school chairs.", phone: "(312) 555-0175", neighborhood: "Little Italy", address: "1134 W Taylor St, Chicago, IL 60607" },
    { name: "Ukrainian Village Electric Co.", category: "Electrician", blurb: "Rewires, EV chargers, code corrections.", phone: "(773) 555-0144", neighborhood: "Ukrainian Village" },
    { name: "Violet & Vine Florist", category: "Florist", blurb: "Wedding work and weekly office arrangements.", phone: "(312) 555-0188", neighborhood: "West Loop", address: "1000 W Randolph St, Chicago, IL 60607" },
    { name: "Western Avenue Auto Clinic", category: "Auto repair", blurb: "Tires, alignments, state inspections.", phone: "(773) 555-0111", neighborhood: "Lincoln Square", address: "4800 N Western Ave, Chicago, IL 60625" },
    { name: "Albany Park Family Law", category: "Lawyer", blurb: "Divorce mediation and custody paperwork.", phone: "(773) 555-0169", neighborhood: "Albany Park", address: "3300 W Lawrence Ave, Chicago, IL 60625" },
    { name: "Back of the Yards Plumbing", category: "Plumber", blurb: "Sewer cameras, sump pumps, re-pipes.", phone: "(773) 555-0128", neighborhood: "Back of the Yards" },
    { name: "Cicero Court Café", category: "Café", blurb: "Breakfast burritos and strong drip coffee.", phone: "(773) 555-0158", neighborhood: "Archer Heights", address: "5156 S Cicero Ave, Chicago, IL 60632" },
    { name: "Dunning Daycare Nest", category: "Daycare", blurb: "Infant through pre-K, bilingual staff.", phone: "(773) 555-0191", neighborhood: "Dunning", address: "6448 W Irving Park Rd, Chicago, IL 60634" },
    { name: "Elsie's Evergreen Landscaping", category: "Landscaper", blurb: "Native plantings and patio beds.", phone: "(773) 555-0136", neighborhood: "Evergreen Park" },
    { name: "Foster Pet Supply", category: "Pet store", blurb: "Bulk food, aquariums, local rescue board.", phone: "(773) 555-0106", neighborhood: "North Center", address: "4120 N Lincoln Ave, Chicago, IL 60618" },
    { name: "Grand Crossing Handyman", category: "Handyman", blurb: "Fences, painting, appliance hookups.", phone: "(773) 555-0179", neighborhood: "Greater Grand Crossing" },
    { name: "Heartland Internal Medicine", category: "Doctor", blurb: "WELL company · primary care, labs on-site, telehealth.", phone: "(312) 555-0147", neighborhood: "Streeterville", companyId: "heartland-internal-medicine", address: "233 E Erie St, Chicago, IL 60611" },
    { name: "Montrose Electric & Lighting", category: "Electrician", blurb: "Track lighting and kitchen remodels.", phone: "(773) 555-0123", neighborhood: "Ravenswood" },
    { name: "Norridge Neighborhood Cleaners", category: "House cleaner", blurb: "Housekeeping for busy families.", phone: "(708) 555-0182", neighborhood: "Norridge" },
    { name: "Old Town Italian Kitchen", category: "Restaurant", blurb: "Thin crust, family tables, cash welcome.", phone: "(312) 555-0150", neighborhood: "Old Town", address: "1542 N Wells St, Chicago, IL 60610" },
    { name: "Portage Park Barbers", category: "Barber", blurb: "Kids' first cuts and senior discounts.", phone: "(773) 555-0163", neighborhood: "Portage Park", address: "4042 N Cicero Ave, Chicago, IL 60641" },
    { name: "Rogers Park Pipe Pros", category: "Plumber", blurb: "Frozen pipes, fixture swaps, fair rates.", phone: "(773) 555-0117", neighborhood: "Rogers Park" },
    { name: "South Shore Pet Spa", category: "Groomer", blurb: "Mobile van grooming by appointment.", phone: "(773) 555-0186", neighborhood: "South Shore", address: "Mobile van" },
    { name: "Wicker Park Wellness MD", category: "Doctor", blurb: "Walk-in clinic for colds and physicals.", phone: "(773) 555-0140", neighborhood: "Wicker Park", address: "1608 N Milwaukee Ave, Chicago, IL 60622" },
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
        (item.address || "") +
        " " +
        (item.phone || "") +
        " " +
        (item.companyId || "")
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


  function listingCompanyId(item) {
    if (!item) return "";
    return String(item.companyId || "").trim();
  }

  function hasJobsLink(item) {
    return !!listingCompanyId(item);
  }

  function switchMainTab(tabId) {
    var tab = document.getElementById(tabId);
    if (tab) tab.click();
  }

  function goToCompanyJobs(companyId) {
    if (!companyId) return;
    if (window.WaymakersJobs && typeof window.WaymakersJobs.filterByCompany === "function") {
      window.WaymakersJobs.filterByCompany(companyId);
      return;
    }
    location.hash = "jobs/" + encodeURIComponent(companyId);
    switchMainTab("tab-jobs");
  }

  function listingAddressText(item) {
    if (!item || item.address == null) return "";
    return String(item.address).replace(/\s+/g, " ").trim();
  }

  function directionsApi() {
    if (typeof window !== "undefined" && window.WaymakersPagesDirections) {
      return window.WaymakersPagesDirections;
    }
    if (typeof globalThis !== "undefined" && globalThis.WaymakersPagesDirections) {
      return globalThis.WaymakersPagesDirections;
    }
    return null;
  }

  function listingDirectionsHref(item) {
    var api = directionsApi();
    if (!api || typeof api.directionsHrefForListing !== "function") return "";
    return api.directionsHrefForListing(item);
  }

  function appendListingActions(li, item) {
    var companyId = listingCompanyId(item);
    var directionsHref = listingDirectionsHref(item);
    if (!companyId && !directionsHref) return;

    var actions = document.createElement("div");
    actions.className = "pages-listing-actions";

    if (directionsHref) {
      var directions = document.createElement("a");
      directions.className = "pages-directions-link";
      directions.href = directionsHref;
      directions.textContent = "Directions";
      directions.setAttribute("data-pages-directions", "");
      directions.setAttribute(
        "aria-label",
        "Directions to " + (item.name || "this business") + " in Apple Maps"
      );
      actions.appendChild(directions);
    }

    if (companyId) {
      var jobsLink = document.createElement("a");
      jobsLink.className = "pages-jobs-link";
      jobsLink.href = "#jobs/" + encodeURIComponent(companyId);
      jobsLink.textContent = "View jobs";
      jobsLink.setAttribute("data-pages-jobs", companyId);
      jobsLink.setAttribute(
        "aria-label",
        "View jobs for " + (item.name || "this company")
      );
      jobsLink.addEventListener("click", function (e) {
        e.preventDefault();
        goToCompanyJobs(companyId);
      });
      actions.appendChild(jobsLink);
    }

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
        if (hasJobsLink(item)) li.classList.add("pages-listing--has-jobs");
        var addressText = listingAddressText(item);
        var addressHtml = addressText
          ? '<span class="pages-address">' + escapeHtml(addressText) + "</span>"
          : "";
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
          addressHtml +
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

  var root = typeof window !== "undefined" ? window : globalThis;
  root.fetchPagesListings = fetchPagesListings;
  root.CognationPagesDemo = DEMO_LISTINGS;
  root.WaymakersPages = {
    directionsHref: listingDirectionsHref,
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
