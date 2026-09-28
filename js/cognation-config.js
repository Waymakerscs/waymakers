/* Public browser configuration for WAYMAKERS (separate from Cognation). */
(function () {
  "use strict";

  var next = Object.assign({}, window.WAYMAKERSConfig || window.CognationConfig || {}, {
    supabaseUrl: "https://gjrxweezprhiosqewiah.supabase.co",
    supabasePublishableKey: "sb_publishable_e2RscJkopr3yxC0mqa9GfQ_bSmNq-c9",
  });
  window.WAYMAKERSConfig = next;
  // Keep CognationConfig alias so older client modules keep working.
  window.CognationConfig = next;
})();
