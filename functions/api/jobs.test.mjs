/**
 * Run: node functions/api/jobs.test.mjs
 */
import assert from "node:assert/strict";
import { onRequestGet } from "./jobs.js";
import { listingsFromPartnerRows } from "../lib/jobs-sources.js";

const INDEED_SECRET = "unit-test-indeed-api-key-do-not-leak";
const LINKEDIN_SECRET = "unit-test-linkedin-client-secret-do-not-leak";
const LINKEDIN_TOKEN = "unit-test-linkedin-access-token-do-not-leak";

function get(path, env) {
  return onRequestGet({
    request: new Request("https://waymakers.pages.dev" + path),
    env: env || {},
  });
}

async function read(res) {
  return { status: res.status, headers: res.headers, body: await res.json(), text: "" };
}

async function readRaw(res) {
  const text = await res.clone().text();
  return { status: res.status, headers: res.headers, body: JSON.parse(text), text: text };
}

const indeedMissing = await read(await get("/api/jobs?source=indeed&q=nurse&location=Chicago&remote=0"));
assert.equal(indeedMissing.status, 200);
assert.equal(indeedMissing.body.ok, false);
assert.equal(indeedMissing.body.mode, "not_configured");
assert.equal(indeedMissing.body.remote, true);
assert.deepEqual(indeedMissing.body.jobs, []);
assert.deepEqual(indeedMissing.body.missing, ["INDEED_PARTNER_APP_ID", "INDEED_PLACEMENT_ID"]);
assert.equal(indeedMissing.body.query.searchWhere, "Remote");
assert.equal(indeedMissing.body.query.searchWhat, "nurse Chicago");
assert.equal(indeedMissing.headers.get("cache-control"), "no-store");
assert.equal(indeedMissing.body.plugin, undefined);

const indeedLegacy = await readRaw(
  await get("/api/jobs?source=indeed", {
    INDEED_PUBLISHER_ID: "pub-123",
    INDEED_API_KEY: INDEED_SECRET,
  })
);
assert.equal(indeedLegacy.body.mode, "not_configured");
assert.deepEqual(indeedLegacy.body.jobs, []);
assert.equal(indeedLegacy.text.includes(INDEED_SECRET), false);
assert.match(indeedLegacy.body.message, /INDEED_PUBLISHER_ID and INDEED_API_KEY are ignored/);
assert.equal(indeedLegacy.body.notUsed.retiredPublisherSearch.includes("INDEED_API_KEY"), true);

const indeedPlugin = await readRaw(
  await get("/api/jobs?source=indeed&q=nurse&location=Remote&remote=0", {
    INDEED_PARTNER_APP_ID: "partner-app-1",
    INDEED_PLACEMENT_ID: "placement-9",
    INDEED_API_KEY: INDEED_SECRET,
    LINKEDIN_CLIENT_SECRET: LINKEDIN_SECRET,
  })
);
assert.equal(indeedPlugin.status, 200);
assert.equal(indeedPlugin.body.ok, true);
assert.equal(indeedPlugin.body.mode, "plugin");
assert.deepEqual(indeedPlugin.body.jobs, []);
assert.equal(indeedPlugin.body.query.searchWhere, "Remote");
assert.equal(indeedPlugin.body.query.searchWhat, "nurse");
assert.equal(
  indeedPlugin.body.plugin.scriptUrl,
  "https://plugins.indeed.com/publisher-plugin/main.js"
);
assert.equal(indeedPlugin.body.plugin.attributes["data-indeed-search-where"], "Remote");
assert.equal(indeedPlugin.body.plugin.attributes["data-indeed-plugin-type"], "job-search");
assert.equal(indeedPlugin.body.plugin.attributes["data-indeed-partner-app-id"], "partner-app-1");
assert.equal(indeedPlugin.body.plugin.attributes["data-indeed-search-what"], "nurse");
assert.equal(indeedPlugin.text.includes(INDEED_SECRET), false);
assert.equal(indeedPlugin.text.includes(LINKEDIN_SECRET), false);
assert.equal(indeedPlugin.headers.get("cache-control"), "private, max-age=60");

const indeedBad = await readRaw(
  await get("/api/jobs?source=indeed", {
    INDEED_PARTNER_APP_ID: "bad id " + INDEED_SECRET,
    INDEED_PLACEMENT_ID: "placement-9",
  })
);
assert.equal(indeedBad.body.mode, "not_configured");
assert.deepEqual(indeedBad.body.rejected, ["INDEED_PARTNER_APP_ID"]);
assert.equal(indeedBad.body.plugin, undefined);
assert.equal(indeedBad.text.includes(INDEED_SECRET), false);

const linkedinMissing = await read(await get("/api/jobs?source=linkedin&q=rn&location=Illinois"));
assert.equal(linkedinMissing.body.mode, "not_configured");
assert.equal(linkedinMissing.body.remote, true);
assert.deepEqual(linkedinMissing.body.jobs, []);
assert.deepEqual(linkedinMissing.body.query.workplaceTypes, ["Remote"]);
assert.deepEqual(linkedinMissing.body.missing, [
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "LINKEDIN_ACCESS_TOKEN",
]);
assert.equal(linkedinMissing.body.acceptingNewJobPostingPartners, false);

const linkedinPartial = await read(
  await get("/api/jobs?source=linkedin", { LINKEDIN_CLIENT_ID: "client-only" })
);
assert.equal(linkedinPartial.body.mode, "not_configured");
assert.deepEqual(linkedinPartial.body.missing, [
  "LINKEDIN_CLIENT_SECRET",
  "LINKEDIN_ACCESS_TOKEN",
]);

const linkedinBlocked = await readRaw(
  await get("/api/jobs?source=linkedin&q=care", {
    LINKEDIN_CLIENT_ID: "client-1",
    LINKEDIN_CLIENT_SECRET: LINKEDIN_SECRET,
  })
);
assert.equal(linkedinBlocked.status, 200);
assert.equal(linkedinBlocked.body.ok, false);
assert.equal(linkedinBlocked.body.mode, "partner_blocked");
assert.equal(linkedinBlocked.body.credentialsPresent, true);
assert.deepEqual(linkedinBlocked.body.jobs, []);
assert.equal(linkedinBlocked.body.query.workplaceTypes[0], "Remote");
assert.equal(linkedinBlocked.text.includes(LINKEDIN_SECRET), false);
assert.equal(linkedinBlocked.text.includes("client-1"), false);

const linkedinToken = await readRaw(
  await get("/api/jobs?source=linkedin", { LINKEDIN_ACCESS_TOKEN: LINKEDIN_TOKEN })
);
assert.equal(linkedinToken.body.mode, "partner_blocked");
assert.deepEqual(linkedinToken.body.jobs, []);
assert.equal(linkedinToken.text.includes(LINKEDIN_TOKEN), false);

const unknown = await read(await get("/api/jobs?source=adzuna"));
assert.equal(unknown.status, 400);
assert.equal(unknown.body.mode, "error");
assert.deepEqual(unknown.body.jobs, []);

const rows = listingsFromPartnerRows(
  [
    {
      id: "ok",
      title: "Care coordinator",
      url: "https://www.linkedin.com/jobs/view/1",
      remote: true,
      companyName: "North Clinic",
      workplaceTypes: ["Remote"],
    },
    {
      title: "Hybrid nurse",
      url: "https://www.indeed.com/viewjob?jk=abc",
      remote: true,
      workplace: "Hybrid",
    },
    {
      title: "Office nurse",
      url: "https://www.indeed.com/viewjob?jk=def",
      workplaceTypes: ["On-site"],
    },
    { title: "No url", remote: true },
    { title: "Insecure", url: "http://example.com/job", remote: true },
  ],
  "linkedin"
);
assert.equal(rows.length, 1);
assert.equal(rows[0].id, "ok");
assert.equal(rows[0].remote, true);
assert.equal(rows[0].source, "linkedin");

console.log("jobs api tests passed");
