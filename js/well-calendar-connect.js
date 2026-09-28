/**
 * WELL calendar connector — demo adapter for a Microsoft 365 / Teams shared calendar.
 *
 * No live Graph OAuth and no tokens. Mock employee Outlook/Teams events are
 * deterministic so the patient and provider portals can show a shared org
 * calendar and suggest the next open doctor visit.
 *
 * Adapter contract (demo today, Microsoft Graph later):
 *   listEvents(employeeId, dateIso) -> [{
 *     id, employeeId, title, date, start, end, startMin, endMin,
 *     source: "teams" | "outlook", showAs: "busy" | "free"
 *   }]
 * A real Graph adapter would map calendarView for each staff mailbox
 * (Calendars.Read.Shared) and call useAdapter(). Free events are ignored.
 * showAs other than "free" counts as busy.
 *
 * Clinic hours (demo): weekdays 09:00–12:00 and 13:00–16:30, 30-minute slots.
 * Visibility toggles only change the board. Booking still avoids that
 * doctor's meetings when the clinic calendar is connected.
 *
 * Privacy boundary: presentForRole(block, role, surface).
 *   Shared overlays are opaque Busy / Free for every calendar the viewer does
 *   not own — patients and employees alike. No subjects, attendees, notes,
 *   other patients' names, reasons, or MRNs.
 *   Full detail is owner-only. The patient owns their WELL visits and their
 *   own Outlook calendar. The signed-in provider (demo: Dr. Maya Chen) owns
 *   only that employee's Outlook/Teams events. Clinic names for workflow live
 *   outside this adapter, in a provider-only schedule list.
 * The demo is not HIPAA-certified. The mask is still applied this way.
 */
(function (root) {
  "use strict";

  var PATIENT_CAL_ID = "self-patient";
  var DEFAULT_CLINICIAN_ID = "emp-maya";
  var SLOT_MIN = 30;

  var STAFF = [
    {
      id: "emp-maya",
      name: "Dr. Maya Chen, MD",
      short: "Maya",
      role: "Physician",
      kind: "doctor",
      color: "#5B5FC7",
      email: "maya.chen@hydeparkfm.demo",
    },
    {
      id: "emp-james",
      name: "Dr. James Okonkwo, DO",
      short: "James",
      role: "Physician",
      kind: "doctor",
      color: "#C4314B",
      email: "james.okonkwo@hydeparkfm.demo",
    },
    {
      id: "emp-nina",
      name: "Nina Alvarez, RN",
      short: "Nina",
      role: "Nurse",
      kind: "nurse",
      color: "#0F6CBD",
      email: "nina.alvarez@hydeparkfm.demo",
    },
    {
      id: "emp-leo",
      name: "Leo Park, RN",
      short: "Leo",
      role: "Nurse",
      kind: "nurse",
      color: "#CA5010",
      email: "leo.park@hydeparkfm.demo",
    },
    {
      id: "emp-priya",
      name: "Priya Shah",
      short: "Priya",
      role: "Front desk",
      kind: "staff",
      color: "#8764B8",
      email: "priya.shah@hydeparkfm.demo",
    },
  ];

  var VISIT_TYPES = [
    { id: "wellness", label: "Annual wellness" },
    { id: "followup", label: "Follow-up" },
    { id: "sick", label: "Sick visit" },
    { id: "labs", label: "Lab review" },
  ];

  var CLINIC_HOURS_LABEL =
    "Weekdays 9:00 AM–12:00 PM and 1:00–4:30 PM · 30-minute visits";

  /* Weekly mock Outlook / Teams busy blocks (local weekday, 0 = Sunday). */
  var WEEKLY = {
    "emp-maya": [
      { dow: 1, start: "09:00", end: "09:30", title: "Clinic huddle", source: "teams" },
      { dow: 2, start: "11:00", end: "12:00", title: "Grand rounds", source: "teams" },
      { dow: 3, start: "13:00", end: "14:00", title: "Charting block", source: "outlook" },
      { dow: 4, start: "15:00", end: "16:00", title: "Peer consult", source: "teams" },
      { dow: 5, start: "09:00", end: "10:00", title: "Department meeting", source: "teams" },
    ],
    "emp-james": [
      { dow: 1, start: "13:00", end: "15:00", title: "Procedure block", source: "outlook" },
      { dow: 3, start: "09:00", end: "11:00", title: "Clinic overflow", source: "teams" },
      { dow: 5, start: "14:00", end: "16:00", title: "Teaching conference", source: "teams" },
    ],
    "emp-nina": [
      { dow: 1, start: "09:00", end: "09:30", title: "Morning huddle", source: "teams" },
      { dow: 2, start: "09:00", end: "09:30", title: "Morning huddle", source: "teams" },
      { dow: 3, start: "09:00", end: "09:30", title: "Morning huddle", source: "teams" },
      { dow: 4, start: "09:00", end: "09:30", title: "Morning huddle", source: "teams" },
      { dow: 5, start: "09:00", end: "09:30", title: "Morning huddle", source: "teams" },
      { dow: 2, start: "14:00", end: "15:30", title: "Patient education", source: "outlook" },
      { dow: 4, start: "14:00", end: "15:30", title: "Patient education", source: "outlook" },
    ],
    "emp-leo": [
      { dow: 1, start: "10:00", end: "11:00", title: "Triage block", source: "outlook" },
      { dow: 3, start: "10:00", end: "11:00", title: "Triage block", source: "outlook" },
      { dow: 5, start: "10:00", end: "11:00", title: "Triage block", source: "outlook" },
      { dow: 1, start: "16:00", end: "16:30", title: "Shift handoff", source: "teams" },
      { dow: 2, start: "16:00", end: "16:30", title: "Shift handoff", source: "teams" },
      { dow: 3, start: "16:00", end: "16:30", title: "Shift handoff", source: "teams" },
      { dow: 4, start: "16:00", end: "16:30", title: "Shift handoff", source: "teams" },
      { dow: 5, start: "16:00", end: "16:30", title: "Shift handoff", source: "teams" },
    ],
    "emp-priya": [
      { dow: 1, start: "15:30", end: "16:30", title: "Insurance callbacks", source: "outlook" },
      { dow: 2, start: "11:30", end: "12:00", title: "Front desk coverage", source: "teams" },
      { dow: 4, start: "09:30", end: "10:30", title: "New patient packets", source: "outlook" },
    ],
    "self-patient": [
      { dow: 2, start: "10:00", end: "11:00", title: "Work standup", source: "outlook" },
      { dow: 4, start: "13:00", end: "14:30", title: "Project review", source: "teams" },
      { dow: 5, start: "11:00", end: "12:00", title: "Personal hold", source: "outlook" },
    ],
  };

  var DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function timeToMin(hhmm) {
    var m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return NaN;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function minToTime(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return pad2(h) + ":" + pad2(m);
  }

  function parseIsoDate(iso) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return null;
    var y = parseInt(p[0], 10);
    var mo = parseInt(p[1], 10) - 1;
    var d = parseInt(p[2], 10);
    if (!y || mo < 0 || mo > 11 || !d) return null;
    return new Date(y, mo, d);
  }

  function isoFromDate(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function parseWhen(when) {
    var s = String(when || "").trim();
    var m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!m) return { date: "", time: "" };
    if (!m[2]) return { date: m[1], time: "" };
    return { date: m[1], time: pad2(parseInt(m[2], 10)) + ":" + m[3] };
  }

  function formatTimeLabel(hhmm) {
    var mins = timeToMin(hhmm);
    if (isNaN(mins)) return String(hhmm || "");
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var ap = h >= 12 ? "PM" : "AM";
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":" + pad2(m) + " " + ap;
  }

  function formatWhen(dateIso, hhmm) {
    var d = parseIsoDate(dateIso);
    if (!d) return String(dateIso || "") + " " + formatTimeLabel(hhmm);
    return DOW_SHORT[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + " · " + formatTimeLabel(hhmm);
  }

  function formatDay(dateIso) {
    var d = parseIsoDate(dateIso);
    if (!d) return String(dateIso || "");
    return DOW_LONG[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate();
  }

  function staffById(id) {
    for (var i = 0; i < STAFF.length; i++) {
      if (STAFF[i].id === id) return STAFF[i];
    }
    return null;
  }

  function doctors() {
    return STAFF.filter(function (s) {
      return s.kind === "doctor";
    });
  }

  function visitById(id) {
    for (var i = 0; i < VISIT_TYPES.length; i++) {
      if (VISIT_TYPES[i].id === id) return VISIT_TYPES[i];
    }
    return null;
  }

  function defaultState() {
    return {
      connected: false,
      provider: "",
      connectedAt: "",
      tenant: "Hyde Park Family Medicine",
      accountLabel: "",
      visibleEmployeeIds: STAFF.map(function (s) {
        return s.id;
      }),
      includePatientCalendar: true,
      bookVisitType: "wellness",
      bookClinicianId: DEFAULT_CLINICIAN_ID,
    };
  }

  function normalize(raw) {
    var d = defaultState();
    if (!raw || typeof raw !== "object") return d;
    d.connected = !!raw.connected;
    d.provider = d.connected ? raw.provider || "microsoft365-demo" : "";
    d.connectedAt = d.connected ? String(raw.connectedAt || "") : "";
    d.tenant = raw.tenant ? String(raw.tenant) : d.tenant;
    d.accountLabel = d.connected ? String(raw.accountLabel || "") : "";
    d.includePatientCalendar = raw.includePatientCalendar !== false;
    if (visitById(raw.bookVisitType)) d.bookVisitType = raw.bookVisitType;
    if (staffById(raw.bookClinicianId) && staffById(raw.bookClinicianId).kind === "doctor") {
      d.bookClinicianId = raw.bookClinicianId;
    }
    if (Array.isArray(raw.visibleEmployeeIds)) {
      var chosen = {};
      raw.visibleEmployeeIds.forEach(function (id) {
        if (staffById(id)) chosen[id] = true;
      });
      d.visibleEmployeeIds = STAFF.filter(function (s) {
        return chosen[s.id];
      }).map(function (s) {
        return s.id;
      });
    }
    return d;
  }

  function connect(state, accountLabel, connectedAt) {
    var next = normalize(state);
    next.connected = true;
    next.provider = "microsoft365-demo";
    next.connectedAt = connectedAt || "";
    next.accountLabel = accountLabel || next.tenant;
    return next;
  }

  function disconnect(state) {
    var next = normalize(state);
    next.connected = false;
    next.provider = "";
    next.connectedAt = "";
    next.accountLabel = "";
    return next;
  }

  function setVisible(state, employeeId, on) {
    var next = normalize(state);
    if (!staffById(employeeId)) return next;
    var ids = next.visibleEmployeeIds.slice();
    var idx = ids.indexOf(employeeId);
    if (on && idx < 0) ids.push(employeeId);
    if (!on && idx >= 0) ids.splice(idx, 1);
    var chosen = {};
    ids.forEach(function (id) {
      chosen[id] = true;
    });
    next.visibleEmployeeIds = STAFF.filter(function (s) {
      return chosen[s.id];
    }).map(function (s) {
      return s.id;
    });
    return next;
  }

  function setIncludePatientCalendar(state, on) {
    var next = normalize(state);
    next.includePatientCalendar = !!on;
    return next;
  }

  function setBookPrefs(state, prefs) {
    var next = normalize(state);
    prefs = prefs || {};
    if (visitById(prefs.visitType)) next.bookVisitType = prefs.visitType;
    if (prefs.clinicianId && staffById(prefs.clinicianId) && staffById(prefs.clinicianId).kind === "doctor") {
      next.bookClinicianId = prefs.clinicianId;
    }
    return next;
  }

  function builtinList(employeeId, dateIso) {
    var date = parseIsoDate(dateIso);
    if (!date) return [];
    var dow = date.getDay();
    var list = WEEKLY[employeeId] || [];
    var out = [];
    list.forEach(function (ev) {
      if (ev.dow !== dow) return;
      out.push({
        id: employeeId + ":" + dateIso + ":" + ev.start,
        employeeId: employeeId,
        title: ev.title,
        date: dateIso,
        start: ev.start,
        end: ev.end,
        startMin: timeToMin(ev.start),
        endMin: timeToMin(ev.end),
        source: ev.source,
        showAs: "busy",
      });
    });
    return out;
  }

  var builtinAdapter = {
    id: "microsoft365-demo",
    label: "Microsoft 365 / Teams (demo)",
    listEvents: builtinList,
  };
  var activeAdapter = builtinAdapter;

  function listEvents(employeeId, dateIso) {
    var raw = [];
    try {
      raw = (activeAdapter && activeAdapter.listEvents(employeeId, dateIso)) || [];
    } catch (e) {
      raw = [];
    }
    return raw
      .map(function (ev) {
        if (!ev) return null;
        var startMin = typeof ev.startMin === "number" ? ev.startMin : timeToMin(ev.start);
        var endMin = typeof ev.endMin === "number" ? ev.endMin : timeToMin(ev.end);
        return {
          id: ev.id || employeeId + ":" + dateIso + ":" + (ev.start || startMin),
          employeeId: ev.employeeId || employeeId,
          title: ev.title || "Busy",
          date: ev.date || dateIso,
          start: ev.start || minToTime(startMin),
          end: ev.end || minToTime(endMin),
          startMin: startMin,
          endMin: endMin,
          source: ev.source || "outlook",
          showAs: ev.showAs || "busy",
        };
      })
      .filter(function (ev) {
        return ev && ev.showAs !== "free" && !isNaN(ev.startMin) && ev.startMin < ev.endMin;
      });
  }

  function isWeekend(dateIso) {
    var date = parseIsoDate(dateIso);
    if (!date) return false;
    var dow = date.getDay();
    return dow === 0 || dow === 6;
  }

  function slotStarts(dateIso) {
    if (isWeekend(dateIso)) return [];
    var out = [];
    function pushWindow(start, end) {
      for (var t = start; t + SLOT_MIN <= end; t += SLOT_MIN) out.push(t);
    }
    pushWindow(9 * 60, 12 * 60);
    pushWindow(13 * 60, 16 * 60 + 30);
    return out;
  }

  function overlaps(a0, a1, b0, b1) {
    return a0 < b1 && b0 < a1;
  }

  function appointmentInterval(appt) {
    if (!appt) return null;
    var parsed = parseWhen(appt.when);
    if (!parsed.date || !parsed.time) return null;
    var start = timeToMin(parsed.time);
    if (isNaN(start)) return null;
    var dur = parseInt(appt.durationMin, 10);
    if (!dur || dur < 5) dur = SLOT_MIN;
    return { date: parsed.date, start: start, end: start + dur };
  }

  function clinicianOf(appt) {
    if (appt && appt.clinicianId) return appt.clinicianId;
    return DEFAULT_CLINICIAN_ID;
  }

  function belongsToPatient(appt, patientId, patientName, legacyOwnerId) {
    if (!appt) return false;
    if (patientId && appt.patientId && appt.patientId === patientId) return true;
    if (patientName && appt.patientName && appt.patientName === patientName) return true;
    if (!appt.patientId && !appt.patientName && patientId && patientId === (legacyOwnerId || "p1")) return true;
    return false;
  }

  function slotBlock(opts) {
    opts = opts || {};
    var start = opts.startMin;
    var end = start + (opts.durationMin || SLOT_MIN);
    if (isNaN(start)) return null;
    var dateIso = opts.dateIso;
    var clinicianId = opts.clinicianId || DEFAULT_CLINICIAN_ID;
    var appointments = opts.appointments || [];
    var i;
    if (opts.blockOwnVisits !== false && (opts.patientId || opts.patientName)) {
      for (i = 0; i < appointments.length; i++) {
        var own = appointments[i];
        if (!belongsToPatient(own, opts.patientId, opts.patientName, opts.legacyOwnerId)) continue;
        var ownIv = appointmentInterval(own);
        if (!ownIv || ownIv.date !== dateIso) continue;
        if (overlaps(start, end, ownIv.start, ownIv.end)) {
          return { kind: "own-visit", title: own.reason || "Existing visit", source: "well" };
        }
      }
    }
    for (i = 0; i < appointments.length; i++) {
      var appt = appointments[i];
      if (clinicianOf(appt) !== clinicianId) continue;
      var iv = appointmentInterval(appt);
      if (!iv || iv.date !== dateIso) continue;
        if (overlaps(start, end, iv.start, iv.end)) {
          return {
            kind: "appointment",
            title: "Already booked",
            source: "well",
            employeeId: clinicianId,
            appointmentId: appt.id || "",
          };
        }
    }
    if (opts.connected) {
      var events = listEvents(clinicianId, dateIso);
      for (i = 0; i < events.length; i++) {
        var ev = events[i];
        if (overlaps(start, end, ev.startMin, ev.endMin)) {
          return { kind: "employee", title: ev.title, source: ev.source, employeeId: clinicianId };
        }
      }
      if (opts.includePatientOutlook) {
        var selfEvents = listEvents(PATIENT_CAL_ID, dateIso);
        for (i = 0; i < selfEvents.length; i++) {
          var sev = selfEvents[i];
          if (overlaps(start, end, sev.startMin, sev.endMin)) {
            return { kind: "outlook-self", title: sev.title, source: sev.source, employeeId: PATIENT_CAL_ID };
          }
        }
      }
    }
    return null;
  }

  function describeBlock(block) {
    if (!block) return "";
    if (block.kind === "own-visit") return "Existing visit on this chart";
    if (block.kind === "appointment") return "Clinician already booked";
    if (block.kind === "outlook-self") return "You · " + (block.title || "Busy");
    if (block.kind === "employee") {
      var emp = staffById(block.employeeId);
      return (emp ? emp.short : "Staff") + " · " + (block.title || "Busy");
    }
    return block.title || "Busy";
  }

  function sourceLabel(source) {
    if (source === "teams") return "Teams";
    if (source === "outlook") return "Outlook";
    if (source === "well") return "WELL";
    return "";
  }

  var PATIENT_BUSY_LABEL = "Busy";
  var PATIENT_UNAVAILABLE_LABEL = "Unavailable";

  /**
   * Who may see this block's title.
   * Patient: own WELL visit, or their own Outlook/Teams calendar.
   * Provider: only the signed-in employee's mailbox (demo: Dr. Maya Chen).
   * Everyone else's calendars stay opaque, including other staff and other patients.
   */
  function viewerOwns(block, role) {
    block = block || {};
    if (role === "patient") {
      return (
        block.kind === "own-visit" ||
        block.kind === "outlook-self" ||
        block.employeeId === PATIENT_CAL_ID
      );
    }
    if (role === "provider") {
      return block.kind === "employee" && block.employeeId === DEFAULT_CLINICIAN_ID;
    }
    return false;
  }

  /**
   * Single display gate for shared-calendar UI.
   * Results are a whitelist: label, title, who, source. Notes, attendees, and
   * patient fields on the input block are never copied.
   * Owned blocks keep their own title. Every other block is Busy (day board)
   * or Unavailable (held slot), with a staff short name only when the block
   * is someone else's employee calendar.
   */
  function presentForRole(block, role, surface) {
    block = block || {};
    var roleName = role === "provider" ? "provider" : "patient";
    var opaque = surface === "held" ? PATIENT_UNAVAILABLE_LABEL : PATIENT_BUSY_LABEL;
    if (viewerOwns(block, roleName)) {
      var ownLabel = block.title || (roleName === "patient" ? "Your visit" : "Busy");
      var showSource = block.kind === "own-visit" ? "" : block.source || "";
      return {
        role: roleName,
        owned: true,
        state: "own",
        label: ownLabel,
        title: ownLabel,
        who: "You",
        source: showSource,
        sourceLabel: sourceLabel(showSource),
      };
    }
    var who = "";
    if (block.kind === "employee" && block.employeeId) {
      var emp = staffById(block.employeeId);
      if (emp) who = emp.short;
    }
    return {
      role: roleName,
      owned: false,
      state: "busy",
      label: opaque,
      title: "",
      who: who,
      source: "",
      sourceLabel: "",
    };
  }

  function searchOpenings(opts) {
    opts = opts || {};
    var count = opts.count || 5;
    var horizon = opts.horizonDays || 28;
    var now = opts.now ? new Date(opts.now.getTime()) : new Date();
    var clinicianId = opts.clinicianId || DEFAULT_CLINICIAN_ID;
    var heldCap = opts.heldCap == null ? 3 : opts.heldCap;
    var slots = [];
    var held = [];
    var day;
    for (day = 0; day < horizon && slots.length < count; day++) {
      var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
      var iso = isoFromDate(date);
      var starts = slotStarts(iso);
      var s;
      for (s = 0; s < starts.length && slots.length < count; s++) {
        var startMin = starts[s];
        if (day === 0 && startMin <= now.getHours() * 60 + now.getMinutes()) continue;
        var reason = slotBlock({
          dateIso: iso,
          startMin: startMin,
          clinicianId: clinicianId,
          appointments: opts.appointments || [],
          connected: !!opts.connected,
          patientId: opts.patientId || "",
          patientName: opts.patientName || "",
          includePatientOutlook: !!opts.includePatientOutlook,
          blockOwnVisits: opts.blockOwnVisits !== false,
          legacyOwnerId: opts.legacyOwnerId || "p1",
        });
        if (reason) {
          if (held.length < heldCap) {
            var timeHeld = minToTime(startMin);
            held.push({
              dateIso: iso,
              time: timeHeld,
              label: formatWhen(iso, timeHeld),
              title: reason.title || "",
              employeeId: reason.employeeId || "",
              source: reason.source || "",
              kind: reason.kind,
            });
          }
          continue;
        }
        var time = minToTime(startMin);
        slots.push({
          dateIso: iso,
          time: time,
          label: formatWhen(iso, time),
          clinicianId: clinicianId,
        });
      }
    }
    return { slots: slots, held: held };
  }

  function useAdapter(adapter) {
    if (!adapter) {
      activeAdapter = builtinAdapter;
      return activeAdapter;
    }
    if (typeof adapter.listEvents !== "function") return activeAdapter;
    activeAdapter = adapter;
    return activeAdapter;
  }

  var api = {
    STAFF: STAFF,
    PATIENT_CAL_ID: PATIENT_CAL_ID,
    DEFAULT_CLINICIAN_ID: DEFAULT_CLINICIAN_ID,
    VISIT_TYPES: VISIT_TYPES,
    CLINIC_HOURS_LABEL: CLINIC_HOURS_LABEL,
    defaultState: defaultState,
    normalize: normalize,
    connect: connect,
    disconnect: disconnect,
    setVisible: setVisible,
    setIncludePatientCalendar: setIncludePatientCalendar,
    setBookPrefs: setBookPrefs,
    staffById: staffById,
    doctors: doctors,
    visitById: visitById,
    eventsOn: listEvents,
    listEvents: listEvents,
    isWeekend: isWeekend,
    slotStarts: slotStarts,
    timeToMin: timeToMin,
    minToTime: minToTime,
    formatWhen: formatWhen,
    formatDay: formatDay,
    formatTimeLabel: formatTimeLabel,
    overlaps: overlaps,
    appointmentInterval: appointmentInterval,
    blockAt: slotBlock,
    describeBlock: describeBlock,
    sourceLabel: sourceLabel,
    PATIENT_BUSY_LABEL: PATIENT_BUSY_LABEL,
    PATIENT_UNAVAILABLE_LABEL: PATIENT_UNAVAILABLE_LABEL,
    viewerOwns: viewerOwns,
    presentForRole: presentForRole,
    searchOpenings: searchOpenings,
    useAdapter: useAdapter,
  };

  root.WellCalendarConnect = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
