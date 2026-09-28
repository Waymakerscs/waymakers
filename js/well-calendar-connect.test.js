/**
 * Node tests for the WELL Teams/Outlook demo calendar adapter.
 * Run: node js/well-calendar-connect.test.js
 */
"use strict";

var assert = require("assert");
require("./well-calendar-connect.js");
var cc = global.WellCalendarConnect;

function mondayMorning() {
  return new Date(2026, 8, 28, 8, 0, 0);
}

function openings(extra) {
  return cc.searchOpenings(
    Object.assign(
      {
        now: mondayMorning(),
        clinicianId: "emp-maya",
        appointments: [],
        connected: true,
        patientId: "p1",
        patientName: "Alexa J. Thomas",
        includePatientOutlook: true,
        count: 5,
      },
      extra || {}
    )
  );
}

var mayaConnected = openings();
assert.strictEqual(mayaConnected.slots[0].time, "09:30", "Maya huddle holds 9:00 when Teams is connected");
assert.strictEqual(mayaConnected.slots[0].dateIso, "2026-09-28");
assert.strictEqual(mayaConnected.held[0].time, "09:00");
assert.ok(/Clinic huddle/.test(mayaConnected.held[0].detail));
assert.strictEqual(mayaConnected.held[0].source, "teams");
assert.ok(mayaConnected.slots.length <= 5);

var mayaOff = openings({ connected: false, includePatientOutlook: false });
assert.strictEqual(mayaOff.slots[0].time, "09:00", "Disconnect uses clinic hours only");
assert.strictEqual(mayaOff.held.length, 0);

var huddle = cc.blockAt({
  dateIso: "2026-09-28",
  startMin: cc.timeToMin("09:00"),
  clinicianId: "emp-maya",
  appointments: [],
  connected: true,
});
assert.strictEqual(huddle.kind, "employee");
var afterHuddle = cc.blockAt({
  dateIso: "2026-09-28",
  startMin: cc.timeToMin("09:30"),
  clinicianId: "emp-maya",
  appointments: [],
  connected: true,
});
assert.strictEqual(afterHuddle, null, "9:00–9:30 huddle does not cover the 9:30 slot");

var tuesday = openings({
  now: new Date(2026, 8, 29, 8, 0, 0),
});
assert.strictEqual(tuesday.slots[0].time, "09:00");
assert.ok(
  tuesday.slots.every(function (s) {
    return s.time !== "10:00" && s.time !== "11:00" && s.time !== "11:30";
  }),
  "patient standup and grand rounds are not offered"
);
assert.ok(tuesday.held.some(function (h) { return h.time === "10:00" && /Work standup/.test(h.detail); }));
assert.ok(tuesday.held.some(function (h) { return h.time === "11:00" && /Grand rounds/.test(h.detail); }));

var tuesdayOtherPatient = openings({
  now: new Date(2026, 8, 29, 8, 0, 0),
  patientId: "p2",
  patientName: "Jordan Rivera",
  includePatientOutlook: false,
});
assert.ok(
  tuesdayOtherPatient.slots.some(function (s) {
    return s.time === "10:00";
  }),
  "another patient's booking does not inherit Alexa's Outlook hold"
);

var jamesAfternoon = cc.searchOpenings({
  now: new Date(2026, 8, 28, 12, 30, 0),
  clinicianId: "emp-james",
  appointments: [],
  connected: true,
  patientId: "p2",
  patientName: "Jordan Rivera",
  includePatientOutlook: false,
  count: 5,
});
assert.strictEqual(jamesAfternoon.slots[0].time, "15:00");
assert.ok(jamesAfternoon.held.some(function (h) { return /Procedure block/.test(h.detail); }));

assert.deepEqual(cc.slotStarts("2026-09-27"), [], "Sunday is closed");
assert.strictEqual(cc.slotStarts("2026-09-28").length, 13);
assert.ok(cc.slotStarts("2026-09-28").indexOf(cc.timeToMin("16:00")) >= 0);
assert.ok(cc.slotStarts("2026-09-28").indexOf(cc.timeToMin("12:00")) < 0);
assert.ok(cc.slotStarts("2026-09-28").indexOf(cc.timeToMin("16:30")) < 0);

var offGrid = { when: "2026-09-28 10:15", patientId: "p2", patientName: "Jordan Rivera" };
assert.ok(
  cc.blockAt({
    dateIso: "2026-09-28",
    startMin: cc.timeToMin("10:00"),
    clinicianId: "emp-maya",
    appointments: [offGrid],
    connected: false,
  })
);
assert.ok(
  cc.blockAt({
    dateIso: "2026-09-28",
    startMin: cc.timeToMin("10:30"),
    clinicianId: "emp-maya",
    appointments: [offGrid],
    connected: false,
  })
);
assert.strictEqual(
  cc.blockAt({
    dateIso: "2026-09-28",
    startMin: cc.timeToMin("11:00"),
    clinicianId: "emp-maya",
    appointments: [offGrid],
    connected: false,
  }),
  null
);

var lab = { id: "a5", when: "2026-10-02 14:00", patientId: "p1", patientName: "Alexa J. Thomas", clinicianId: "emp-maya" };
assert.strictEqual(
  cc.blockAt({
    dateIso: "2026-10-02",
    startMin: cc.timeToMin("14:00"),
    clinicianId: "emp-maya",
    appointments: [lab],
    connected: false,
    patientId: "p2",
    patientName: "Jordan Rivera",
  }).kind,
  "appointment"
);
assert.strictEqual(
  cc.blockAt({
    dateIso: "2026-10-02",
    startMin: cc.timeToMin("14:00"),
    clinicianId: "emp-james",
    appointments: [lab],
    connected: false,
    patientId: "p2",
    patientName: "Jordan Rivera",
  }),
  null,
  "Maya's WELL visit does not block James"
);
assert.strictEqual(
  cc.blockAt({
    dateIso: "2026-10-02",
    startMin: cc.timeToMin("14:00"),
    clinicianId: "emp-james",
    appointments: [lab],
    connected: false,
    patientId: "p1",
    patientName: "Alexa J. Thomas",
    blockOwnVisits: true,
  }).kind,
  "own-visit"
);

var state = cc.setVisible(cc.defaultState(), "emp-maya", false);
state = cc.connect(state, "Alexa J. Thomas · alexa.demo@example.invalid", "2026-09-28 08:00");
assert.strictEqual(state.connected, true);
assert.ok(state.visibleEmployeeIds.indexOf("emp-maya") < 0);
assert.ok(state.visibleEmployeeIds.indexOf("emp-nina") >= 0);
state = cc.disconnect(state);
assert.strictEqual(state.connected, false);
assert.strictEqual(state.accountLabel, "");
assert.strictEqual(state.provider, "");
assert.ok(state.visibleEmployeeIds.indexOf("emp-maya") < 0);
state = cc.connect(state, "Hyde Park Family Medicine · shared staff calendars", "2026-09-28 09:00");
assert.ok(state.visibleEmployeeIds.indexOf("emp-maya") < 0, "reconnect restores employee picks");
assert.strictEqual(state.provider, "microsoft365-demo");

var normalized = cc.normalize({
  connected: true,
  visibleEmployeeIds: ["nope", "emp-leo"],
  provider: "",
  includePatientCalendar: false,
});
assert.deepEqual(normalized.visibleEmployeeIds, ["emp-leo"]);
assert.strictEqual(normalized.provider, "microsoft365-demo");
assert.strictEqual(normalized.includePatientCalendar, false);
assert.deepEqual(cc.normalize({ visibleEmployeeIds: [] }).visibleEmployeeIds, []);

var hiddenMaya = openings();
assert.strictEqual(hiddenMaya.slots[0].time, "09:30", "visibility toggles do not free a doctor's meetings");

cc.useAdapter({
  id: "test-free",
  label: "test",
  listEvents: function (id, date) {
    if (id === "emp-maya" && date === "2026-09-30") {
      return [
        {
          employeeId: id,
          title: "Focus time",
          date: date,
          start: "09:00",
          end: "12:00",
          source: "outlook",
          showAs: "free",
        },
      ];
    }
    return [];
  },
});
assert.strictEqual(
  cc.blockAt({
    dateIso: "2026-09-30",
    startMin: cc.timeToMin("09:00"),
    clinicianId: "emp-maya",
    appointments: [],
    connected: true,
  }),
  null,
  "free/showAs free events do not block"
);
cc.useAdapter(null);
assert.strictEqual(
  cc.blockAt({
    dateIso: "2026-09-28",
    startMin: cc.timeToMin("09:00"),
    clinicianId: "emp-maya",
    appointments: [],
    connected: true,
  }).kind,
  "employee",
  "demo adapter restored"
);

assert.strictEqual(cc.doctors().length, 2);
assert.ok(cc.visitById("sick"));
assert.ok(/Monday/.test(cc.formatDay("2026-09-28")));

console.log("well-calendar-connect: " + "ok");
