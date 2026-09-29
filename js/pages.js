/**
 * PAGES — WAYMAKERS Yellow Pages.
 *
 * Live listings come from GET /api/pages (Cloudflare Pages Function), which
 * calls Google Places. This file never calls Google and never holds an API key.
 * The key name is documented in functions/README.md.
 *
 * Without the key, the Function fails closed: empty results and a
 * "not configured" message. The Chicago sample catalog is not a stand-in
 * for nearby. It loads only for ?pagesDemo=1, still requires this device's
 * location, and still stays inside 25 miles — so an Oklahoma device does not
 * see Chicago samples. Site demo unlock (?demo=1) does not open that catalog.
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

  /**
   * Approximate coordinates for storefront listings so distance uses the
   * device position. Listings without a public street have no point and
   * are not treated as "nearby" anywhere. This is not a viewer fallback.
   */
  var LISTING_LATLNG = {
    "Ashland Avenue Barber Co.": [41.9205, -87.6684],
    "Belmont Pet Emporium": [41.9416, -87.6512],
    "Bridgeport Bloom Florist": [41.8384, -87.6478],
    "Bronzeville Family Dentistry": [41.8096, -87.6142],
    "Clark Street Café": [41.9804, -87.6685],
    "Hyde Park Family Medicine — Dr. Maya Chen": [41.7996, -87.5886],
    "Hyde Park Pediatric Care": [41.7953, -87.5889],
    "Irving Park Auto Works": [41.9536, -87.7268],
    "Kedzie Kids Daycare": [41.9274, -87.7068],
    "Lakeview Legal Group": [41.9382, -87.6639],
    "Milwaukee Ave Grill": [41.9094, -87.6765],
    "Northside Nail & Paw Groomer": [41.9632, -87.6794],
    "Oak Street Orthodontics": [41.9008, -87.6264],
    "Pilsen Pasta House": [41.8572, -87.6662],
    "Queen of Sheba Café": [41.9655, -87.6576],
    "Roscoe Village Veterinary Grooming": [41.9432, -87.6824],
    "Taylor Street Barber Shop": [41.8694, -87.6572],
    "Violet & Vine Florist": [41.8843, -87.6518],
    "Western Avenue Auto Clinic": [41.969, -87.6888],
    "Albany Park Family Law": [41.9686, -87.7102],
    "Cicero Court Café": [41.799, -87.7436],
    "Dunning Daycare Nest": [41.9534, -87.7892],
    "Foster Pet Supply": [41.9568, -87.6854],
    "Heartland Internal Medicine": [41.8939, -87.6204],
    "Old Town Italian Kitchen": [41.9106, -87.6344],
    "Portage Park Barbers": [41.9548, -87.7476],
    "Wicker Park Wellness MD": [41.9108, -87.6776],
  };

  DEMO_LISTINGS.forEach(function (item) {
    var pair = LISTING_LATLNG[item.name];
    if (!pair) return;
    item.lat = pair[0];
    item.lng = pair[1];
  });

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  function placesApi() {
    if (typeof window !== "undefined" && window.WaymakersPagesPlaces) {
      return window.WaymakersPagesPlaces;
    }
    if (typeof globalThis !== "undefined" && globalThis.WaymakersPagesPlaces) {
      return globalThis.WaymakersPagesPlaces;
    }
    return null;
  }

  function pageSearch() {
    try {
      if (typeof location !== "undefined" && location && typeof location.search === "string") {
        return location.search;
      }
    } catch (e) {}
    return "";
  }

  function pageSession() {
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage) return sessionStorage;
    } catch (e) {}
    return null;
  }

  function demoGateOn() {
    var places = placesApi();
    if (!places || typeof places.isDemoEnabled !== "function") return false;
    return places.isDemoEnabled(pageSearch(), pageSession());
  }

  function syncDemoGate() {
    var places = placesApi();
    if (!places || typeof places.persistDemoGate !== "function") return;
    places.persistDemoGate(pageSearch(), pageSession());
  }

  function fetchPagesPayload(lat, lng, query, category) {
    var places = placesApi();
    var url = places
      ? places.buildPagesUrl(lat, lng, query, category)
      : "/api/pages?lat=" + encodeURIComponent(lat) + "&lng=" + encodeURIComponent(lng);
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (res) {
      return res.json().catch(function () {
        return null;
      }).then(function (body) {
        if (!body || typeof body !== "object") {
          if (res.status === 404) {
            return { ok: false, configured: false, mode: "unconfigured", listings: [] };
          }
          return { ok: false, configured: true, mode: "error", listings: [] };
        }
        return body;
      });
    }).catch(function () {
      return { ok: false, configured: true, mode: "error", listings: [] };
    });
  }

  /**
   * @param {string} category
   * @param {string} query
   * @param {{ok?:boolean, lat?:number, lng?:number, reason?:string}|null} userLocation
   * @returns {Promise<{mode:string, listings:Array, located:boolean, showRetry:boolean, message:string, footer:string}>}
   */
  function loadPagesView(category, query, userLocation) {
    var places = placesApi();
    var nearby = nearbyApi();
    var demoOn = demoGateOn();
    var radius = nearby && nearby.RADIUS_MILES ? nearby.RADIUS_MILES : 25;

    if (!userLocation || userLocation.ok !== true) {
      var pending = nearby
        ? nearby.nearbyResult([], userLocation)
        : {
            listings: [],
            located: false,
            showRetry: true,
            message:
              "Location is unavailable. Turn on location services for this browser and try again. Waymakers will not show a default city.",
          };
      return Promise.resolve({
        mode: "location",
        listings: [],
        located: false,
        showRetry: pending.showRetry,
        message: pending.message,
        footer: demoOn ? "demo" : "idle",
      });
    }

    if (demoOn) {
      var samples = filterDemoListings(category, query).map(function (item) {
        var copy = {};
        Object.keys(item).forEach(function (key) {
          copy[key] = item[key];
        });
        copy.source = "demo";
        return copy;
      });
      var demoView = nearby
        ? nearby.nearbyResult(samples, userLocation)
        : { listings: [], radiusMiles: radius };
      return Promise.resolve({
        mode: "demo",
        listings: demoView.listings || [],
        located: true,
        showRetry: false,
        message: places
          ? places.demoMessage((demoView.listings || []).length, demoView.radiusMiles || radius)
          : "Demo catalog only — not live Google Places.",
        footer: "demo",
      });
    }

    if (!places) {
      return Promise.resolve({
        mode: "unconfigured",
        listings: [],
        located: true,
        showRetry: false,
        message:
          "Google Places is not configured. Waymakers will not show demo listings as businesses near you.",
        footer: "unconfigured",
      });
    }

    return fetchPagesPayload(userLocation.lat, userLocation.lng, query, category).then(function (payload) {
      var source = places.selectPagesSource({
        demoEnabled: false,
        payload: payload,
        demoListings: DEMO_LISTINGS,
      });
      if (source.mode !== "places") {
        return {
          mode: source.mode,
          listings: [],
          located: true,
          showRetry: false,
          message: source.message,
          footer: source.mode === "unconfigured" ? "unconfigured" : "error",
        };
      }
      var live = nearby
        ? nearby.nearbyResult(source.listings, userLocation)
        : { listings: source.listings, message: source.message, radiusMiles: radius };
      return {
        mode: "places",
        listings: live.listings || [],
        located: true,
        showRetry: false,
        message: live.message || source.message,
        footer: "places",
      };
    });
  }

  function fetchPagesListings(category, query, location) {
    var loc = location || null;
    if (loc && loc.ok !== true && isFinite(loc.lat) && isFinite(loc.lng)) {
      loc = { ok: true, lat: loc.lat, lng: loc.lng };
    }
    return loadPagesView(category, query, loc).then(function (view) {
      return view.listings || [];
    });
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

  function listingDirectionsHref(item, userAgent) {
    var api = directionsApi();
    if (!api || typeof api.directionsHrefForListing !== "function") return "";
    var ua = userAgent;
    if (ua == null && typeof navigator !== "undefined") ua = navigator.userAgent;
    return api.directionsHrefForListing(item, ua);
  }

  function nearbyApi() {
    if (typeof window !== "undefined" && window.WaymakersPagesNearby) {
      return window.WaymakersPagesNearby;
    }
    if (typeof globalThis !== "undefined" && globalThis.WaymakersPagesNearby) {
      return globalThis.WaymakersPagesNearby;
    }
    return null;
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
        "Turn-by-turn directions to " + (item.name || "this business")
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
        if (item.source) li.setAttribute("data-pages-source", item.source);
        var addressText = listingAddressText(item);
        var addressHtml = addressText
          ? '<span class="pages-address">' + escapeHtml(addressText) + "</span>"
          : "";
        var distanceHtml = "";
        if (typeof item.distanceMiles === "number" && isFinite(item.distanceMiles)) {
          var milesLabel =
            item.distanceMiles < 10
              ? item.distanceMiles.toFixed(1)
              : String(Math.round(item.distanceMiles));
          distanceHtml =
            '<span class="pages-distance">' + escapeHtml(milesLabel) + " mi</span>";
        }
        var phoneDigits = String(item.phone || "").replace(/[^\d+]/g, "");
        var phoneHtml = phoneDigits
          ? '<a class="pages-phone" href="tel:' +
            escapeHtml(phoneDigits) +
            '">' +
            escapeHtml(item.phone) +
            "</a>"
          : "";
        var neighborhoodHtml = item.neighborhood
          ? '<span class="pages-neighborhood">' + escapeHtml(item.neighborhood) + "</span>"
          : "";
        var blurbHtml = item.blurb
          ? '<p class="pages-listing-blurb">' + escapeHtml(item.blurb) + "</p>"
          : "";
        li.innerHTML =
          '<div class="pages-listing-row">' +
          '<span class="pages-chip">' +
          escapeHtml(item.category || "Local") +
          "</span>" +
          '<strong class="pages-listing-name">' +
          escapeHtml(item.name) +
          "</strong>" +
          "</div>" +
          blurbHtml +
          '<p class="pages-listing-meta">' +
          phoneHtml +
          addressHtml +
          distanceHtml +
          neighborhoodHtml +
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

    var locationBox = root.querySelector("[data-pages-location]");
    var locationMessage = root.querySelector("[data-pages-location-message]");
    var locationRetry = root.querySelector("[data-pages-location-retry]");
    var footer = root.querySelector("[data-pages-footer]");
    var userLocation = null;
    var requestSeq = 0;
    var searchTimer = null;

    buildCategoryOptions(category);
    if (az) buildAzBar(az, {});
    syncDemoGate();

    function showLocation(view) {
      if (locationMessage) locationMessage.textContent = view.message || "";
      if (locationBox) {
        locationBox.hidden = !view.message;
        locationBox.classList.toggle("pages-location--demo", view.footer === "demo");
        locationBox.classList.toggle("pages-location--unconfigured", view.footer === "unconfigured");
        locationBox.setAttribute("data-pages-location-state", view.mode || "");
      }
      if (locationRetry) locationRetry.hidden = !view.showRetry;
      if (footer) {
        var places = placesApi();
        footer.textContent = places ? places.footerText(view.footer) : footer.textContent;
      }
    }

    function paint(view) {
      showLocation(view);
      var shown = view.listings || [];
      if (!view.located || !shown.length) {
        results.innerHTML = "";
        results.hidden = true;
        empty.hidden = true;
        if (countEl) countEl.textContent = "";
        if (az) buildAzBar(az, {});
        return;
      }
      if (countEl) {
        countEl.textContent = shown.length === 1 ? "1 listing" : shown.length + " listings";
      }
      renderListings(results, empty, shown);
    }

    function refresh() {
      var seq = ++requestSeq;
      var cat = category.value;
      var q = search.value;
      loadPagesView(cat, q, userLocation).then(function (view) {
        if (seq !== requestSeq) return;
        paint(view);
      });
    }

    function askLocation() {
      userLocation = null;
      refresh();
      var geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
      if (!geo || typeof geo.getCurrentPosition !== "function") {
        userLocation = { ok: false, reason: "unavailable" };
        refresh();
        return;
      }
      geo.getCurrentPosition(
        function (pos) {
          var coords = pos && pos.coords;
          if (!coords || !isFinite(coords.latitude) || !isFinite(coords.longitude)) {
            userLocation = { ok: false, reason: "unavailable" };
          } else {
            userLocation = { ok: true, lat: coords.latitude, lng: coords.longitude };
          }
          refresh();
        },
        function (err) {
          var reason = "unavailable";
          if (err && err.code === 1) reason = "denied";
          else if (err && err.code === 3) reason = "timeout";
          userLocation = { ok: false, reason: reason };
          refresh();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }

    search.addEventListener("input", function () {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(refresh, 250);
    });
    category.addEventListener("change", function () {
      if (searchTimer) clearTimeout(searchTimer);
      refresh();
    });
    if (locationRetry) locationRetry.addEventListener("click", askLocation);
    askLocation();
  }

  function boot() {
    document.querySelectorAll("[data-pages-shell]").forEach(renderPages);
  }

  var root = typeof window !== "undefined" ? window : globalThis;
  root.fetchPagesListings = fetchPagesListings;
  root.CognationPagesDemo = DEMO_LISTINGS;
  root.WaymakersPages = {
    directionsHref: listingDirectionsHref,
    loadPagesView: loadPagesView,
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
