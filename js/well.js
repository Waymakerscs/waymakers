/**
 * WELL — WAYMAKERS demo patient chart / EHR-style shell.
 *
 * Two portals: Patient (fillable documentation + portal inbox/notes)
 *            | Provider (chart view; compose doctor messages + append-only notes)
 * sessionStorage: cognation.well.side = patient|provider
 * localStorage:   cognation.well.portal.v1  (demo chart + prefs — stays in this browser)
 * IndexedDB:      cognation.well.applehealth.v1 (Apple Health export file bytes)
 *
 * Doctor messages: provider → patient (compose on Provider portal).
 * Doctor notes: stored in the patient portal data; append-only / audit log — never deleted.
 * Apple Health (v1): patient consent grant/revoke + manual export.zip/XML upload;
 *   consent + upload events are append-only in appleHealth.audit. Live HealthKit sync
 *   needs a native iOS app later — web UI stays honest about that.
 *
 * Demo only — not a real EHR. Do not claim HIPAA compliance.
 */
(function () {
  "use strict";

  var SIDE_KEY = "cognation.well.side";
  var PORTAL_KEY = "cognation.well.portal.v1";

  var CHART_SECTIONS = [
    { id: "intake", label: "Intake" },
    { id: "hpi", label: "HPI" },
    { id: "vitals", label: "Vitals" },
    { id: "meds", label: "Meds" },
    { id: "allergies", label: "Allergies" },
    { id: "diagnoses", label: "Diagnoses" },
    { id: "progress", label: "Progress note" },
    { id: "plan", label: "Care plan" },
    { id: "applehealth", label: "Apple Health" },
  ];

  var APPLE_HEALTH_SCOPES = [
    "Activity & workouts",
    "Heart rate & vitals trends",
    "Sleep",
    "Steps / mobility",
    "Nutrition (if present in your export)",
    "Clinical records embedded in the export (if present)",
  ];

  var APPLE_HEALTH_DB = "cognation.well.applehealth.v1";
  var APPLE_HEALTH_STORE = "exports";
  var APPLE_HEALTH_MAX_BYTES = 25 * 1024 * 1024; /* 25 MB demo cap */

  var DEMO_SEED = {
    version: 5,
    patient: {
      name: "Alexa J. Thomas",
      dob: "1990-04-12",
      mrn: "CGN-DEMO-10482",
      sex: "F",
      preferredClinic: "Hyde Park Family Medicine",
      pcp: "Dr. Maya Chen, MD",
      phone: "(312) 555-0147",
      email: "alexa.demo@example.invalid",
    },
    provider: {
      name: "Dr. Maya Chen, MD",
      specialty: "Family Medicine",
      npi: "1890123456",
      clinic: "Hyde Park Family Medicine",
      /* Shared with JOBS posts + PAGES listing (company/provider identity) */
      companyId: "hyde-park-family-medicine",
    },
    appointments: [
      { id: "a1", when: "2026-09-18 09:30", patientId: "p1", patientName: "Alexa J. Thomas", where: "Hyde Park Family Medicine", reason: "Annual wellness" },
      { id: "a2", when: "2026-09-18 10:15", patientId: "p2", patientName: "Jordan Rivera", where: "Hyde Park Family Medicine", reason: "HTN follow-up" },
      { id: "a3", when: "2026-09-18 11:00", patientId: "p3", patientName: "Sam Okonkwo", where: "Hyde Park Family Medicine", reason: "URI / sick visit" },
      { id: "a4", when: "2026-09-18 13:30", patientId: "p4", patientName: "Priya Nair", where: "Hyde Park Family Medicine", reason: "Diabetes check" },
      { id: "a5", when: "2026-10-02 14:00", patientId: "p1", patientName: "Alexa J. Thomas", where: "Lab · Streeterville", reason: "Fasting labs" },
    ],
    roster: [
      { id: "p1", name: "Alexa J. Thomas", mrn: "CGN-DEMO-10482", dob: "1990-04-12", reason: "Annual wellness", time: "09:30" },
      { id: "p2", name: "Jordan Rivera", mrn: "CGN-DEMO-11003", dob: "1978-11-03", reason: "HTN follow-up", time: "10:15" },
      { id: "p3", name: "Sam Okonkwo", mrn: "CGN-DEMO-10941", dob: "2001-06-22", reason: "URI / sick visit", time: "11:00" },
      { id: "p4", name: "Priya Nair", mrn: "CGN-DEMO-10817", dob: "1985-02-14", reason: "Diabetes check", time: "13:30" },
    ],
    chart: {
      intake: {
        chiefComplaint: "Annual wellness visit; review meds and labs.",
        preferredPharmacy: "Clark Street Pharmacy",
        emergencyContact: "Jamie Thomas · (312) 555-0199",
        insurance: "Demo Health PPO · Member #DH-44021",
        consentSigned: true,
      },
      hpi: {
        onset: "Routine / wellness",
        location: "N/A",
        duration: "N/A",
        character: "No acute complaints today",
        aggravating: "",
        relieving: "",
        timing: "",
        severity: "",
        associated: "Wants blood pressure and lipid review",
        narrative:
          "Patient presents for annual wellness. No fever, cough, chest pain, or shortness of breath. Sleeps well. Exercises 3×/week. Interested in lipid panel and BP trend.",
      },
      vitals: {
        recordedAt: "2026-09-15 10:05",
        bpSys: "118",
        bpDia: "76",
        hr: "72",
        tempF: "98.4",
        rr: "16",
        spo2: "98",
        weightLb: "142",
        heightIn: "65",
        pain: "0",
      },
      meds: [
        { name: "Lisinopril", dose: "10 mg", freq: "daily", notes: "AM with food" },
        { name: "Vitamin D3", dose: "2000 IU", freq: "daily", notes: "" },
        { name: "Cetirizine", dose: "10 mg", freq: "PRN allergy", notes: "Seasonal" },
      ],
      allergies: [
        { substance: "Penicillin", reaction: "Rash", severity: "Moderate" },
        { substance: "NKDA otherwise", reaction: "", severity: "" },
      ],
      diagnoses: [
        {
          code: "F 84.0",
          description: "Autistic disorder (autism spectrum disorder)",
          treated: false,
        },
        {
          code: "I10",
          description: "Essential (primary) hypertension",
          treated: false,
        },
        {
          code: "J30.1",
          description: "Allergic rhinitis due to pollen",
          treated: true,
        },
      ],
      progress: {
        template: "SOAP",
        subjective: "Feeling well. No acute issues. Taking meds as prescribed.",
        objective: "Vitals stable. Appears well, NAD. Heart RRR, lungs clear.",
        assessment: "1. Health maintenance  2. Essential hypertension — controlled  3. Seasonal allergic rhinitis",
        plan: "Continue lisinopril. Order lipid panel + CMP. F/u in 6 months or sooner PRN.",
        author: "Patient / intake demo",
        signedAt: "",
      },
      plan: {
        goals: "Maintain BP <130/80 · complete annual labs · stay active 150 min/week",
        tasks: "Fasting labs before Oct 2 visit · refill Vitamin D if low · update pharmacy card",
        notes: "Demo care-plan card. Editable on Patient side only.",
      },
    },
    messages: [
      {
        id: "m1",
        fromRole: "provider",
        from: "Dr. Maya Chen, MD",
        at: "2026-09-10 11:22",
        body: "Your annual wellness visit is confirmed for Sep 18 at 9:30 AM.",
      },
      {
        id: "m2",
        fromRole: "patient",
        from: "You",
        at: "2026-09-10 12:05",
        body: "Thanks — I'll arrive 10 minutes early for vitals.",
      },
      {
        id: "m3",
        fromRole: "provider",
        from: "Dr. Maya Chen, MD",
        at: "2026-09-12 09:14",
        body: "Lab slip for Oct 2 is in your chart. Fasting 8–12 hours.",
      },
    ],
    /* Provider-authored notes visible in the patient portal.
       Audit-only: patients cannot edit or delete; append-only from provider. */
    doctorNotes: [
      {
        id: "dn1",
        at: "2026-09-15 10:40",
        author: "Dr. Maya Chen, MD",
        body: "Discussed BP trend and lifestyle. Continue current regimen. Labs ordered for Oct 2.",
        immutable: true,
      },
    ],
    doctorNotesAudit: [
      {
        id: "aud1",
        at: "2026-09-15 10:40",
        action: "append",
        noteId: "dn1",
        by: "Dr. Maya Chen, MD",
        detail: "Doctor note created (append-only)",
      },
    ],
    /* Apple Health share (patient portal). Consent + uploads audited append-only. */
    appleHealth: {
      consent: {
        granted: false,
        grantedAt: "",
        revokedAt: "",
        version: 1,
        scopes: APPLE_HEALTH_SCOPES.slice(),
      },
      /* Upload metadata only here; file bytes live in IndexedDB keyed by id. Append-only. */
      uploads: [],
      audit: [],
    },
    prefs: {
      lastSection: "intake",
      selectedRosterId: "p1",
      calYear: 2026,
      calMonth: 8,
      selectedCalDate: "2026-09-18",
    },
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDob(iso) {
    if (!iso) return "—";
    var p = String(iso).split("-");
    if (p.length !== 3) return escapeHtml(iso);
    return escapeHtml(p[1] + "/" + p[2] + "/" + p[0]);
  }

  function ageFromDob(iso) {
    try {
      var d = new Date(iso + "T12:00:00");
      if (isNaN(d.getTime())) return "";
      var now = new Date();
      var age = now.getFullYear() - d.getFullYear();
      var m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return String(age);
    } catch (e) {
      return "";
    }
  }


  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function isoDate(y, m0, d) {
    return y + "-" + pad2(m0 + 1) + "-" + pad2(d);
  }

  function parseWhen(when) {
    var s = String(when || "").trim();
    var m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?/);
    if (!m) return { date: "", time: "" };
    var t = m[2] || "";
    if (t.length === 4) t = "0" + t;
    return { date: m[1], time: t };
  }

  function formatCalMonthLabel(year, month0) {
    var names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return names[month0] + " " + year;
  }

  function ensureCalPrefs(data) {
    data.prefs = data.prefs || {};
    var now = new Date();
    if (typeof data.prefs.calYear !== "number") data.prefs.calYear = now.getFullYear();
    if (typeof data.prefs.calMonth !== "number") data.prefs.calMonth = now.getMonth();
    if (!data.prefs.selectedCalDate) {
      data.prefs.selectedCalDate = isoDate(data.prefs.calYear, data.prefs.calMonth, now.getDate());
    }
    return data;
  }

  function appointmentsForDate(data, dateIso) {
    return (data.appointments || [])
      .filter(function (a) {
        return parseWhen(a.when).date === dateIso;
      })
      .slice()
      .sort(function (a, b) {
        return String(parseWhen(a.when).time).localeCompare(String(parseWhen(b.when).time));
      });
  }

  function patientFacingAppointments(data) {
    var pname = (data.patient && data.patient.name) || "";
    return (data.appointments || []).filter(function (a) {
      if (a.patientId === "p1") return true;
      if (a.patientName && pname && a.patientName === pname) return true;
      /* Legacy seed rows without patient fields belong to the demo patient */
      if (!a.patientId && !a.patientName) return true;
      return false;
    });
  }

  function datesWithAppointments(data, year, month0) {
    var set = {};
    (data.appointments || []).forEach(function (a) {
      var p = parseWhen(a.when);
      if (!p.date) return;
      var parts = p.date.split("-");
      if (parts.length !== 3) return;
      var y = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10) - 1;
      if (y === year && m === month0) set[p.date] = true;
    });
    return set;
  }

  function newAppointmentId() {
    return "a" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  }

  function renderMonthCalendar(data) {
    ensureCalPrefs(data);
    var year = data.prefs.calYear;
    var month0 = data.prefs.calMonth;
    var selected = data.prefs.selectedCalDate;
    var marked = datesWithAppointments(data, year, month0);
    var first = new Date(year, month0, 1);
    var startDow = first.getDay(); /* 0=Sun */
    var daysInMonth = new Date(year, month0 + 1, 0).getDate();
    var today = new Date();
    var todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

    var cells = [];
    var i;
    for (i = 0; i < startDow; i++) {
      cells.push('<div class="well-cal-cell well-cal-cell--empty" aria-hidden="true"></div>');
    }
    for (i = 1; i <= daysInMonth; i++) {
      var iso = isoDate(year, month0, i);
      var cls = "well-cal-cell";
      if (iso === selected) cls += " is-selected";
      if (iso === todayIso) cls += " is-today";
      if (marked[iso]) cls += " has-appts";
      cells.push(
        '<button type="button" class="' +
          cls +
          '" data-well-cal-day="' +
          escapeHtml(iso) +
          '" aria-label="' +
          escapeHtml(iso) +
          (marked[iso] ? ", has appointments" : "") +
          (iso === selected ? ", selected" : "") +
          '" aria-pressed="' +
          (iso === selected ? "true" : "false") +
          '"><span class="well-cal-daynum">' +
          i +
          "</span>" +
          (marked[iso] ? '<span class="well-cal-dot" aria-hidden="true"></span>' : "") +
          "</button>"
      );
    }

    var dow = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
      .map(function (d) {
        return '<span class="well-cal-dow">' + d + "</span>";
      })
      .join("");

    return (
      '<div class="well-calendar" data-well-calendar>' +
      '<div class="well-cal-nav">' +
      '<button type="button" class="well-icon-btn well-cal-nav-btn" data-well-cal-prev aria-label="Previous month">‹</button>' +
      '<div class="well-cal-label" aria-live="polite">' +
      escapeHtml(formatCalMonthLabel(year, month0)) +
      "</div>" +
      '<button type="button" class="well-icon-btn well-cal-nav-btn" data-well-cal-next aria-label="Next month">›</button>' +
      "</div>" +
      '<div class="well-cal-dows" aria-hidden="true">' +
      dow +
      "</div>" +
      '<div class="well-cal-grid" role="grid" aria-label="Schedule calendar">' +
      cells.join("") +
      "</div></div>"
    );
  }

  function renderDayAppointmentsList(data, dateIso) {
    var list = appointmentsForDate(data, dateIso);
    if (!list.length) {
      return '<p class="well-muted well-tiny">No appointments on this day.</p>';
    }
    return (
      '<ul class="well-roster" role="list">' +
      list
        .map(function (a) {
          var p = parseWhen(a.when);
          var on = a.patientId && a.patientId === data.prefs.selectedRosterId;
          return (
            "<li>" +
            '<div class="well-appt-row' +
            (on ? " is-selected" : "") +
            '">' +
            (a.patientId
              ? '<button type="button" class="well-roster-btn well-appt-open" data-well-roster="' +
                escapeHtml(a.patientId) +
                '" aria-pressed="' +
                (on ? "true" : "false") +
                '"><span class="well-roster-time">' +
                escapeHtml(p.time || "—") +
                '</span><span class="well-roster-name">' +
                escapeHtml(a.patientName || "Patient") +
                '</span><span class="well-muted">' +
                escapeHtml(a.reason || "") +
                "</span></button>"
              : '<div class="well-roster-btn" tabindex="-1"><span class="well-roster-time">' +
                escapeHtml(p.time || "—") +
                '</span><span class="well-roster-name">' +
                escapeHtml(a.patientName || "Patient") +
                '</span><span class="well-muted">' +
                escapeHtml(a.reason || "") +
                "</span></div>") +
            '<button type="button" class="well-icon-btn well-appt-cancel" data-well-appt-cancel="' +
            escapeHtml(a.id || "") +
            '" aria-label="Cancel appointment for ' +
            escapeHtml(a.patientName || "patient") +
            ' at ' +
            escapeHtml(p.time || "") +
            '">×</button>' +
            "</div></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderScheduleForm(data, dateIso) {
    var rosterOpts = (data.roster || [])
      .map(function (r) {
        return (
          '<option value="' +
          escapeHtml(r.id) +
          '">' +
          escapeHtml(r.name) +
          "</option>"
        );
      })
      .join("");
    var clinic = (data.provider && data.provider.clinic) || "Hyde Park Family Medicine";
    return (
      '<form class="well-schedule-form" data-well-schedule-form>' +
      '<div class="well-field">' +
      '<label for="well-sched-date">Date</label>' +
      '<input type="date" id="well-sched-date" name="date" data-well-sched="date" value="' +
      escapeHtml(dateIso) +
      '" required>' +
      "</div>" +
      '<div class="well-field">' +
      '<label for="well-sched-time">Time</label>' +
      '<input type="time" id="well-sched-time" name="time" data-well-sched="time" value="09:00" required>' +
      "</div>" +
      '<div class="well-field">' +
      '<label for="well-sched-patient">Patient</label>' +
      '<select id="well-sched-patient" name="patientId" data-well-sched="patientId">' +
      '<option value="">— Type name below —</option>' +
      rosterOpts +
      "</select>" +
      "</div>" +
      '<div class="well-field">' +
      '<label for="well-sched-pname">Patient name</label>' +
      '<input type="text" id="well-sched-pname" name="patientName" data-well-sched="patientName" placeholder="Or enter a name" autocomplete="name">' +
      "</div>" +
      '<div class="well-field">' +
      '<label for="well-sched-reason">Reason</label>' +
      '<input type="text" id="well-sched-reason" name="reason" data-well-sched="reason" placeholder="Visit reason" required>' +
      "</div>" +
      '<div class="well-field">' +
      '<label for="well-sched-where">Location / clinic</label>' +
      '<input type="text" id="well-sched-where" name="where" data-well-sched="where" value="' +
      escapeHtml(clinic) +
      '" required>' +
      "</div>" +
      '<button type="submit" class="btn btn-primary well-mini-btn">Add appointment</button>' +
      "</form>"
    );
  }


  function mergeSeed(raw) {
    var base = deepClone(DEMO_SEED);
    if (!raw || typeof raw !== "object") return base;
    if (raw.patient) Object.assign(base.patient, raw.patient);
    if (raw.provider) Object.assign(base.provider, raw.provider);
    if (raw.prefs) Object.assign(base.prefs, raw.prefs);
    if (Array.isArray(raw.appointments)) {
      var looksLegacy =
        !raw.version ||
        raw.version < 2 ||
        raw.appointments.every(function (a) {
          return !a || (!a.patientName && !a.patientId && !a.id);
        });
      if (looksLegacy && raw.appointments.length <= 2) {
        /* Keep upgraded seed schedule so the provider calendar looks live */
        base.appointments = deepClone(DEMO_SEED.appointments);
      } else {
        base.appointments = raw.appointments.map(function (a, idx) {
          var copy = Object.assign({}, a);
          if (!copy.id) copy.id = "legacy-" + idx;
          return copy;
        });
      }
    }
    if (Array.isArray(raw.roster)) base.roster = raw.roster;
    if (Array.isArray(raw.messages)) {
      base.messages = raw.messages.map(function (m) {
        return normalizeMessage(m);
      });
    } else if (Array.isArray(base.messages)) {
      base.messages = base.messages.map(function (m) {
        return normalizeMessage(m);
      });
    }
    /* Doctor notes: union by id (append-only). Never drop seed or previously saved notes. */
    (function mergeNotes() {
      var byId = {};
      function take(list) {
        (list || []).forEach(function (n) {
          if (!n || !n.id) return;
          if (!byId[n.id]) {
            var note = Object.assign({}, n);
            note.immutable = true;
            byId[n.id] = note;
          }
        });
      }
      take(DEMO_SEED.doctorNotes);
      take(raw.doctorNotes);
      take(base.doctorNotes);
      base.doctorNotes = Object.keys(byId)
        .map(function (k) {
          return byId[k];
        })
        .sort(function (a, b) {
          return String(a.at || "").localeCompare(String(b.at || ""));
        });
    })();
    (function mergeAudit() {
      var byId = {};
      var out = [];
      function take(list) {
        (list || []).forEach(function (a) {
          if (!a) return;
          var id =
            a.id ||
            String(a.at || "") +
              "|" +
              String(a.action || "") +
              "|" +
              String(a.noteId || "") +
              "|" +
              String(a.detail || "");
          if (byId[id]) return;
          var row = Object.assign({ id: id }, a);
          byId[id] = row;
          out.push(row);
        });
      }
      take(DEMO_SEED.doctorNotesAudit);
      take(raw.doctorNotesAudit);
      take(base.doctorNotesAudit);
      out.sort(function (a, b) {
        return String(a.at || "").localeCompare(String(b.at || ""));
      });
      base.doctorNotesAudit = out;
    })();
    if (raw.chart && typeof raw.chart === "object") {
      ["intake", "hpi", "vitals", "progress", "plan"].forEach(function (k) {
        if (raw.chart[k] && typeof raw.chart[k] === "object") {
          Object.assign(base.chart[k], raw.chart[k]);
        }
      });
      if (Array.isArray(raw.chart.meds)) base.chart.meds = raw.chart.meds;
      if (Array.isArray(raw.chart.allergies)) base.chart.allergies = raw.chart.allergies;
      if (Array.isArray(raw.chart.diagnoses) && raw.chart.diagnoses.length) {
        base.chart.diagnoses = raw.chart.diagnoses;
      }
      /* v3+: ensure diagnoses exist for older saved portals */
      if (!Array.isArray(base.chart.diagnoses) || !base.chart.diagnoses.length) {
        base.chart.diagnoses = deepClone(DEMO_SEED.chart.diagnoses);
      }
    }
    base.appleHealth = mergeAppleHealthAppendOnly(base.appleHealth, raw.appleHealth);
    base.version = Math.max(5, Number(raw.version) || 0, Number(base.version) || 0);
    return ensureCalPrefs(ensureAppleHealth(base));
  }

  var PortalStore = {
    get: function () {
      try {
        var raw = localStorage.getItem(PORTAL_KEY);
        if (!raw) return deepClone(DEMO_SEED);
        return mergeSeed(JSON.parse(raw));
      } catch (e) {
        return deepClone(DEMO_SEED);
      }
    },
    /** Persist portal. Doctor notes are append-only — deletes are blocked + audited. */
    save: function (data) {
      try {
        var prev = null;
        try {
          var rawPrev = localStorage.getItem(PORTAL_KEY);
          if (rawPrev) prev = mergeSeed(JSON.parse(rawPrev));
        } catch (ePrev) {
          prev = null;
        }
        if (!prev) prev = deepClone(DEMO_SEED);
        data = data || {};
        if (Array.isArray(data.messages)) {
          data.messages = data.messages.map(function (m) {
            return normalizeMessage(m);
          });
        }
        var prevNotes = prev.doctorNotes || [];
        var nextNotes = Array.isArray(data.doctorNotes) ? data.doctorNotes : [];
        var prevById = {};
        prevNotes.forEach(function (n) {
          if (n && n.id) prevById[n.id] = n;
        });
        var nextById = {};
        nextNotes.forEach(function (n) {
          if (n && n.id) nextById[n.id] = n;
        });
        var missing = Object.keys(prevById).filter(function (id) {
          return !nextById[id];
        });
        /* Union: keep all previous notes; accept new ids from next */
        var union = {};
        var order = [];
        prevNotes.concat(nextNotes).forEach(function (n) {
          if (!n || !n.id) return;
          if (!union[n.id]) {
            var copy = Object.assign({}, n);
            copy.immutable = true;
            /* Prefer the previously persisted body (immutable) */
            if (prevById[n.id]) {
              copy = Object.assign({}, prevById[n.id]);
              copy.immutable = true;
            }
            union[n.id] = copy;
            order.push(n.id);
          }
        });
        data.doctorNotes = order.map(function (id) {
          return union[id];
        });
        data.doctorNotesAudit = data.doctorNotesAudit || [];
        /* Merge prior audit rows */
        var auditById = {};
        var auditOut = [];
        function takeAudit(list) {
          (list || []).forEach(function (a) {
            if (!a) return;
            var id =
              a.id ||
              String(a.at || "") +
                "|" +
                String(a.action || "") +
                "|" +
                String(a.noteId || "");
            if (auditById[id]) return;
            var row = Object.assign({ id: id }, a);
            auditById[id] = row;
            auditOut.push(row);
          });
        }
        takeAudit(prev.doctorNotesAudit);
        takeAudit(data.doctorNotesAudit);
        if (missing.length) {
          missing.forEach(function (id) {
            var row = {
              id: newId("aud"),
              at: nowStamp(),
              action: "attempted_delete",
              noteId: id,
              by: (data.provider && data.provider.name) || "system",
              detail: "Blocked — doctor notes are append-only / audit-only",
            };
            if (!auditById[row.id]) {
              auditById[row.id] = row;
              auditOut.push(row);
            }
          });
        }
        auditOut.sort(function (a, b) {
          return String(a.at || "").localeCompare(String(b.at || ""));
        });
        data.doctorNotesAudit = auditOut;
        /* Apple Health: consent may change; uploads + audit are append-only */
        data.appleHealth = mergeAppleHealthAppendOnly(prev.appleHealth, data.appleHealth);
        ensureAppleHealth(data);
        data.version = Math.max(5, Number(data.version) || 0);
        localStorage.setItem(PORTAL_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  function readStoredSide() {
    try {
      var v = sessionStorage.getItem(SIDE_KEY);
      if (v === "patient" || v === "provider") return v;
    } catch (e) {}
    return null;
  }

  function writeStoredSide(side) {
    try {
      sessionStorage.setItem(SIDE_KEY, side === "provider" ? "provider" : "patient");
    } catch (e) {}
  }

  function applyWellSide(root, side, opts) {
    opts = opts || {};
    side = side === "provider" ? "provider" : "patient";
    /* Flush open patient documentation before leaving Patient side */
    if (side === "provider") {
      try {
        var host = root.querySelector("[data-well-patient-root]");
        var activeDoc = host && host.querySelector("[data-well-doc]");
        if (activeDoc) {
          var flushed = collectFormFields(host, activeDoc.getAttribute("data-well-doc"));
          PortalStore.save(flushed);
        }
      } catch (e) {}
    }
    root.setAttribute("data-well-side", side);
    var patientSide = root.querySelector("[data-well-patient-side]");
    var providerSide = root.querySelector("[data-well-provider-side]");
    if (patientSide) {
      patientSide.hidden = side !== "patient";
      patientSide.setAttribute("aria-hidden", side === "patient" ? "false" : "true");
    }
    if (providerSide) {
      providerSide.hidden = side !== "provider";
      providerSide.setAttribute("aria-hidden", side === "provider" ? "false" : "true");
    }
    root.querySelectorAll("[data-well-side-btn]").forEach(function (btn) {
      var on = btn.getAttribute("data-well-side-btn") === side;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.classList.toggle("is-selected", on);
      btn.tabIndex = on ? 0 : -1;
    });
    if (opts.persist !== false) writeStoredSide(side);
    if (side === "provider") {
      renderProvider(root, PortalStore.get());
    } else {
      renderPatient(root, PortalStore.get());
    }
    WellCall.setActiveRole(side);
  }

  function initSideToggle(root) {
    if (!root || root.__wellSideBound) return;
    root.__wellSideBound = true;
    var initial = readStoredSide() || "patient";
    applyWellSide(root, initial, { persist: false });
    writeStoredSide(initial);

    root.querySelectorAll("[data-well-side-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyWellSide(root, btn.getAttribute("data-well-side-btn") || "patient");
      });
    });

    root.querySelectorAll("[data-well-side-toggle]").forEach(function (toggle) {
      toggle.addEventListener("keydown", function (e) {
        var buttons = Array.prototype.slice.call(toggle.querySelectorAll("[data-well-side-btn]"));
        if (!buttons.length) return;
        var idx = buttons.indexOf(document.activeElement);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          var next = buttons[(idx + 1 + buttons.length) % buttons.length];
          next.focus();
          next.click();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          var prev = buttons[(idx - 1 + buttons.length) % buttons.length];
          prev.focus();
          prev.click();
        } else if (e.key === "Home") {
          e.preventDefault();
          buttons[0].focus();
          buttons[0].click();
        } else if (e.key === "End") {
          e.preventDefault();
          buttons[buttons.length - 1].focus();
          buttons[buttons.length - 1].click();
        }
      });
    });
  }

  function chartBannerHtml(patient, modeLabel) {
    var age = ageFromDob(patient.dob);
    return (
      '<div class="well-chart-banner" data-well-chart-banner>' +
      '<div class="well-chart-banner-main">' +
      '<div class="well-chart-name">' +
      escapeHtml(patient.name) +
      '</div>' +
      '<div class="well-chart-ids">' +
      '<span><abbr title="Date of birth">DOB</abbr> ' +
      formatDob(patient.dob) +
      (age ? " <span class=\"well-muted\">(" + escapeHtml(age) + " y)</span>" : "") +
      "</span>" +
      '<span><abbr title="Medical record number">MRN</abbr> ' +
      escapeHtml(patient.mrn) +
      "</span>" +
      "<span>Sex " +
      escapeHtml(patient.sex || "—") +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="well-chart-banner-meta">' +
      '<span class="well-mode-pill">' +
      escapeHtml(modeLabel) +
      "</span>" +
      "<span>PCP " +
      escapeHtml(patient.pcp || "—") +
      "</span>" +
      "<span>" +
      escapeHtml(patient.preferredClinic || "") +
      "</span>" +
      "</div>" +
      "</div>"
    );
  }

  function sectionTabsHtml(activeId, prefix) {
    return (
      '<div class="well-chart-tabs" role="tablist" aria-label="Chart sections">' +
      CHART_SECTIONS.map(function (s) {
        var on = s.id === activeId;
        return (
          '<button type="button" class="well-chart-tab' +
          (on ? " is-selected" : "") +
          '" role="tab" data-well-section="' +
          escapeHtml(s.id) +
          '" id="' +
          prefix +
          "-tab-" +
          escapeHtml(s.id) +
          '" aria-selected="' +
          (on ? "true" : "false") +
          '" tabindex="' +
          (on ? "0" : "-1") +
          '">' +
          escapeHtml(s.label) +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function fieldRow(label, name, value, opts) {
    opts = opts || {};
    var id = (opts.idPrefix || "well") + "-" + name;
    var readonly = !!opts.readonly;
    var multiline = !!opts.multiline;
    var type = opts.type || "text";
    var val = value == null ? "" : String(value);
    var attr = readonly ? " readonly" : "";
    var roClass = readonly ? " well-field--readonly" : "";
    if (type === "checkbox") {
      return (
        '<label class="well-field well-field--check' +
        roClass +
        '" for="' +
        id +
        '">' +
        '<input type="checkbox" id="' +
        id +
        '" name="' +
        escapeHtml(name) +
        '" data-well-field="' +
        escapeHtml(name) +
        '"' +
        (val === "true" || val === true || val === "on" || val === "1" ? " checked" : "") +
        (readonly ? " disabled" : "") +
        "> " +
        "<span>" +
        escapeHtml(label) +
        "</span></label>"
      );
    }
    if (multiline) {
      return (
        '<div class="well-field' +
        roClass +
        '">' +
        '<label for="' +
        id +
        '">' +
        escapeHtml(label) +
        "</label>" +
        "<textarea id=\"" +
        id +
        '" name="' +
        escapeHtml(name) +
        '" data-well-field="' +
        escapeHtml(name) +
        '" rows="' +
        (opts.rows || 4) +
        '"' +
        attr +
        ">" +
        escapeHtml(val) +
        "</textarea></div>"
      );
    }
    return (
      '<div class="well-field' +
      roClass +
      '">' +
      '<label for="' +
      id +
      '">' +
      escapeHtml(label) +
      "</label>" +
      '<input type="' +
      escapeHtml(type) +
      '" id="' +
      id +
      '" name="' +
      escapeHtml(name) +
      '" data-well-field="' +
      escapeHtml(name) +
      '" value="' +
      escapeHtml(val) +
      '"' +
      attr +
      "></div>"
    );
  }

  function renderMedsTable(meds, editable, idPrefix) {
    var rows =
      (meds || [])
        .map(function (m, i) {
          if (!editable) {
            return (
              "<tr>" +
              "<td>" +
              escapeHtml(m.name) +
              "</td><td>" +
              escapeHtml(m.dose) +
              "</td><td>" +
              escapeHtml(m.freq) +
              "</td><td>" +
              escapeHtml(m.notes || "") +
              "</td></tr>"
            );
          }
          return (
            '<tr data-well-med-row="' +
            i +
            '">' +
            '<td><input type="text" data-well-med="name" value="' +
            escapeHtml(m.name) +
            '" aria-label="Medication name"></td>' +
            '<td><input type="text" data-well-med="dose" value="' +
            escapeHtml(m.dose) +
            '" aria-label="Dose"></td>' +
            '<td><input type="text" data-well-med="freq" value="' +
            escapeHtml(m.freq) +
            '" aria-label="Frequency"></td>' +
            '<td><input type="text" data-well-med="notes" value="' +
            escapeHtml(m.notes || "") +
            '" aria-label="Notes"></td>' +
            '<td><button type="button" class="well-icon-btn" data-well-med-remove="' +
            i +
            '" aria-label="Remove medication">×</button></td>' +
            "</tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="' +
        (editable ? 5 : 4) +
        '" class="well-empty-cell">No medications recorded.</td></tr>';

    return (
      '<div class="well-table-wrap">' +
      '<table class="well-table" aria-label="Medications">' +
      "<thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Notes</th>" +
      (editable ? "<th></th>" : "") +
      "</tr></thead><tbody data-well-meds-body>" +
      rows +
      "</tbody></table></div>" +
      (editable
        ? '<button type="button" class="btn btn-secondary well-mini-btn" data-well-med-add>Add medication</button>'
        : "")
    );
  }

  function renderAllergiesTable(allergies, editable) {
    var rows =
      (allergies || [])
        .map(function (a, i) {
          if (!editable) {
            return (
              "<tr><td>" +
              escapeHtml(a.substance) +
              "</td><td>" +
              escapeHtml(a.reaction || "") +
              "</td><td>" +
              escapeHtml(a.severity || "") +
              "</td></tr>"
            );
          }
          return (
            '<tr data-well-allergy-row="' +
            i +
            '">' +
            '<td><input type="text" data-well-allergy="substance" value="' +
            escapeHtml(a.substance) +
            '" aria-label="Substance"></td>' +
            '<td><input type="text" data-well-allergy="reaction" value="' +
            escapeHtml(a.reaction || "") +
            '" aria-label="Reaction"></td>' +
            '<td><input type="text" data-well-allergy="severity" value="' +
            escapeHtml(a.severity || "") +
            '" aria-label="Severity"></td>' +
            '<td><button type="button" class="well-icon-btn" data-well-allergy-remove="' +
            i +
            '" aria-label="Remove allergy">×</button></td></tr>'
          );
        })
        .join("") ||
      '<tr><td colspan="' +
        (editable ? 4 : 3) +
        '" class="well-empty-cell">No allergies recorded.</td></tr>';

    return (
      '<div class="well-table-wrap">' +
      '<table class="well-table" aria-label="Allergies">' +
      "<thead><tr><th>Substance</th><th>Reaction</th><th>Severity</th>" +
      (editable ? "<th></th>" : "") +
      "</tr></thead><tbody data-well-allergies-body>" +
      rows +
      "</tbody></table></div>" +
      (editable
        ? '<button type="button" class="btn btn-secondary well-mini-btn" data-well-allergy-add>Add allergy</button>'
        : "")
    );
  }

  /** ICD-10-ish: accept "F84.0" or "F 84.0"; display with space after letter when present. */
  function normalizeDxCode(raw) {
    var s = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
    var m = s.match(/^([A-TV-Z])(\d[\dA-Z.]*)$/);
    if (m) return m[1] + " " + m[2];
    return String(raw || "").trim();
  }

  function renderDiagnosesTable(diagnoses, editable) {
    var rows =
      (diagnoses || [])
        .map(function (d, i) {
          var code = normalizeDxCode(d.code || "");
          var treated = !!d.treated;
          var rowClass = treated ? " well-dx-row--treated" : "";
          if (!editable) {
            return (
              '<tr class="' +
              rowClass.trim() +
              '">' +
              "<td><code class=\"well-dx-code\">" +
              escapeHtml(code) +
              "</code></td><td>" +
              escapeHtml(d.description || "") +
              '</td><td class="well-dx-treated-cell">' +
              (treated
                ? '<span class="well-dx-treated-pill">Treated / resolved</span>'
                : '<span class="well-muted">Active</span>') +
              "</td></tr>"
            );
          }
          return (
            '<tr data-well-dx-row="' +
            i +
            '" class="' +
            rowClass.trim() +
            '">' +
            '<td><input type="text" data-well-dx="code" value="' +
            escapeHtml(code) +
            '" aria-label="Diagnostic code" placeholder="F 84.0" spellcheck="false"></td>' +
            '<td><input type="text" data-well-dx="description" value="' +
            escapeHtml(d.description || "") +
            '" aria-label="Diagnosis description"></td>' +
            '<td class="well-dx-treated-cell">' +
            '<label class="well-dx-check">' +
            '<input type="checkbox" data-well-dx="treated"' +
            (treated ? " checked" : "") +
            '> <span>Treated / resolved</span></label></td>' +
            '<td><button type="button" class="well-icon-btn" data-well-dx-remove="' +
            i +
            '" aria-label="Remove diagnosis">×</button></td></tr>'
          );
        })
        .join("") ||
      '<tr><td colspan="' +
      (editable ? 4 : 3) +
      '" class="well-empty-cell">No diagnoses recorded.</td></tr>';

    return (
      '<div class="well-table-wrap">' +
      '<table class="well-table well-table--diagnoses" aria-label="Diagnoses">' +
      "<thead><tr><th>Code</th><th>Description</th><th>Status</th>" +
      (editable ? "<th></th>" : "") +
      "</tr></thead><tbody data-well-dx-body>" +
      rows +
      "</tbody></table></div>" +
      (editable
        ? '<button type="button" class="btn btn-secondary well-mini-btn" data-well-dx-add>Add diagnosis</button>'
        : "") +
      '<p class="well-tiny well-muted well-dx-hint">ICD-10 style codes (e.g. <code>F 84.0</code> or <code>F84.0</code>). Check “Treated / resolved” to mark treated out of diagnosis.</p>'
    );
  }

  function renderAppleHealthAuditHtml(audit) {
    var list = (audit || []).slice().sort(function (a, b) {
      return String(b.at || "").localeCompare(String(a.at || ""));
    });
    if (!list.length) {
      return '<p class="well-muted well-tiny">No Apple Health audit events yet.</p>';
    }
    return (
      '<details class="well-audit-log well-ah-audit" open>' +
      "<summary>Apple Health audit log (" +
      list.length +
      ") · append-only</summary>" +
      '<ul class="well-list well-list--compact well-audit-list">' +
      list
        .map(function (a) {
          return (
            "<li><strong>" +
            escapeHtml(a.action || "") +
            "</strong> · " +
            escapeHtml(a.at || "") +
            '<br><span class="well-muted">' +
            escapeHtml(a.by || "") +
            (a.uploadId ? " · file " + escapeHtml(a.uploadId) : "") +
            (a.detail ? " — " + escapeHtml(a.detail) : "") +
            "</span></li>"
          );
        })
        .join("") +
      "</ul></details>"
    );
  }

  function renderAppleHealthUploadsHtml(uploads, editable) {
    var list = uploads || [];
    if (!list.length) {
      return '<p class="well-muted">No Apple Health exports uploaded yet.</p>';
    }
    return (
      '<ul class="well-list well-ah-uploads">' +
      list
        .map(function (u) {
          return (
            "<li>" +
            "<strong>" +
            escapeHtml(u.fileName || "export") +
            "</strong>" +
            ' <span class="well-audit-badge">Stored</span>' +
            "<br><span class=\"well-muted\">" +
            escapeHtml(u.uploadedAt || "") +
            " · " +
            escapeHtml(formatBytes(u.sizeBytes)) +
            " · " +
            escapeHtml(u.kind || u.mimeType || "file") +
            "</span>" +
            ' <button type="button" class="btn btn-secondary well-mini-btn" data-well-ah-download="' +
            escapeHtml(u.id) +
            '">Download copy</button>' +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderAppleHealthSectionHtml(data, editable) {
    ensureAppleHealth(data);
    var ah = data.appleHealth;
    var c = ah.consent;
    var granted = !!c.granted;
    var scopesHtml =
      "<ul class=\"well-ah-scopes\">" +
      (c.scopes || APPLE_HEALTH_SCOPES)
        .map(function (s) {
          return "<li>" + escapeHtml(s) + "</li>";
        })
        .join("") +
      "</ul>";

    var statusHtml = granted
      ? '<p class="well-ah-status well-ah-status--granted" role="status"><strong>Permission granted</strong>' +
        (c.grantedAt ? " · " + escapeHtml(c.grantedAt) : "") +
        ". Your care team may use uploaded Apple Health export data listed below.</p>"
      : '<p class="well-ah-status well-ah-status--revoked" role="status"><strong>Permission not granted</strong>' +
        (c.revokedAt ? " · last revoked " + escapeHtml(c.revokedAt) : "") +
        ". Upload is locked until you grant permission.</p>";

    var consentActions = "";
    if (editable) {
      consentActions = granted
        ? '<button type="button" class="btn btn-secondary" data-well-ah-revoke>Revoke permission</button>'
        : '<button type="button" class="btn btn-primary" data-well-ah-grant>Grant permission</button>';
    } else {
      consentActions =
        '<p class="well-muted well-tiny">Provider view · consent is managed on the Patient portal.</p>';
    }

    var uploadBlock = "";
    if (editable) {
      uploadBlock =
        '<div class="well-ah-upload' +
        (granted ? "" : " is-disabled") +
        '">' +
        "<h4>Upload Apple Health export</h4>" +
        '<p class="well-muted well-tiny">On iPhone: Health → profile → Export All Health Data → share the <code>export.zip</code> (contains <code>export.xml</code>). You may also upload a bare <code>.xml</code>.</p>' +
        '<label class="well-field" for="well-ah-file">' +
        '<span class="well-sr-only">Choose Apple Health export file</span>' +
        '<input type="file" id="well-ah-file" data-well-ah-file accept=".zip,.xml,application/zip,text/xml,application/xml"' +
        (granted ? "" : " disabled") +
        ">" +
        "</label>" +
        '<div class="well-compose-actions">' +
        '<button type="button" class="btn btn-primary" data-well-ah-upload' +
        (granted ? "" : " disabled") +
        ">Store export in portal</button>" +
        '<span class="commune-status well-status" data-well-ah-status hidden role="status" aria-live="polite"></span>' +
        "</div>" +
        '<p class="well-muted well-tiny">Max ' +
        formatBytes(APPLE_HEALTH_MAX_BYTES) +
        " · stored in this browser (IndexedDB) with an append-only audit entry.</p>" +
        "</div>";
    }

    return (
      '<div class="well-doc-form well-ah-panel" data-well-doc="applehealth">' +
      '<p class="well-doc-lead">Share Apple Health data with your WELL care team. <strong>Local demo · manual export only.</strong></p>' +
      '<div class="well-ah-honest" role="note">' +
      "<strong>Manual export only.</strong> Local demo — this web portal does <em>not</em> do live HealthKit sync. " +
      "Continuous / background HealthKit access needs a native iOS app later. " +
      "Today you can grant permission and upload an Apple Health export file." +
      "</div>" +
      '<section class="well-ah-consent" aria-labelledby="well-ah-consent-title">' +
      '<h3 id="well-ah-consent-title">Permission to share</h3>' +
      "<p>If you grant permission, WELL may store and show your care team the categories below from any export you upload:</p>" +
      scopesHtml +
      "<p class=\"well-muted well-tiny\">You can revoke anytime. Revoking stops new uploads; prior uploads and the audit log stay (append-only).</p>" +
      statusHtml +
      '<div class="well-compose-actions">' +
      consentActions +
      "</div></section>" +
      uploadBlock +
      '<section class="well-ah-stored" aria-labelledby="well-ah-stored-title">' +
      '<h3 id="well-ah-stored-title">Stored exports</h3>' +
      renderAppleHealthUploadsHtml(ah.uploads, editable) +
      "</section>" +
      renderAppleHealthAuditHtml(ah.audit) +
      "</div>"
    );
  }

  function renderSectionBody(sectionId, data, editable, idPrefix) {

    var c = data.chart;
    var p = idPrefix || (editable ? "pt" : "pv");
    var ro = !editable;

    if (sectionId === "intake") {
      var i = c.intake;
      return (
        '<form class="well-doc-form" data-well-doc="intake" ' +
        (ro ? 'aria-readonly="true"' : "") +
        ">" +
        '<p class="well-doc-lead">Patient intake / demographics documentation.</p>' +
        '<div class="well-fields-grid">' +
        fieldRow("Chief complaint", "chiefComplaint", i.chiefComplaint, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        fieldRow("Preferred pharmacy", "preferredPharmacy", i.preferredPharmacy, { readonly: ro, idPrefix: p }) +
        fieldRow("Emergency contact", "emergencyContact", i.emergencyContact, { readonly: ro, idPrefix: p }) +
        fieldRow("Insurance", "insurance", i.insurance, { readonly: ro, idPrefix: p }) +
        fieldRow("Consent on file (demo)", "consentSigned", i.consentSigned, { readonly: ro, type: "checkbox", idPrefix: p }) +
        "</div></form>"
      );
    }

    if (sectionId === "hpi") {
      var h = c.hpi;
      return (
        '<form class="well-doc-form" data-well-doc="hpi">' +
        '<p class="well-doc-lead">History of Present Illness (OLDCARTS-style).</p>' +
        '<div class="well-fields-grid well-fields-grid--2">' +
        fieldRow("Onset", "onset", h.onset, { readonly: ro, idPrefix: p }) +
        fieldRow("Location", "location", h.location, { readonly: ro, idPrefix: p }) +
        fieldRow("Duration", "duration", h.duration, { readonly: ro, idPrefix: p }) +
        fieldRow("Character", "character", h.character, { readonly: ro, idPrefix: p }) +
        fieldRow("Aggravating", "aggravating", h.aggravating, { readonly: ro, idPrefix: p }) +
        fieldRow("Relieving", "relieving", h.relieving, { readonly: ro, idPrefix: p }) +
        fieldRow("Timing", "timing", h.timing, { readonly: ro, idPrefix: p }) +
        fieldRow("Severity", "severity", h.severity, { readonly: ro, idPrefix: p }) +
        "</div>" +
        fieldRow("Associated symptoms", "associated", h.associated, { readonly: ro, idPrefix: p }) +
        fieldRow("Narrative / HPI", "narrative", h.narrative, { readonly: ro, multiline: true, rows: 5, idPrefix: p }) +
        "</form>"
      );
    }

    if (sectionId === "vitals") {
      var v = c.vitals;
      return (
        '<form class="well-doc-form" data-well-doc="vitals">' +
        '<p class="well-doc-lead">Vital signs flowsheet (demo).</p>' +
        '<div class="well-vitals-grid">' +
        fieldRow("Recorded at", "recordedAt", v.recordedAt, { readonly: ro, idPrefix: p }) +
        fieldRow("BP systolic", "bpSys", v.bpSys, { readonly: ro, idPrefix: p }) +
        fieldRow("BP diastolic", "bpDia", v.bpDia, { readonly: ro, idPrefix: p }) +
        fieldRow("Heart rate", "hr", v.hr, { readonly: ro, idPrefix: p }) +
        fieldRow("Temp °F", "tempF", v.tempF, { readonly: ro, idPrefix: p }) +
        fieldRow("Resp rate", "rr", v.rr, { readonly: ro, idPrefix: p }) +
        fieldRow("SpO₂ %", "spo2", v.spo2, { readonly: ro, idPrefix: p }) +
        fieldRow("Weight (lb)", "weightLb", v.weightLb, { readonly: ro, idPrefix: p }) +
        fieldRow("Height (in)", "heightIn", v.heightIn, { readonly: ro, idPrefix: p }) +
        fieldRow("Pain (0–10)", "pain", v.pain, { readonly: ro, idPrefix: p }) +
        "</div></form>"
      );
    }

    if (sectionId === "meds") {
      return (
        '<div class="well-doc-form" data-well-doc="meds">' +
        '<p class="well-doc-lead">Active medication list.</p>' +
        renderMedsTable(c.meds, editable, p) +
        "</div>"
      );
    }

    if (sectionId === "allergies") {
      return (
        '<div class="well-doc-form" data-well-doc="allergies">' +
        '<p class="well-doc-lead">Allergy / adverse reaction list.</p>' +
        renderAllergiesTable(c.allergies, editable) +
        "</div>"
      );
    }

    if (sectionId === "diagnoses") {
      return (
        '<div class="well-doc-form" data-well-doc="diagnoses">' +
        '<p class="well-doc-lead">Problem list / diagnostic codes (ICD-10 style). Patient fillable · provider view-only.</p>' +
        renderDiagnosesTable(c.diagnoses, editable) +
        "</div>"
      );
    }

    if (sectionId === "progress") {
      var pr = c.progress;
      return (
        '<form class="well-doc-form" data-well-doc="progress">' +
        '<p class="well-doc-lead">Progress note template (SOAP).</p>' +
        '<div class="well-fields-grid well-fields-grid--2">' +
        fieldRow("Template", "template", pr.template, { readonly: ro, idPrefix: p }) +
        fieldRow("Author", "author", pr.author, { readonly: ro, idPrefix: p }) +
        "</div>" +
        fieldRow("Subjective", "subjective", pr.subjective, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        fieldRow("Objective", "objective", pr.objective, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        fieldRow("Assessment", "assessment", pr.assessment, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        fieldRow("Plan", "plan", pr.plan, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        fieldRow("Signed at (demo)", "signedAt", pr.signedAt, { readonly: ro, idPrefix: p }) +
        "</form>"
      );
    }

    if (sectionId === "plan") {
      var pl = c.plan;
      return (
        '<form class="well-doc-form" data-well-doc="plan">' +
        '<p class="well-doc-lead">Care plan / goals (read-only on provider side).</p>' +
        fieldRow("Goals", "goals", pl.goals, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        fieldRow("Tasks", "tasks", pl.tasks, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        fieldRow("Notes", "notes", pl.notes, { readonly: ro, multiline: true, rows: 3, idPrefix: p }) +
        "</form>"
      );
    }

    if (sectionId === "applehealth") {
      return renderAppleHealthSectionHtml(data, editable);
    }

    return "<p>Unknown section.</p>";
  }

  function collectFormFields(container, sectionId) {
    var data = PortalStore.get();
    if (sectionId === "applehealth") {
      return ensureAppleHealth(data);
    }
    var form = container.querySelector('[data-well-doc="' + sectionId + '"]');
    if (!form) return data;

    if (sectionId === "meds") {
      var meds = [];
      form.querySelectorAll("[data-well-med-row]").forEach(function (row) {
        meds.push({
          name: (row.querySelector('[data-well-med="name"]') || {}).value || "",
          dose: (row.querySelector('[data-well-med="dose"]') || {}).value || "",
          freq: (row.querySelector('[data-well-med="freq"]') || {}).value || "",
          notes: (row.querySelector('[data-well-med="notes"]') || {}).value || "",
        });
      });
      data.chart.meds = meds.filter(function (m) {
        return m.name.trim();
      });
      return data;
    }

    if (sectionId === "allergies") {
      var allergies = [];
      form.querySelectorAll("[data-well-allergy-row]").forEach(function (row) {
        allergies.push({
          substance: (row.querySelector('[data-well-allergy="substance"]') || {}).value || "",
          reaction: (row.querySelector('[data-well-allergy="reaction"]') || {}).value || "",
          severity: (row.querySelector('[data-well-allergy="severity"]') || {}).value || "",
        });
      });
      data.chart.allergies = allergies.filter(function (a) {
        return a.substance.trim();
      });
      return data;
    }

    if (sectionId === "diagnoses") {
      var diagnoses = [];
      form.querySelectorAll("[data-well-dx-row]").forEach(function (row) {
        var treatedEl = row.querySelector('[data-well-dx="treated"]');
        diagnoses.push({
          code: normalizeDxCode((row.querySelector('[data-well-dx="code"]') || {}).value || ""),
          description: (row.querySelector('[data-well-dx="description"]') || {}).value || "",
          treated: !!(treatedEl && treatedEl.checked),
        });
      });
      data.chart.diagnoses = diagnoses.filter(function (d) {
        return d.code.trim() || d.description.trim();
      });
      return data;
    }

    var target = data.chart[sectionId];
    if (!target || typeof target !== "object") return data;
    form.querySelectorAll("[data-well-field]").forEach(function (el) {
      var key = el.getAttribute("data-well-field");
      if (!key) return;
      if (el.type === "checkbox") target[key] = !!el.checked;
      else target[key] = el.value;
    });
    return data;
  }

  function setStatus(root, msg, isError) {
    var el = root.querySelector("[data-well-status]");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
    el.classList.toggle("is-error", !!isError);
  }

  function setAhStatus(host, msg, isError) {
    var el = host.querySelector("[data-well-ah-status]");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
    el.classList.toggle("is-error", !!isError);
  }

  function bindAppleHealthEditors(root, host) {
    var grantBtn = host.querySelector("[data-well-ah-grant]");
    var revokeBtn = host.querySelector("[data-well-ah-revoke]");
    var uploadBtn = host.querySelector("[data-well-ah-upload]");
    var fileInput = host.querySelector("[data-well-ah-file]");

    if (grantBtn) {
      grantBtn.addEventListener("click", function () {
        var data = ensureAppleHealth(PortalStore.get());
        data.appleHealth.consent.granted = true;
        data.appleHealth.consent.grantedAt = nowStamp();
        data.appleHealth.consent.revokedAt = "";
        data.appleHealth.consent.scopes = APPLE_HEALTH_SCOPES.slice();
        data.appleHealth.consent.version = 1;
        appendAppleHealthAudit(
          data,
          "consent_granted",
          "Patient granted permission to share Apple Health export categories with WELL"
        );
        data.prefs.lastSection = "applehealth";
        PortalStore.save(data);
        renderPatient(root, PortalStore.get(), "applehealth");
        setStatus(root, "Apple Health permission granted · logged in audit trail.", false);
      });
    }

    if (revokeBtn) {
      revokeBtn.addEventListener("click", function () {
        var data = ensureAppleHealth(PortalStore.get());
        data.appleHealth.consent.granted = false;
        data.appleHealth.consent.revokedAt = nowStamp();
        appendAppleHealthAudit(
          data,
          "consent_revoked",
          "Patient revoked Apple Health share permission (prior uploads + audit retained)"
        );
        data.prefs.lastSection = "applehealth";
        PortalStore.save(data);
        renderPatient(root, PortalStore.get(), "applehealth");
        setStatus(root, "Apple Health permission revoked · prior uploads kept in audit trail.", false);
      });
    }

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", function () {
        var data = ensureAppleHealth(PortalStore.get());
        if (!data.appleHealth.consent.granted) {
          setAhStatus(host, "Grant permission before uploading.", true);
          return;
        }
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
          setAhStatus(host, "Choose an export.zip or .xml file first.", true);
          return;
        }
        if (!isAllowedAppleHealthFile(file)) {
          setAhStatus(host, "Only Apple Health export.zip or .xml files are accepted.", true);
          return;
        }
        if (file.size > APPLE_HEALTH_MAX_BYTES) {
          setAhStatus(
            host,
            "File too large (max " + formatBytes(APPLE_HEALTH_MAX_BYTES) + ").",
            true
          );
          return;
        }
        uploadBtn.disabled = true;
        setAhStatus(host, "Storing export…", false);
        var id = newId("ahu");
        var nameLower = String(file.name).toLowerCase();
        var kind = nameLower.endsWith(".xml")
          ? "xml"
          : nameLower.endsWith(".zip")
            ? "zip"
            : file.type || "file";
        var meta = {
          id: id,
          fileName: file.name,
          mimeType: file.type || "",
          kind: kind,
          sizeBytes: file.size,
          uploadedAt: nowStamp(),
          immutable: true,
        };
        ahPutFile(id, file, meta)
          .then(function () {
            var cur = ensureAppleHealth(PortalStore.get());
            if (!cur.appleHealth.consent.granted) {
              setAhStatus(host, "Permission was revoked before store finished.", true);
              uploadBtn.disabled = false;
              return;
            }
            cur.appleHealth.uploads.push(meta);
            appendAppleHealthAudit(
              cur,
              "upload_stored",
              "Stored Apple Health export “" +
                file.name +
                "” (" +
                formatBytes(file.size) +
                ")",
              { uploadId: id }
            );
            cur.prefs.lastSection = "applehealth";
            if (!PortalStore.save(cur)) {
              setAhStatus(host, "Could not save metadata (storage blocked).", true);
              uploadBtn.disabled = false;
              return;
            }
            renderPatient(root, PortalStore.get(), "applehealth");
            setStatus(
              root,
              "Apple Health export stored with audit trail · " + file.name,
              false
            );
          })
          .catch(function (err) {
            setAhStatus(
              host,
              "Could not store file: " + ((err && err.message) || "unknown error"),
              true
            );
            uploadBtn.disabled = false;
          });
      });
    }

    host.querySelectorAll("[data-well-ah-download]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-well-ah-download");
        if (!id) return;
        ahGetFile(id)
          .then(function (rec) {
            if (!rec || !rec.blob) {
              setStatus(root, "Stored file not found in this browser.", true);
              return;
            }
            var url = URL.createObjectURL(rec.blob);
            var a = document.createElement("a");
            a.href = url;
            a.download =
              (rec.meta && rec.meta.fileName) ||
              "apple-health-export.bin";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () {
              URL.revokeObjectURL(url);
            }, 2000);
          })
          .catch(function () {
            setStatus(root, "Could not read stored export from IndexedDB.", true);
          });
      });
    });
  }

  function bindPatientEditors(root, host, sectionId) {

    var saveBtn = host.querySelector("[data-well-save]");
    var resetBtn = host.querySelector("[data-well-reset-section]");

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var data = collectFormFields(host, sectionId);
        data.prefs.lastSection = sectionId;
        if (!PortalStore.save(data)) {
          setStatus(root, "Could not save (storage full or blocked).", true);
          return;
        }
        setStatus(root, "Chart documentation saved locally · " + sectionId + ".", false);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        var data = PortalStore.get();
        var seed = deepClone(DEMO_SEED);
        if (sectionId === "meds" || sectionId === "allergies" || sectionId === "diagnoses") {
          data.chart[sectionId] = seed.chart[sectionId];
        } else if (seed.chart[sectionId]) {
          data.chart[sectionId] = seed.chart[sectionId];
        }
        PortalStore.save(data);
        renderPatient(root, data, sectionId);
        setStatus(root, "Section reset to demo defaults.", false);
      });
    }

    host.querySelectorAll("[data-well-med-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var data = collectFormFields(host, "meds");
        data.chart.meds.push({ name: "", dose: "", freq: "", notes: "" });
        PortalStore.save(data);
        renderPatient(root, data, "meds");
      });
    });
    host.querySelectorAll("[data-well-med-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var data = collectFormFields(host, "meds");
        var idx = parseInt(btn.getAttribute("data-well-med-remove"), 10);
        if (!isNaN(idx)) data.chart.meds.splice(idx, 1);
        PortalStore.save(data);
        renderPatient(root, data, "meds");
      });
    });
    host.querySelectorAll("[data-well-allergy-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var data = collectFormFields(host, "allergies");
        data.chart.allergies.push({ substance: "", reaction: "", severity: "" });
        PortalStore.save(data);
        renderPatient(root, data, "allergies");
      });
    });
    host.querySelectorAll("[data-well-allergy-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var data = collectFormFields(host, "allergies");
        var idx = parseInt(btn.getAttribute("data-well-allergy-remove"), 10);
        if (!isNaN(idx)) data.chart.allergies.splice(idx, 1);
        PortalStore.save(data);
        renderPatient(root, data, "allergies");
      });
    });

    host.querySelectorAll("[data-well-dx-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var data = collectFormFields(host, "diagnoses");
        data.chart.diagnoses.push({ code: "", description: "", treated: false });
        PortalStore.save(data);
        renderPatient(root, data, "diagnoses");
      });
    });
    host.querySelectorAll("[data-well-dx-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var data = collectFormFields(host, "diagnoses");
        var idx = parseInt(btn.getAttribute("data-well-dx-remove"), 10);
        if (!isNaN(idx)) data.chart.diagnoses.splice(idx, 1);
        PortalStore.save(data);
        renderPatient(root, data, "diagnoses");
      });
    });
    /* Live toggle treated styling without full re-save wait */
    host.querySelectorAll('[data-well-dx="treated"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        var row = cb.closest("[data-well-dx-row]");
        if (row) row.classList.toggle("well-dx-row--treated", !!cb.checked);
      });
    });
  }


  function nowStamp() {
    var d = new Date();
    function pad(n) {
      return n < 10 ? "0" + n : String(n);
    }
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  function newId(prefix) {
    return (
      prefix +
      Date.now().toString(36) +
      Math.floor(Math.random() * 1e4).toString(36)
    );
  }

  function defaultAppleHealth() {
    return {
      consent: {
        granted: false,
        grantedAt: "",
        revokedAt: "",
        version: 1,
        scopes: APPLE_HEALTH_SCOPES.slice(),
      },
      uploads: [],
      audit: [],
    };
  }

  function ensureAppleHealth(data) {
    data = data || {};
    var seed = defaultAppleHealth();
    if (!data.appleHealth || typeof data.appleHealth !== "object") {
      data.appleHealth = seed;
      return data;
    }
    var ah = data.appleHealth;
    if (!ah.consent || typeof ah.consent !== "object") ah.consent = seed.consent;
    if (!Array.isArray(ah.consent.scopes) || !ah.consent.scopes.length) {
      ah.consent.scopes = APPLE_HEALTH_SCOPES.slice();
    }
    if (typeof ah.consent.granted !== "boolean") ah.consent.granted = !!ah.consent.granted;
    if (ah.consent.grantedAt == null) ah.consent.grantedAt = "";
    if (ah.consent.revokedAt == null) ah.consent.revokedAt = "";
    if (!ah.consent.version) ah.consent.version = 1;
    if (!Array.isArray(ah.uploads)) ah.uploads = [];
    if (!Array.isArray(ah.audit)) ah.audit = [];
    data.appleHealth = ah;
    return data;
  }

  function mergeAppleHealthAppendOnly(prevAh, nextAh) {
    var base = defaultAppleHealth();
    prevAh = prevAh && typeof prevAh === "object" ? prevAh : null;
    nextAh = nextAh && typeof nextAh === "object" ? nextAh : null;
    var consentSrc = (nextAh && nextAh.consent) || (prevAh && prevAh.consent) || base.consent;
    base.consent = {
      granted: !!consentSrc.granted,
      grantedAt: consentSrc.grantedAt || "",
      revokedAt: consentSrc.revokedAt || "",
      version: Number(consentSrc.version) || 1,
      scopes:
        Array.isArray(consentSrc.scopes) && consentSrc.scopes.length
          ? consentSrc.scopes.slice()
          : APPLE_HEALTH_SCOPES.slice(),
    };
    var upById = {};
    var upOut = [];
    function takeUp(list) {
      (list || []).forEach(function (u) {
        if (!u || !u.id) return;
        if (upById[u.id]) return;
        var row = Object.assign({}, u);
        row.immutable = true;
        upById[u.id] = row;
        upOut.push(row);
      });
    }
    takeUp(prevAh && prevAh.uploads);
    takeUp(nextAh && nextAh.uploads);
    takeUp(base.uploads);
    upOut.sort(function (a, b) {
      return String(a.uploadedAt || "").localeCompare(String(b.uploadedAt || ""));
    });
    base.uploads = upOut;
    var audById = {};
    var audOut = [];
    function takeAud(list) {
      (list || []).forEach(function (a) {
        if (!a) return;
        var id =
          a.id ||
          String(a.at || "") +
            "|" +
            String(a.action || "") +
            "|" +
            String(a.uploadId || "") +
            "|" +
            String(a.detail || "");
        if (audById[id]) return;
        var row = Object.assign({ id: id }, a);
        audById[id] = row;
        audOut.push(row);
      });
    }
    takeAud(prevAh && prevAh.audit);
    takeAud(nextAh && nextAh.audit);
    audOut.sort(function (a, b) {
      return String(a.at || "").localeCompare(String(b.at || ""));
    });
    base.audit = audOut;
    return base;
  }

  function appendAppleHealthAudit(data, action, detail, extra) {
    ensureAppleHealth(data);
    var row = Object.assign(
      {
        id: newId("aha"),
        at: nowStamp(),
        action: action,
        by: "patient",
        detail: detail || "",
        uploadId: "",
      },
      extra || {}
    );
    data.appleHealth.audit.push(row);
    return row;
  }

  function ahOpenDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB unavailable in this browser"));
        return;
      }
      var req = indexedDB.open(APPLE_HEALTH_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(APPLE_HEALTH_STORE)) {
          db.createObjectStore(APPLE_HEALTH_STORE);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("IndexedDB open failed"));
      };
    });
  }

  function ahPutFile(id, blob, meta) {
    return ahOpenDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(APPLE_HEALTH_STORE, "readwrite");
        tx.oncomplete = function () {
          resolve(true);
        };
        tx.onerror = function () {
          reject(tx.error || new Error("IndexedDB write failed"));
        };
        tx.objectStore(APPLE_HEALTH_STORE).put(
          {
            id: id,
            blob: blob,
            meta: meta || {},
            storedAt: nowStamp(),
          },
          id
        );
      });
    });
  }

  function ahGetFile(id) {
    return ahOpenDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(APPLE_HEALTH_STORE, "readonly");
        var req = tx.objectStore(APPLE_HEALTH_STORE).get(id);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          reject(req.error || new Error("IndexedDB read failed"));
        };
      });
    });
  }

  function formatBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function isAllowedAppleHealthFile(file) {
    if (!file || !file.name) return false;
    var name = String(file.name).toLowerCase();
    var type = String(file.type || "").toLowerCase();
    if (name.endsWith(".zip") || name.endsWith(".xml")) return true;
    if (
      type === "application/zip" ||
      type === "application/x-zip-compressed" ||
      type === "text/xml" ||
      type === "application/xml"
    ) {
      return true;
    }
    return false;
  }

  function normalizeMessage(m) {
    m = m || {};
    var role = m.fromRole;
    if (role !== "provider" && role !== "patient") {
      var f = String(m.from || "").toLowerCase();
      role = f === "you" || f.indexOf("patient") !== -1 ? "patient" : "provider";
    }
    return {
      id: m.id || newId("m"),
      fromRole: role,
      from: m.from || (role === "patient" ? "You" : "Care team"),
      at: m.at || nowStamp(),
      body: m.body || "",
    };
  }

  function renderMessageThread(messages) {
    return (messages || [])
      .map(function (raw) {
        var m = normalizeMessage(raw);
        return (
          '<div class="well-msg well-msg--' +
          escapeHtml(m.fromRole) +
          '"><div class="well-msg-meta">' +
          escapeHtml(m.from) +
          " · " +
          escapeHtml(m.at) +
          '</div><div class="well-msg-body">' +
          escapeHtml(m.body) +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderDoctorNotesHtml(notes, opts) {
    opts = opts || {};
    var list = notes || [];
    if (!list.length) {
      return '<p class="well-muted well-tiny">No doctor notes yet.</p>';
    }
    return list
      .map(function (n) {
        return (
          '<article class="well-doctor-note" data-doctor-note-id="' +
          escapeHtml(n.id || "") +
          '">' +
          '<div class="well-doctor-note-meta">' +
          "<span>" +
          escapeHtml(n.author || "Provider") +
          " · " +
          escapeHtml(n.at || "") +
          "</span>" +
          '<span class="well-audit-badge">Audit only</span>' +
          "</div>" +
          '<div class="well-doctor-note-body">' +
          escapeHtml(n.body || "") +
          "</div>" +
          (opts.patientView
            ? '<p class="well-doctor-note-foot">Visible in your portal · cannot be edited or deleted</p>'
            : '<p class="well-doctor-note-foot">Append-only · not deletable from patient portal</p>') +
          "</article>"
        );
      })
      .join("");
  }

  function appendPortalMessage(fromRole, body) {
    var cur = PortalStore.get();
    var textBody = String(body || "").trim();
    if (!textBody) return cur;
    var label =
      fromRole === "provider"
        ? (cur.provider && cur.provider.name) || "Care team"
        : "You";
    if (!Array.isArray(cur.messages)) cur.messages = [];
    cur.messages.push(
      normalizeMessage({
        id: newId("m"),
        fromRole: fromRole,
        from: label,
        at: nowStamp(),
        body: textBody,
      })
    );
    PortalStore.save(cur);
    return cur;
  }

  function appendDoctorNote(body) {
    var cur = PortalStore.get();
    var textBody = String(body || "").trim();
    if (!textBody) return cur;
    if (!Array.isArray(cur.doctorNotes)) cur.doctorNotes = [];
    if (!Array.isArray(cur.doctorNotesAudit)) cur.doctorNotesAudit = [];
    var note = {
      id: newId("dn"),
      at: nowStamp(),
      author: (cur.provider && cur.provider.name) || "Provider",
      body: textBody,
      immutable: true,
    };
    cur.doctorNotes.push(note);
    cur.doctorNotesAudit.push({
      id: newId("aud"),
      at: note.at,
      action: "append",
      noteId: note.id,
      by: note.author,
      detail: "Doctor note created (append-only)",
    });
    PortalStore.save(cur);
    return cur;
  }

  function renderAuditLogHtml(audit) {
    var list = (audit || []).slice().sort(function (a, b) {
      return String(b.at || "").localeCompare(String(a.at || ""));
    });
    if (!list.length) {
      return '<p class="well-muted well-tiny">No audit events yet.</p>';
    }
    return (
      '<details class="well-audit-log">' +
      "<summary>Audit log (" +
      list.length +
      ")</summary>" +
      '<ul class="well-list well-list--compact well-audit-list">' +
      list
        .map(function (a) {
          return (
            "<li><strong>" +
            escapeHtml(a.action || "") +
            "</strong> · " +
            escapeHtml(a.at || "") +
            '<br><span class="well-muted">' +
            escapeHtml(a.by || "") +
            (a.noteId ? " · note " + escapeHtml(a.noteId) : "") +
            (a.detail ? " — " + escapeHtml(a.detail) : "") +
            "</span></li>"
          );
        })
        .join("") +
      "</ul></details>"
    );
  }

  function renderPatient(root, data, forceSection) {
    var host = root.querySelector("[data-well-patient-root]");
    if (!host) return;
    data = data || PortalStore.get();
    var sectionId = forceSection || data.prefs.lastSection || "intake";
    if (!CHART_SECTIONS.some(function (s) { return s.id === sectionId; })) sectionId = "intake";

    /* Patient rail: own appointments + messages only — never a providers directory/list */
    var myAppts = patientFacingAppointments(data);
    var apptHtml =
      '<aside class="well-side-rail" aria-label="Appointments and messages">' +
      '<section class="well-rail-card">' +
      "<h4>Upcoming appointments</h4><ul class=\"well-list\">" +
      (myAppts.length
        ? myAppts
            .map(function (a) {
              return (
                "<li><strong>" +
                escapeHtml(a.when) +
                "</strong><br>" +
                escapeHtml(a.reason) +
                "<br><span class=\"well-muted\">" +
                escapeHtml(a.where) +
                "</span></li>"
              );
            })
            .join("")
        : '<li class="well-muted">No upcoming appointments.</li>') +
      "</ul></section>" +
      '<section class="well-rail-card">' +
      "<h4>Messages with your doctor</h4>" +
      '<div class="well-thread" role="log" aria-label="Doctor to patient messages">' +
      renderMessageThread(data.messages) +
      "</div>" +
      '<form class="well-compose" data-well-patient-compose>' +
      '<label class="well-sr-only" for="well-pt-msg">Message your care team</label>' +
      '<textarea id="well-pt-msg" data-well-patient-msg placeholder="Write a message to your care team…" rows="3"></textarea>' +
      '<div class="well-compose-actions">' +
      '<button type="submit" class="btn btn-primary">Send to care team</button>' +
      "</div></form>" +
      '<p class="well-muted well-tiny">Doctor replies appear here · demo stays in this browser</p></section>' +
      '<section class="well-rail-card">' +
      "<h4>Notes from your doctor</h4>" +
      renderDoctorNotesHtml(data.doctorNotes, { patientView: true }) +
      renderAuditLogHtml(data.doctorNotesAudit) +
      '<p class="well-muted well-tiny">Audit-only · you can read these; they cannot be deleted</p></section>' +
      WellCall.renderPanelHtml("patient", data) +
      "</aside>";

    host.innerHTML =
      '<div class="well-chart well-chart--editable">' +
      chartBannerHtml(data.patient, "Fill chart / documentation") +
      '<p class="well-role-hint">Patient side · fill and save chart documentation to this browser only.</p>' +
      sectionTabsHtml(sectionId, "well-pt") +
      '<div class="well-chart-paper" data-well-chart-paper role="tabpanel" aria-labelledby="well-pt-tab-' +
      escapeHtml(sectionId) +
      '">' +
      renderSectionBody(sectionId, data, true, "pt") +
      '<div class="well-doc-actions">' +
      (sectionId === "applehealth"
        ? ""
        : '<button type="button" class="btn btn-primary" data-well-save>Save to browser</button>' +
          '<button type="button" class="btn btn-secondary" data-well-reset-section>Reset section</button>') +
      '<button type="button" class="btn btn-secondary" data-well-reset-all>Reset entire chart</button>' +
      '<span class="commune-status well-status" data-well-status hidden role="status" aria-live="polite"></span>' +
      "</div></div></div>" +
      apptHtml;

    host.querySelectorAll("[data-well-section]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-well-section");
        var cur = PortalStore.get();
        /* Auto-save current section fields before switching */
        var paper = host.querySelector("[data-well-chart-paper]");
        if (paper) {
          var activeDoc = paper.querySelector("[data-well-doc]");
          if (activeDoc) {
            cur = collectFormFields(host, activeDoc.getAttribute("data-well-doc"));
          }
        }
        cur.prefs.lastSection = next;
        PortalStore.save(cur);
        renderPatient(root, cur, next);
      });
    });

    bindPatientEditors(root, host, sectionId);
    if (sectionId === "applehealth") {
      bindAppleHealthEditors(root, host);
    }

    var resetAll = host.querySelector("[data-well-reset-all]");
    if (resetAll) {
      resetAll.addEventListener("click", function () {
        var prev = PortalStore.get();
        var fresh = deepClone(DEMO_SEED);
        fresh.prefs.lastSection = sectionId;
        /* Doctor notes + Apple Health are append-only — never wiped by chart reset */
        fresh.doctorNotes = deepClone(prev.doctorNotes || DEMO_SEED.doctorNotes);
        fresh.doctorNotesAudit = deepClone(
          prev.doctorNotesAudit || DEMO_SEED.doctorNotesAudit || []
        );
        fresh.doctorNotesAudit.push({
          id: newId("aud"),
          at: nowStamp(),
          action: "chart_reset",
          noteId: "",
          by: "patient",
          detail: "Chart fields reset; doctor notes preserved (append-only)",
        });
        fresh.appleHealth = mergeAppleHealthAppendOnly(
          prev.appleHealth,
          prev.appleHealth
        );
        appendAppleHealthAudit(
          fresh,
          "chart_reset",
          "Chart fields reset; Apple Health consent/uploads/audit preserved (append-only)"
        );
        PortalStore.save(fresh);
        renderPatient(root, PortalStore.get(), sectionId);
        setStatus(
          root,
          "Chart reset · doctor notes + Apple Health preserved (audit-only).",
          false
        );
      });
    }

    WellCall.afterRender(root, "patient");

    var ptForm = host.querySelector("[data-well-patient-compose]");
    if (ptForm) {
      ptForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var ta = host.querySelector("[data-well-patient-msg]");
        var body = ta ? ta.value : "";
        var cur = appendPortalMessage("patient", body);
        renderPatient(root, cur);
      });
    }
  }

  function renderProvider(root, data) {
    var host = root.querySelector("[data-well-provider-root]");
    if (!host) return;
    data = ensureCalPrefs(data || PortalStore.get());
    var sectionId = data.prefs.lastSection || "intake";
    if (!CHART_SECTIONS.some(function (s) { return s.id === sectionId; })) sectionId = "intake";
    var selectedId = data.prefs.selectedRosterId || "p1";
    var selected =
      (data.roster || []).filter(function (r) {
        return r.id === selectedId;
      })[0] || (data.roster && data.roster[0]);

    /* Only Alexa chart is fillable/shared in this demo; others show stub summary */
    var isPrimary = selected && selected.mrn === data.patient.mrn;
    var viewPatient = isPrimary
      ? data.patient
      : {
          name: selected ? selected.name : "—",
          dob: selected ? selected.dob : "",
          mrn: selected ? selected.mrn : "—",
          sex: "—",
          pcp: data.provider.name,
          preferredClinic: data.provider.clinic,
        };

    var selectedDate = data.prefs.selectedCalDate;
    var dayListHtml = renderDayAppointmentsList(data, selectedDate);

    var rosterHtml =
      '<aside class="well-side-rail" aria-label="Schedule and inbox">' +
      '<section class="well-rail-card">' +
      "<h4>Provider</h4>" +
      '<p class="well-provider-card"><strong>' +
      escapeHtml(data.provider.name) +
      "</strong><br>" +
      escapeHtml(data.provider.specialty) +
      "<br><span class=\"well-muted\">NPI " +
      escapeHtml(data.provider.npi) +
      "</span><br>" +
      escapeHtml(data.provider.clinic) +
      (data.provider.companyId
        ? '<br><span class="well-muted well-tiny">Company id · ' +
          escapeHtml(data.provider.companyId) +
          ' · openings live on JOBS</span>' +
          '<br><a class="well-jobs-link" href="#jobs/' +
          encodeURIComponent(data.provider.companyId) +
          '" data-well-jobs-link="' +
          escapeHtml(data.provider.companyId) +
          '">View company jobs</a>'
        : "") +
      "</p></section>" +
      WellCall.renderPanelHtml("provider", data) +
      '<section class="well-rail-card well-rail-card--calendar">' +
      "<h4>Schedule calendar</h4>" +
      renderMonthCalendar(data) +
      '<div class="well-cal-daypanel">' +
      '<h5 class="well-cal-day-heading">Appointments · ' +
      escapeHtml(selectedDate) +
      "</h5>" +
      '<div data-well-day-appts>' +
      dayListHtml +
      "</div></div>" +
      '<div class="well-cal-add">' +
      "<h5 class=\"well-cal-day-heading\">Add appointment</h5>" +
      renderScheduleForm(data, selectedDate) +
      "</div></section>" +
      '<section class="well-rail-card">' +
      "<h4>Orders stub</h4><ul class=\"well-list well-list--compact\">" +
      "<li>Lab · Lipid panel + CMP <span class=\"well-badge\">Pending</span></li>" +
      "<li>Referral · Nutrition (demo) <span class=\"well-badge\">Draft</span></li>" +
      "</ul></section>" +
      '<section class="well-rail-card">' +
      "<h4>Messages to patient</h4>" +
      '<div class="well-thread" role="log" aria-label="Doctor to patient message thread">' +
      renderMessageThread(data.messages) +
      "</div>" +
      '<form class="well-compose" data-well-provider-compose-msg>' +
      '<label class="well-sr-only" for="well-pv-msg">Message the patient</label>' +
      '<textarea id="well-pv-msg" data-well-provider-msg placeholder="Write a message to the patient…" rows="3"></textarea>' +
      '<div class="well-compose-actions">' +
      '<button type="submit" class="btn btn-primary">Send to patient</button>' +
      "</div></form>" +
      '<p class="well-muted well-tiny">Doctor → patient · visible in patient portal</p></section>' +
      '<section class="well-rail-card">' +
      "<h4>Doctor notes (patient portal)</h4>" +
      renderDoctorNotesHtml(data.doctorNotes, { patientView: false }) +
      renderAuditLogHtml(data.doctorNotesAudit) +
      '<form class="well-compose" data-well-provider-compose-note>' +
      '<label class="well-sr-only" for="well-pv-note">Add doctor note</label>' +
      '<textarea id="well-pv-note" data-well-provider-note placeholder="Add a clinical note the patient can read (audit-only)…" rows="3"></textarea>' +
      '<div class="well-compose-actions">' +
      '<button type="submit" class="btn btn-primary">Post note to patient portal</button>' +
      "</div></form>" +
      '<p class="well-muted well-tiny">Append-only · patients cannot delete</p></section></aside>';

    var chartBody;
    if (isPrimary) {
      chartBody = renderSectionBody(sectionId, data, false, "pv");
    } else if (selected) {
      chartBody =
        '<div class="well-doc-form well-doc-form--stub">' +
        "<p class=\"well-doc-lead\">Quick chart peek (demo stub — full fillable chart is linked to Alexa J. Thomas only).</p>" +
        "<dl class=\"well-dl\">" +
        "<div><dt>Visit reason</dt><dd>" +
        escapeHtml(selected.reason) +
        "</dd></div>" +
        "<div><dt>MRN</dt><dd>" +
        escapeHtml(selected.mrn) +
        "</dd></div>" +
        "<div><dt>DOB</dt><dd>" +
        formatDob(selected.dob) +
        "</dd></div>" +
        "<div><dt>Note</dt><dd>Switch to the Alexa row to read the shared demo documentation filled on the Patient side.</dd></div>" +
        "</dl></div>";
    } else {
      chartBody = '<p class="well-muted">Select a patient from the day schedule.</p>';
    }

    host.innerHTML =
      '<div class="well-chart well-chart--readonly">' +
      chartBannerHtml(viewPatient, "Chart view only") +
      '<p class="well-role-hint">Provider side · documentation is locked. Browse chart sections; editing happens on Patient. Use the calendar to schedule.</p>' +
      (isPrimary ? sectionTabsHtml(sectionId, "well-pv") : "") +
      '<div class="well-chart-paper well-chart-paper--locked" data-well-chart-paper role="tabpanel"' +
      (isPrimary ? ' aria-labelledby="well-pv-tab-' + escapeHtml(sectionId) + '"' : "") +
      ">" +
      '<div class="well-lock-banner" role="status">View only · fields locked in this demo</div>' +
      chartBody +
      "</div></div>" +
      rosterHtml;

    host.querySelectorAll("[data-well-section]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-well-section");
        var cur = PortalStore.get();
        cur.prefs.lastSection = next;
        PortalStore.save(cur);
        renderProvider(root, cur);
      });
    });

    if (isPrimary && sectionId === "applehealth") {
      bindAppleHealthEditors(root, host);
    }

    host.querySelectorAll("[data-well-roster]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cur = PortalStore.get();
        cur.prefs.selectedRosterId = btn.getAttribute("data-well-roster");
        PortalStore.save(cur);
        renderProvider(root, cur);
      });
    });

    var prevBtn = host.querySelector("[data-well-cal-prev]");
    var nextBtn = host.querySelector("[data-well-cal-next]");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        var cur = ensureCalPrefs(PortalStore.get());
        cur.prefs.calMonth -= 1;
        if (cur.prefs.calMonth < 0) {
          cur.prefs.calMonth = 11;
          cur.prefs.calYear -= 1;
        }
        PortalStore.save(cur);
        renderProvider(root, cur);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var cur = ensureCalPrefs(PortalStore.get());
        cur.prefs.calMonth += 1;
        if (cur.prefs.calMonth > 11) {
          cur.prefs.calMonth = 0;
          cur.prefs.calYear += 1;
        }
        PortalStore.save(cur);
        renderProvider(root, cur);
      });
    }

    host.querySelectorAll("[data-well-cal-day]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cur = ensureCalPrefs(PortalStore.get());
        var day = btn.getAttribute("data-well-cal-day");
        cur.prefs.selectedCalDate = day;
        var parts = day.split("-");
        if (parts.length === 3) {
          cur.prefs.calYear = parseInt(parts[0], 10);
          cur.prefs.calMonth = parseInt(parts[1], 10) - 1;
        }
        PortalStore.save(cur);
        renderProvider(root, cur);
      });
    });

    host.querySelectorAll("[data-well-appt-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-well-appt-cancel");
        if (!id) return;
        var cur = PortalStore.get();
        cur.appointments = (cur.appointments || []).filter(function (a) {
          return a.id !== id;
        });
        PortalStore.save(cur);
        renderProvider(root, cur);
      });
    });

    var form = host.querySelector("[data-well-schedule-form]");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var cur = ensureCalPrefs(PortalStore.get());
        var dateEl = form.querySelector('[data-well-sched="date"]');
        var timeEl = form.querySelector('[data-well-sched="time"]');
        var pidEl = form.querySelector('[data-well-sched="patientId"]');
        var pnameEl = form.querySelector('[data-well-sched="patientName"]');
        var reasonEl = form.querySelector('[data-well-sched="reason"]');
        var whereEl = form.querySelector('[data-well-sched="where"]');
        var date = (dateEl && dateEl.value) || cur.prefs.selectedCalDate;
        var time = (timeEl && timeEl.value) || "09:00";
        if (time.length === 5) {
          /* ok */
        } else if (time.length === 4) {
          time = "0" + time;
        }
        var patientId = (pidEl && pidEl.value) || "";
        var patientName = (pnameEl && pnameEl.value.trim()) || "";
        if (patientId) {
          var match = (cur.roster || []).filter(function (r) {
            return r.id === patientId;
          })[0];
          if (match) patientName = match.name;
        }
        if (!patientName) {
          if (pnameEl) pnameEl.focus();
          return;
        }
        var reason = (reasonEl && reasonEl.value.trim()) || "";
        var where = (whereEl && whereEl.value.trim()) || "";
        if (!date || !time || !reason || !where) return;

        cur.appointments = cur.appointments || [];
        cur.appointments.push({
          id: newAppointmentId(),
          when: date + " " + time,
          patientId: patientId || "",
          patientName: patientName,
          reason: reason,
          where: where,
        });
        cur.prefs.selectedCalDate = date;
        var dp = date.split("-");
        if (dp.length === 3) {
          cur.prefs.calYear = parseInt(dp[0], 10);
          cur.prefs.calMonth = parseInt(dp[1], 10) - 1;
        }
        if (patientId) cur.prefs.selectedRosterId = patientId;
        PortalStore.save(cur);
        renderProvider(root, cur);
      });

      var pidSelect = form.querySelector('[data-well-sched="patientId"]');
      var pnameInput = form.querySelector('[data-well-sched="patientName"]');
      if (pidSelect && pnameInput) {
        pidSelect.addEventListener("change", function () {
          var id = pidSelect.value;
          if (!id) return;
          var match = (PortalStore.get().roster || []).filter(function (r) {
            return r.id === id;
          })[0];
          if (match) pnameInput.value = match.name;
        });
      }
    }

    WellCall.afterRender(root, "provider");
    root.querySelectorAll("[data-well-jobs-link]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var id = a.getAttribute("data-well-jobs-link");
        if (window.WaymakersJobs && typeof window.WaymakersJobs.filterByCompany === "function") {
          window.WaymakersJobs.filterByCompany(id);
        } else {
          location.hash = "jobs/" + encodeURIComponent(id || "");
          var tab = document.getElementById("tab-jobs");
          if (tab) tab.click();
        }
      });
    });

    var pvMsgForm = host.querySelector("[data-well-provider-compose-msg]");
    if (pvMsgForm) {
      pvMsgForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var ta = host.querySelector("[data-well-provider-msg]");
        var body = ta ? ta.value : "";
        var cur = appendPortalMessage("provider", body);
        renderProvider(root, cur);
      });
    }
    var pvNoteForm = host.querySelector("[data-well-provider-compose-note]");
    if (pvNoteForm) {
      pvNoteForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var ta = host.querySelector("[data-well-provider-note]");
        var body = ta ? ta.value : "";
        var cur = appendDoctorNote(body);
        renderProvider(root, cur);
      });
    }
  }



  /* ===== In-platform IP / browser calling (WebRTC) =====
   * Signaling: BroadcastChannel + localStorage fallback (same-origin tabs).
   * Demo: open WELL in two tabs — one Patient, one Provider — then Call / Answer.
   * Not PSTN / phone. $0, no backend.
   */
  var CALL_CHANNEL = "cognation.well.call.v1";
  var CALL_STORAGE_KEY = "cognation.well.call.signal.v1";
  var CALL_ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];

  var WellCall = {
    tabId: "t" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    role: "patient",
    state: "idle",
    callId: null,
    isCaller: false,
    muted: false,
    videoOn: false,
    pc: null,
    localStream: null,
    remoteStream: null,
    channel: null,
    pendingInvite: null,
    pendingIce: [],
    peerLabel: "",
    lastError: "",
    _storageHandler: null,
    _root: null,

    otherRole: function (role) {
      return role === "provider" ? "patient" : "provider";
    },

    init: function (root) {
      this._root = root;
      var self = this;
      if (typeof BroadcastChannel !== "undefined") {
        try {
          this.channel = new BroadcastChannel(CALL_CHANNEL);
          this.channel.onmessage = function (ev) {
            self.onSignal(ev.data);
          };
        } catch (e) {
          this.channel = null;
        }
      }
      if (!this._storageHandler) {
        this._storageHandler = function (ev) {
          if (ev.key !== CALL_STORAGE_KEY || !ev.newValue) return;
          try {
            self.onSignal(JSON.parse(ev.newValue));
          } catch (err) {}
        };
        window.addEventListener("storage", this._storageHandler);
      }
      this.setActiveRole(readStoredSide() || "patient");
      this.announcePresence();
    },

    setActiveRole: function (role) {
      this.role = role === "provider" ? "provider" : "patient";
      this.announcePresence();
      this.refreshAllUi();
    },

    announcePresence: function () {
      var data = PortalStore.get();
      var name =
        this.role === "provider"
          ? (data.provider && data.provider.name) || "Provider"
          : (data.patient && data.patient.name) || "Patient";
      this.post({
        type: "presence",
        role: this.role,
        name: name,
      });
    },

    post: function (msg) {
      if (!msg || typeof msg !== "object") return;
      var payload = Object.assign({}, msg, {
        tabId: this.tabId,
        ts: Date.now(),
      });
      if (this.channel) {
        try {
          this.channel.postMessage(payload);
        } catch (e) {}
      }
      try {
        localStorage.setItem(CALL_STORAGE_KEY, JSON.stringify(payload));
        /* Same-tab listeners: storage does not fire locally; BroadcastChannel covers multi-context */
      } catch (e) {}
    },

    onSignal: function (msg) {
      if (!msg || msg.tabId === this.tabId) return;
      var self = this;
      switch (msg.type) {
        case "presence":
          break;
        case "invite":
          if (msg.to !== this.role) return;
          if (this.state !== "idle" && this.state !== "ended") {
            this.post({ type: "decline", callId: msg.callId, reason: "busy" });
            return;
          }
          this.pendingInvite = msg;
          this.callId = msg.callId;
          this.isCaller = false;
          this.peerLabel = msg.fromName || (msg.from === "provider" ? "Provider" : "Patient");
          this.state = "ringing";
          this.lastError = "";
          this.refreshAllUi();
          break;
        case "decline":
          if (msg.callId !== this.callId) return;
          this.state = "ended";
          this.lastError = "Call declined";
          this.cleanupMedia(false);
          this.refreshAllUi();
          setTimeout(function () {
            if (self.state === "ended") {
              self.state = "idle";
              self.callId = null;
              self.refreshAllUi();
            }
          }, 2000);
          break;
        case "accept":
          if (msg.callId !== this.callId || !this.isCaller) return;
          this.state = "connecting";
          this.refreshAllUi();
          this.beginOffer();
          break;
        case "hangup":
          if (msg.callId && msg.callId !== this.callId) return;
          this.state = "ended";
          this.lastError = "";
          this.cleanupMedia(false);
          this.refreshAllUi();
          setTimeout(function () {
            if (self.state === "ended") {
              self.state = "idle";
              self.callId = null;
              self.refreshAllUi();
            }
          }, 1500);
          break;
        case "sdp":
          if (msg.callId !== this.callId) return;
          this.handleRemoteSdp(msg.sdp);
          break;
        case "ice":
          if (msg.callId !== this.callId || !msg.candidate) return;
          this.addIceCandidate(msg.candidate);
          break;
        default:
          break;
      }
    },

    stateLabel: function () {
      switch (this.state) {
        case "idle":
          return "Idle";
        case "calling":
          return "Calling…";
        case "ringing":
          return "Incoming call";
        case "connecting":
          return "Connecting…";
        case "connected":
          return "Connected";
        case "ended":
          return "Ended";
        default:
          return this.state;
      }
    },

    counterpartyLabel: function (data) {
      data = data || PortalStore.get();
      if (this.role === "patient") {
        return (data.provider && data.provider.name) || data.patient.pcp || "Care team";
      }
      var selId = data.prefs && data.prefs.selectedRosterId;
      var row = (data.roster || []).filter(function (r) {
        return r.id === selId;
      })[0];
      return (row && row.name) || (data.patient && data.patient.name) || "Patient";
    },

    renderPanelHtml: function (side, data) {
      data = data || PortalStore.get();
      var isPatient = side === "patient";
      var target = isPatient
        ? (data.provider && data.provider.name) || data.patient.pcp || "Care team"
        : this.counterpartyLabel(data);
      var targetHint = isPatient
        ? "IP / browser call to your assigned care team (not a phone line)."
        : "IP / browser call to the selected chart patient (not PSTN).";
      var state = this.role === side ? this.state : "idle";
      var stateText = this.role === side ? this.stateLabel() : "Idle";
      var err =
        this.role === side && this.lastError
          ? '<p class="well-call-error" role="alert">' + escapeHtml(this.lastError) + "</p>"
          : "";
      var peer =
        this.role === side && this.peerLabel
          ? '<p class="well-muted well-tiny">Peer · ' + escapeHtml(this.peerLabel) + "</p>"
          : "";

      return (
        '<section class="well-rail-card well-rail-card--call" data-well-call-panel="' +
        escapeHtml(side) +
        '">' +
        "<h4>In-platform call</h4>" +
        '<p class="well-call-target"><strong>' +
        escapeHtml(isPatient ? "Care team" : "Patient") +
        "</strong> · " +
        escapeHtml(target) +
        "</p>" +
        '<p class="well-muted well-tiny">' +
        escapeHtml(targetHint) +
        "</p>" +
        '<div class="well-call-state" data-well-call-state data-state="' +
        escapeHtml(state) +
        '" role="status" aria-live="polite">' +
        '<span class="well-call-state-dot" aria-hidden="true"></span>' +
        "<span data-well-call-state-text>" +
        escapeHtml(stateText) +
        "</span></div>" +
        peer +
        err +
        '<div class="well-call-controls">' +
        '<button type="button" class="btn btn-primary well-mini-btn" data-well-call-action="call"' +
        (state !== "idle" && state !== "ended" ? " disabled" : "") +
        ">Call</button>" +
        '<button type="button" class="btn btn-primary well-mini-btn" data-well-call-action="answer"' +
        (state !== "ringing" ? " disabled" : "") +
        ">Answer</button>" +
        '<button type="button" class="btn btn-secondary well-mini-btn" data-well-call-action="decline"' +
        (state !== "ringing" ? " disabled" : "") +
        ">Decline</button>" +
        '<button type="button" class="btn btn-secondary well-mini-btn" data-well-call-action="hangup"' +
        (state === "idle" || state === "ended" ? " disabled" : "") +
        ">Hang up</button>" +
        '<button type="button" class="btn btn-secondary well-mini-btn" data-well-call-action="mute"' +
        (state !== "connected" && state !== "connecting" ? " disabled" : "") +
        ">" +
        (this.muted ? "Unmute" : "Mute") +
        "</button>" +
        '<button type="button" class="btn btn-secondary well-mini-btn" data-well-call-action="video"' +
        (state !== "connected" && state !== "connecting" && state !== "calling" ? " disabled" : "") +
        ">" +
        (this.videoOn ? "Camera off" : "Camera") +
        "</button>" +
        "</div>" +
        '<div class="well-call-media">' +
        '<audio data-well-call-remote-audio autoplay playsinline></audio>' +
        '<video data-well-call-local-video class="well-call-video" playsinline muted' +
        (this.videoOn ? "" : " hidden") +
        "></video>" +
        '<video data-well-call-remote-video class="well-call-video" playsinline' +
        (this.videoOn ? "" : " hidden") +
        "></video>" +
        "</div>" +
        '<p class="well-muted well-tiny">Demo · open Patient in one tab and Provider in another, then Call. Signaling via BroadcastChannel.</p>' +
        "</section>"
      );
    },

    bindPanel: function (root, side) {
      var panel = root.querySelector('[data-well-call-panel="' + side + '"]');
      if (!panel || panel.__wellCallBound) return;
      panel.__wellCallBound = true;
      var self = this;
      panel.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-well-call-action]");
        if (!btn || btn.disabled) return;
        /* Ensure this tab's role matches the panel being used */
        if (self.role !== side) {
          self.setActiveRole(side);
        }
        var action = btn.getAttribute("data-well-call-action");
        if (action === "call") self.startCall();
        else if (action === "answer") self.answerCall();
        else if (action === "decline") self.declineCall();
        else if (action === "hangup") self.hangup();
        else if (action === "mute") self.toggleMute();
        else if (action === "video") self.toggleVideo();
      });
      this.attachMediaElements(panel);
    },

    attachMediaElements: function (panel) {
      if (!panel) return;
      var remoteAudio = panel.querySelector("[data-well-call-remote-audio]");
      var localVideo = panel.querySelector("[data-well-call-local-video]");
      var remoteVideo = panel.querySelector("[data-well-call-remote-video]");
      if (remoteAudio && this.remoteStream) {
        remoteAudio.srcObject = this.remoteStream;
        remoteAudio.play().catch(function () {});
      }
      if (localVideo && this.localStream) {
        localVideo.srcObject = this.localStream;
        localVideo.hidden = !this.videoOn;
        if (this.videoOn) localVideo.play().catch(function () {});
      }
      if (remoteVideo && this.remoteStream) {
        remoteVideo.srcObject = this.remoteStream;
        remoteVideo.hidden = !this.videoOn;
        if (this.videoOn) remoteVideo.play().catch(function () {});
      }
    },

    refreshAllUi: function () {
      var root = this._root || document.querySelector("[data-well-app]");
      if (!root) return;
      var self = this;
      ["patient", "provider"].forEach(function (side) {
        var panel = root.querySelector('[data-well-call-panel="' + side + '"]');
        if (!panel) return;
        var data = PortalStore.get();
        var wrap = document.createElement("div");
        wrap.innerHTML = self.renderPanelHtml(side, data);
        var next = wrap.firstElementChild;
        panel.replaceWith(next);
        self.bindPanel(root, side);
      });
    },

    afterRender: function (root, side) {
      this._root = root || this._root;
      this.bindPanel(root, side);
      var panel = root.querySelector('[data-well-call-panel="' + side + '"]');
      if (panel && this.role === side) {
        this.attachMediaElements(panel);
        /* Sync state display if panel was freshly rendered with stale idle */
        var st = panel.querySelector("[data-well-call-state]");
        var txt = panel.querySelector("[data-well-call-state-text]");
        if (st) st.setAttribute("data-state", this.state);
        if (txt) txt.textContent = this.stateLabel();
        panel.querySelectorAll("[data-well-call-action]").forEach(function (btn) {
          var action = btn.getAttribute("data-well-call-action");
          var state = WellCall.state;
          if (action === "call") btn.disabled = state !== "idle" && state !== "ended";
          else if (action === "answer" || action === "decline") btn.disabled = state !== "ringing";
          else if (action === "hangup") btn.disabled = state === "idle" || state === "ended";
          else if (action === "mute") {
            btn.disabled = state !== "connected" && state !== "connecting";
            btn.textContent = WellCall.muted ? "Unmute" : "Mute";
          } else if (action === "video") {
            btn.disabled = state !== "connected" && state !== "connecting" && state !== "calling";
            btn.textContent = WellCall.videoOn ? "Camera off" : "Camera";
          }
        });
      }
    },

    startCall: function () {
      var self = this;
      if (this.state !== "idle" && this.state !== "ended") return;
      var data = PortalStore.get();
      this.callId = "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);
      this.isCaller = true;
      this.pendingInvite = null;
      this.lastError = "";
      this.peerLabel = this.counterpartyLabel(data);
      this.state = "calling";
      this.refreshAllUi();
      var fromName =
        this.role === "provider"
          ? (data.provider && data.provider.name) || "Provider"
          : (data.patient && data.patient.name) || "Patient";
      this.post({
        type: "invite",
        callId: this.callId,
        from: this.role,
        to: this.otherRole(this.role),
        fromName: fromName,
        toName: this.peerLabel,
      });
      /* Acquire mic early so Answer path is snappy for callee; caller waits for accept */
      this.ensureMedia({ video: false }).catch(function (err) {
        self.lastError = (err && err.message) || "Microphone permission needed";
        self.state = "ended";
        self.post({ type: "hangup", callId: self.callId });
        self.cleanupMedia(false);
        self.refreshAllUi();
      });
    },

    answerCall: function () {
      var self = this;
      if (this.state !== "ringing" || !this.pendingInvite) return;
      this.state = "connecting";
      this.refreshAllUi();
      this.ensureMedia({ video: false })
        .then(function () {
          self.ensurePeerConnection();
          self.post({ type: "accept", callId: self.callId });
        })
        .catch(function (err) {
          self.lastError = (err && err.message) || "Microphone permission needed";
          self.declineCall();
        });
    },

    declineCall: function () {
      if (this.callId) this.post({ type: "decline", callId: this.callId });
      this.state = "idle";
      this.pendingInvite = null;
      this.callId = null;
      this.cleanupMedia(false);
      this.refreshAllUi();
    },

    hangup: function () {
      if (this.callId) this.post({ type: "hangup", callId: this.callId });
      this.state = "ended";
      this.cleanupMedia(false);
      this.refreshAllUi();
      var self = this;
      setTimeout(function () {
        if (self.state === "ended") {
          self.state = "idle";
          self.callId = null;
          self.isCaller = false;
          self.pendingInvite = null;
          self.refreshAllUi();
        }
      }, 1200);
    },

    toggleMute: function () {
      this.muted = !this.muted;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(function (t) {
          t.enabled = !WellCall.muted;
        });
      }
      this.refreshAllUi();
    },

    toggleVideo: function () {
      var self = this;
      if (this.videoOn) {
        this.videoOn = false;
        if (this.localStream) {
          this.localStream.getVideoTracks().forEach(function (t) {
            t.stop();
            self.localStream.removeTrack(t);
            if (self.pc) {
              self.pc.getSenders().forEach(function (sender) {
                if (sender.track && sender.track.kind === "video") {
                  try {
                    self.pc.removeTrack(sender);
                  } catch (e) {}
                }
              });
            }
          });
        }
        this.refreshAllUi();
        return;
      }
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then(function (vstream) {
          self.videoOn = true;
          var vtrack = vstream.getVideoTracks()[0];
          if (!self.localStream) self.localStream = vstream;
          else self.localStream.addTrack(vtrack);
          if (self.pc && vtrack) {
            self.pc.addTrack(vtrack, self.localStream);
          }
          self.refreshAllUi();
        })
        .catch(function (err) {
          self.lastError = (err && err.message) || "Camera permission needed";
          self.refreshAllUi();
        });
    },

    ensureMedia: function (opts) {
      var self = this;
      opts = opts || { audio: true, video: false };
      if (this.localStream && this.localStream.getAudioTracks().length) {
        return Promise.resolve(this.localStream);
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return Promise.reject(new Error("getUserMedia not supported in this browser"));
      }
      return navigator.mediaDevices.getUserMedia({ audio: true, video: !!opts.video }).then(function (stream) {
        self.localStream = stream;
        if (self.muted) {
          stream.getAudioTracks().forEach(function (t) {
            t.enabled = false;
          });
        }
        return stream;
      });
    },

    ensurePeerConnection: function () {
      var self = this;
      if (this.pc) return this.pc;
      this.pc = new RTCPeerConnection({ iceServers: CALL_ICE });
      this.remoteStream = new MediaStream();
      this.pc.onicecandidate = function (ev) {
        if (ev.candidate) {
          self.post({
            type: "ice",
            callId: self.callId,
            candidate: ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate,
          });
        }
      };
      this.pc.ontrack = function (ev) {
        if (ev.streams && ev.streams[0]) {
          self.remoteStream = ev.streams[0];
        } else if (ev.track) {
          self.remoteStream.addTrack(ev.track);
        }
        self.state = "connected";
        self.refreshAllUi();
      };
      this.pc.onconnectionstatechange = function () {
        var st = self.pc && self.pc.connectionState;
        if (st === "connected") {
          self.state = "connected";
          self.refreshAllUi();
        } else if (st === "failed" || st === "disconnected" || st === "closed") {
          if (self.state === "connected" || self.state === "connecting") {
            self.state = "ended";
            self.refreshAllUi();
          }
        }
      };
      if (this.localStream) {
        this.localStream.getTracks().forEach(function (track) {
          self.pc.addTrack(track, self.localStream);
        });
      }
      return this.pc;
    },

    addIceCandidate: function (candidate) {
      var self = this;
      if (!candidate) return;
      if (!this.pc || !this.pc.remoteDescription || !this.pc.remoteDescription.type) {
        this.pendingIce.push(candidate);
        return;
      }
      try {
        this.pc.addIceCandidate(candidate).catch(function () {});
      } catch (e) {}
    },

    flushIce: function () {
      var self = this;
      var queued = this.pendingIce.splice(0, this.pendingIce.length);
      queued.forEach(function (c) {
        self.addIceCandidate(c);
      });
    },

    beginOffer: function () {
      var self = this;
      this.ensureMedia({ video: false })
        .then(function () {
          self.ensurePeerConnection();
          return self.pc.createOffer();
        })
        .then(function (offer) {
          return self.pc.setLocalDescription(offer);
        })
        .then(function () {
          self.post({
            type: "sdp",
            callId: self.callId,
            sdp: { type: self.pc.localDescription.type, sdp: self.pc.localDescription.sdp },
          });
        })
        .catch(function (err) {
          self.lastError = (err && err.message) || "Could not start call";
          self.hangup();
        });
    },

    handleRemoteSdp: function (sdp) {
      var self = this;
      if (!sdp || !sdp.type) return;
      var apply = function () {
        self.ensurePeerConnection();
        return self.pc.setRemoteDescription(new RTCSessionDescription(sdp)).then(function () {
          self.flushIce();
          if (sdp.type === "offer") {
            return self.pc.createAnswer().then(function (answer) {
              return self.pc.setLocalDescription(answer).then(function () {
                self.post({
                  type: "sdp",
                  callId: self.callId,
                  sdp: { type: self.pc.localDescription.type, sdp: self.pc.localDescription.sdp },
                });
                self.state = "connecting";
                self.refreshAllUi();
              });
            });
          }
          self.state = "connected";
          self.refreshAllUi();
        });
      };
      this.ensureMedia({ video: false })
        .then(apply)
        .catch(function (err) {
          self.lastError = (err && err.message) || "Call media failed";
          self.refreshAllUi();
        });
    },

    cleanupMedia: function (keepLocal) {
      if (this.pc) {
        try {
          this.pc.close();
        } catch (e) {}
        this.pc = null;
      }
      if (!keepLocal && this.localStream) {
        this.localStream.getTracks().forEach(function (t) {
          try {
            t.stop();
          } catch (e) {}
        });
        this.localStream = null;
      }
      this.remoteStream = null;
      this.videoOn = false;
      this.muted = false;
      this.isCaller = false;
      this.pendingInvite = null;
      this.pendingIce = [];
    },
  };


  function initWell(root) {
    if (!root || root.__wellInited) return;
    root.__wellInited = true;
    WellCall.init(root);
    initSideToggle(root);
    var data = PortalStore.get();
    /* Ensure seed persists so provider sees patient fills after first visit */
    if (!localStorage.getItem(PORTAL_KEY)) {
      PortalStore.save(data);
    }
    renderPatient(root, data);
    renderProvider(root, data);
    applyWellSide(root, readStoredSide() || "patient", { persist: true });
  }

  function boot() {
    document.querySelectorAll("[data-well-app]").forEach(initWell);
  }

  window.CognationWellApplySide = function (side) {
    document.querySelectorAll("[data-well-app]").forEach(function (root) {
      applyWellSide(root, side);
    });
  };
  window.CognationWellPortalStore = PortalStore;
  window.CognationWellCall = WellCall;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
