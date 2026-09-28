/* Public browser configuration for WAYMAKERS (separate from Cognation). */
(function () {
  "use strict";

  var next = Object.assign({}, window.WAYMAKERSConfig || window.CognationConfig || {}, {
    supabaseUrl: "https://gjrxweezprhiosqewiah.supabase.co",
    supabasePublishableKey: "sb_publishable_e2RscJkopr3yxC0mqa9GfQ_bSmNq-c9",

    /**
     * JOBS board — public IDs only in the client.
     * Secrets (Indeed API keys, LinkedIn client secrets / tokens) belong in
     * Cloudflare Pages env vars consumed by functions/api/jobs.js.
     */
    jobs: {
      defaultLocation: "Chicago, IL",
      /** When true, adapters try GET /api/jobs before falling back to deep-links. */
      useApiProxy: false,
      apiProxyPath: "/api/jobs",
      indeed: {
        /** Public Publisher / affiliate id only — leave empty until you have one. */
        publisherId: "",
        publicId: "",
        enabled: false,
      },
      linkedin: {
        /**
         * LinkedIn Jobs API is partner-gated. Flip partnerConfigured + enabled
         * only after Cloudflare env has LINKEDIN_* secrets and the proxy is wired.
         */
        partnerConfigured: false,
        enabled: false,
      },
    },
  });
  window.WAYMAKERSConfig = next;
  // Keep CognationConfig alias so older client modules keep working.
  window.CognationConfig = next;
})();
