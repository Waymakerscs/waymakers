/**
 * Shared company identity for WELL (company/provider UI) ↔ JOBS (applicant board)
 * ↔ PAGES (local directory). Same companyId/slug links the three surfaces.
 *
 * Roles stay distinct:
 * - WELL — company/provider workspace (charts, roster, clinic ops)
 * - JOBS — where applicants browse and apply
 * - PAGES — public directory of what’s available locally
 */
(function () {
  "use strict";

  /**
   * @typedef {Object} Company
   * @property {string} id - stable slug (companyId)
   * @property {string} name - display name
   * @property {boolean} [offersWell] - company uses WELL as provider UI
   * @property {string} [neighborhood]
   * @property {string} [category] - Pages-style category hint
   */

  /** @type {Company[]} */
  var COMPANIES = [
    {
      id: "hyde-park-family-medicine",
      name: "Hyde Park Family Medicine",
      offersWell: true,
      neighborhood: "Hyde Park",
      category: "Doctor",
    },
    {
      id: "heartland-internal-medicine",
      name: "Heartland Internal Medicine",
      offersWell: true,
      neighborhood: "Streeterville",
      category: "Doctor",
    },
    {
      id: "bronzeville-family-dentistry",
      name: "Bronzeville Family Dentistry",
      offersWell: false,
      neighborhood: "Bronzeville",
      category: "Dentist",
    },
    {
      id: "milwaukee-ave-grill",
      name: "Milwaukee Ave Grill",
      offersWell: false,
      neighborhood: "Wicker Park",
      category: "Restaurant",
    },
    {
      id: "clark-street-cafe",
      name: "Clark Street Café",
      offersWell: false,
      neighborhood: "Andersonville",
      category: "Café",
    },
  ];

  var byId = {};
  COMPANIES.forEach(function (c) {
    byId[c.id] = c;
  });

  function getCompany(id) {
    if (!id) return null;
    return byId[String(id)] || null;
  }

  function listCompanies() {
    return COMPANIES.slice();
  }

  function wellCompanies() {
    return COMPANIES.filter(function (c) {
      return !!c.offersWell;
    });
  }

  window.WaymakersCompanies = {
    list: listCompanies,
    get: getCompany,
    wellCompanies: wellCompanies,
    DEMO: COMPANIES,
  };
})();
