/* Public browser configuration for WAYMAKERS (separate from Cognation). */
(function () {
  "use strict";

  var next = Object.assign({}, window.WAYMAKERSConfig || window.CognationConfig || {}, {
    supabaseUrl: "https://gjrxweezprhiosqewiah.supabase.co",
    supabasePublishableKey: "sb_publishable_e2RscJkopr3yxC0mqa9GfQ_bSmNq-c9",

    /**
     * CAREER board. Partner secrets are not stored here.
     * Cloudflare Pages env (functions/api/jobs.js): INDEED_PARTNER_APP_ID,
     * INDEED_PLACEMENT_ID, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET,
     * LINKEDIN_ACCESS_TOKEN. Missing keys fail closed. See .dev.vars.example.
     */
    jobs: {
      defaultLocation: "Chicago, IL",
      /** CAREER always calls this path. There is no deep-link fallback. */
      useApiProxy: true,
      apiProxyPath: "/api/jobs",
    },
  });
  window.WAYMAKERSConfig = next;
  // Keep CognationConfig alias so older client modules keep working.
  window.CognationConfig = next;
})();
