/**
 * WELL chart-flow v1.
 * Run: node js/well-chart-flow.test.js
 */
"use strict";

var assert = require("assert");
require("./well-chart-flow.js");
var flow = global.WellChartFlow;

function memoryStorage() {
  var bag = {};
  return {
    bag: bag,
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null;
    },
    setItem: function (key, value) {
      bag[key] = String(value);
    },
  };
}

function portal() {
  return {
    patient: { name: "Alexa J. Thomas", mrn: "CGN-DEMO-10482", dob: "1990-04-12" },
    chart: {
      vitals: { bpSys: "118", bpDia: "76", hr: "72" },
      meds: [{ name: "Lisinopril", dose: "10 mg", freq: "daily", notes: "" }],
      allergies: [{ substance: "Penicillin", reaction: "Rash", severity: "Moderate" }],
      intake: { chiefComplaint: "Annual wellness visit" },
      hpi: { narrative: "Sleeps well." },
      diagnoses: [{ code: "I10", description: "Essential hypertension", treated: false }],
      plan: { goals: "Maintain BP <130/80" },
    },
    releases: [
      { id: "rel-maya", clinicianId: "emp-maya", clinicianName: "Dr. Maya Chen, MD", at: "2026-09-01 09:00", by: "patient" },
    ],
    appointments: [
      { id: "a1", when: "2026-09-18 09:30", patientId: "p1", patientName: "Alexa J. Thomas", reason: "Annual wellness", clinicianId: "emp-maya" },
      { id: "a2", when: "2026-09-18 10:15", patientId: "p2", patientName: "Jordan Rivera", reason: "HTN follow-up", clinicianId: "emp-maya" },
    ],
  };
}

var storage = memoryStorage();
var seeded = flow.ensureSeed(storage);
assert.strictEqual(seeded.notes.length, 1);
assert.strictEqual(seeded.notes[0].appointmentId, "a1");
assert.strictEqual(seeded.notes[0].patientId, "p1");
assert.ok(!Object.prototype.hasOwnProperty.call(seeded.notes[0], "bpSys"));
assert.strictEqual(Object.keys(storage.bag).join(","), flow.SOAP_KEY);
flow.ensureSeed(storage);
assert.strictEqual(flow.readStore(storage).notes.length, 1, "seed is not duplicated");

var saved = flow.appendSoap(storage, {
  id: "soap-james-1",
  patientId: "p1",
  appointmentId: "a1",
  clinicianId: "emp-james",
  author: "Dr. James Okonkwo, DO",
  at: "2026-09-29 10:00",
  subjective: "Here for follow-up.",
  objective: "Lungs clear.",
  assessment: "Hypertension, controlled.",
  plan: "Continue current dose.",
});
assert.strictEqual(saved.ok, true);
assert.strictEqual(saved.store.notes.length, 2);
var rawSoap = JSON.parse(storage.bag[flow.SOAP_KEY]);
assert.strictEqual(rawSoap.notes[1].subjective, "Here for follow-up.");
assert.ok(!Object.prototype.hasOwnProperty.call(rawSoap.notes[1], "bpSys"));
assert.ok(!rawSoap.chart);
assert.ok(!rawSoap.phi);

var leaked = flow.appendSoap(storage, {
  id: "soap-bad",
  patientId: "p1",
  appointmentId: "a1",
  clinicianId: "emp-james",
  author: "Dr. James Okonkwo, DO",
  at: "2026-09-29 10:05",
  subjective: "Note",
  objective: "",
  assessment: "",
  plan: "",
  bpSys: "140",
  meds: [{ name: "Lisinopril" }],
});
assert.strictEqual(leaked.ok, false);
assert.match(leaked.reason, /PHI/);
assert.strictEqual(flow.readStore(storage).notes.length, 2, "rejected PHI is not stored");
assert.ok(storage.bag[flow.SOAP_KEY].indexOf("bpSys") < 0);
assert.ok(storage.bag[flow.SOAP_KEY].indexOf("Lisinopril") < 0);

var nested = flow.appendSoap(storage, {
  id: "soap-bad-2",
  patientId: "p1",
  appointmentId: "a1",
  subjective: { bpSys: "140" },
  objective: "",
  assessment: "",
  plan: "",
});
assert.strictEqual(nested.ok, false);
assert.strictEqual(flow.readStore(storage).notes.length, 2);

var dirty = {
  version: 1,
  notes: [
    {
      id: "kept",
      patientId: "p1",
      appointmentId: "a1",
      subjective: "Kept",
      objective: "",
      assessment: "",
      plan: "",
    },
    {
      id: "dropped",
      patientId: "p1",
      appointmentId: "a1",
      subjective: "Nope",
      bpDia: "90",
    },
  ],
};
storage.setItem(flow.SOAP_KEY, JSON.stringify(dirty));
var cleaned = flow.readStore(storage);
assert.strictEqual(cleaned.notes.length, 1);
assert.strictEqual(cleaned.notes[0].id, "kept");

var chart = portal();
var beforePhi = JSON.stringify(flow.phiSnapshot(chart));
var maya = flow.resolveVisitChart(chart, "a1", "emp-maya");
assert.strictEqual(maya.ok, true);
assert.strictEqual(maya.patientId, "p1", "patient comes from the visit");
assert.strictEqual(maya.phi.vitals.bpSys, "118");
assert.strictEqual(maya.appointment.reason, "Annual wellness");

var jamesBefore = flow.resolveVisitChart(chart, "a1", "emp-james");
assert.strictEqual(jamesBefore.ok, false);
assert.strictEqual(jamesBefore.reason, "not-released");
assert.strictEqual(jamesBefore.phi, null);
assert.strictEqual(chart.chart.vitals.bpSys, "118", "withholding a view does not empty the chart");

var jordan = flow.resolveVisitChart(chart, "a2", "emp-maya");
assert.strictEqual(jordan.ok, false);
assert.strictEqual(jordan.reason, "no-local-chart");
assert.strictEqual(jordan.patientId, "p2", "a different visit does not open Alexa's chart");
assert.strictEqual(chart.chart.meds[0].name, "Lisinopril");

var rosterOnly = flow.resolveVisitChart(chart, "p2", "emp-maya");
assert.strictEqual(rosterOnly.ok, false);
assert.strictEqual(rosterOnly.reason, "no-visit");

chart.chart.vitals.bpSys = "128";
chart.chart.vitals.bpDia = "82";
var released = flow.releaseChart(chart, {
  id: "rel-james",
  clinicianId: "emp-james",
  clinicianName: "Dr. James Okonkwo, DO",
  at: "2026-09-29 11:00",
});
assert.strictEqual(released.ok, true);
assert.strictEqual(released.portal.chart.vitals.bpSys, "128");
assert.strictEqual(released.portal.chart.vitals.bpDia, "82");
assert.strictEqual(released.portal.chart.meds[0].name, "Lisinopril");
assert.notStrictEqual(beforePhi, JSON.stringify(flow.phiSnapshot(released.portal)));
assert.strictEqual(flow.phiSnapshot(released.portal).vitals.bpSys, chart.chart.vitals.bpSys);

var jamesAfter = flow.resolveVisitChart(released.portal, "a1", "emp-james");
assert.strictEqual(jamesAfter.ok, true);
assert.strictEqual(jamesAfter.phi.vitals.bpSys, "128");
assert.strictEqual(jamesAfter.phi.meds[0].name, "Lisinopril");
var mayaAfter = flow.resolveVisitChart(released.portal, "a1", "emp-maya");
assert.strictEqual(mayaAfter.phi.vitals.bpSys, "128", "the same chart follows the patient to each released doctor");

var again = flow.releaseChart(released.portal, { clinicianId: "emp-james", clinicianName: "Dr. James Okonkwo, DO" });
assert.strictEqual(again.already, true);
assert.strictEqual(again.portal.releases.length, 2);

var providerAttempt = flow.guardProviderPortalWrite(released.portal, {
  patient: { name: "Someone else", mrn: "X" },
  chart: {
    vitals: { bpSys: "200", bpDia: "100" },
    meds: [],
  },
  releases: [],
  appointments: released.portal.appointments,
  prefs: { selectedAppointmentId: "a1" },
});
assert.strictEqual(providerAttempt.phiRejected, true);
assert.strictEqual(providerAttempt.portal.chart.vitals.bpSys, "128");
assert.strictEqual(providerAttempt.portal.chart.meds[0].name, "Lisinopril");
assert.strictEqual(providerAttempt.portal.patient.name, "Alexa J. Thomas");
assert.strictEqual(providerAttempt.portal.releases.length, 2);
assert.strictEqual(providerAttempt.portal.prefs.selectedAppointmentId, "a1");

var prefsOnly = flow.guardProviderPortalWrite(released.portal, Object.assign({}, released.portal, {
  prefs: { selectedAppointmentId: "a5" },
}));
assert.strictEqual(prefsOnly.phiRejected, false);
assert.strictEqual(prefsOnly.portal.chart.vitals.bpSys, "128");

console.log("well-chart-flow.test.js: ok");
