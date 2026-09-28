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

    /**
     * WELL demo step-up. Non-secret flag — not a password and not an OTP.
     * true: the visitor may open the local demo chart after acknowledging
     *       it is not production auth and not HIPAA.
     * false: the chart stays locked (clinical sign-in is not live).
     * No demo password or one-time code is shipped in static assets.
     */
    well: {
      demoUnlock: true,
    },
  });
  window.WAYMAKERSConfig = next;
  // Keep CognationConfig alias so older client modules keep working.
  window.CognationConfig = next;
})();
