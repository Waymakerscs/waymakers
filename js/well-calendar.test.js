/**
 * Slot math for the WELL scheduling demo.
 * Run: node js/well-calendar.test.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var context = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  JSON: JSON,
  Math: Math,
  Number: Number,
  String: String,
  parseInt: parseInt,
  isNaN: isNaN,
  Object: Object,
  Array: Array,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "well.js"), "utf8"), context, {
  filename: "js/well.js",
});

var cal = context.CognationWellCalendar;
if (!cal || typeof cal.firstAvailableSlots !== "function") {
  throw new Error("CognationWellCalendar did not load");
}

var failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL " + msg);
  } else {
    console.log("ok   " + msg);
  }
}

function portal(extraAppts) {
  return {
    patient: {
      name: "Alexa J. Thomas",
      preferredClinic: "Hyde Park Family Medicine",
      pcp: "Dr. Maya Chen, MD",
    },
    provider: { name: "Dr. Maya Chen, MD", clinic: "Hyde Park Family Medicine" },
    appointments: [
      {
        id: "a5",
        when: "2026-10-02 14:00",
        patientId: "p1",
        patientName: "Alexa J. Thomas",
        where: "Lab · Streeterville",
        reason: "Fasting labs",
      },
    ].concat(extraAppts || []),
    prefs: {},
  };
}

var evening = new Date(2026, 8, 28, 20, 30, 0); /* Mon Sep 28 2026 */
var data = portal();
var open = cal.firstAvailableSlots(data, { now: evening, count: 4 });
assert(open.length === 4, "four open slots");
assert(open[0].date === "2026-09-29" && open[0].time === "09:00", "next slot is Tue 9:00 when Outlook is off");
assert(
  open.every(function (s) {
    return s.time !== "12:00" && s.time !== "12:30";
  }),
  "lunch is not offered"
);

cal.connectCalendar(data, "patient", "outlook");
assert(cal.outlookConnected(data, "patient"), "patient Outlook connected");
var patientBusy = cal.firstAvailableSlots(data, { now: evening, count: 4 });
assert(
  patientBusy[0].date === "2026-09-29" && patientBusy[0].time === "10:30",
  "patient Outlook blocks 9:00–10:30 so first slot is 10:30"
);
assert(
  patientBusy.every(function (s) {
    return !(s.date === "2026-09-29" && (s.time === "09:00" || s.time === "09:30" || s.time === "10:00" || s.time === "13:00" || s.time === "13:30"));
  }),
  "patient personal holds are skipped"
);

cal.disconnectCalendar(data, "patient");
assert(!cal.outlookConnected(data, "patient"), "disconnect clears patient Outlook");
var restored = cal.firstAvailableSlots(data, { now: evening, count: 1 });
assert(restored[0].time === "09:00", "disconnect restores the 9:00 slot");

var providerOnly = portal();
cal.connectCalendar(providerOnly, "provider", "outlook");
var prov = cal.firstAvailableSlots(providerOnly, { now: evening, count: 4 });
assert(prov[0].time === "10:00", "provider Outlook rounds block 9:00–10:00");
assert(
  prov.every(function (s) {
    return !(s.date === "2026-09-29" && (s.time === "14:00" || s.time === "14:30"));
  }),
  "provider admin block removes 2:00 and 2:30"
);

var both = portal();
cal.connectCalendar(both, "patient", "outlook");
cal.connectCalendar(both, "provider", "outlook");
var merged = cal.firstAvailableSlots(both, { now: evening, count: 4 });
assert(merged[0].time === "10:30", "both calendars union to 10:30");
assert(merged[3].time === "15:00", "afternoon opens again at 3:00 after both holds");

var fridayNight = new Date(2026, 8, 25, 18, 0, 0); /* Fri Sep 25 2026 */
var weekend = cal.firstAvailableSlots(portal(), { now: fridayNight, count: 1 });
assert(weekend[0].date === "2026-09-28" && weekend[0].time === "09:00", "Friday evening skips the weekend");

var labDay = new Date(2026, 9, 2, 13, 45, 0); /* Fri Oct 2 2026 1:45 PM */
var afterLabs = cal.firstAvailableSlots(portal(), { now: labDay, count: 1 });
assert(
  afterLabs[0].date === "2026-10-02" && afterLabs[0].time === "14:30",
  "existing 2:00 PM labs appointment blocks that slot"
);

var google = cal.connectCalendar(portal(), "google", "google");
assert(google.ok === false, "Google connect stays unavailable");
assert(cal.CalendarAdapters.apple.available === false, "Apple calendar is a stub");
assert(typeof cal.CalendarAdapters.outlook.listBusy === "function", "Outlook adapter exposes listBusy");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all scheduling checks passed");
