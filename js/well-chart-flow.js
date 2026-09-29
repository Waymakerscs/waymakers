/**
 * WELL chart-flow v1 — browser-local only.
 *
 * Patient PHI (vitals, meds, allergies, and the rest of the chart) stays on
 * the patient portal record. Providers write SOAP notes (S/O/A/P) into a
 * separate store. That store rejects structured PHI fields.
 *
 * Releasing a chart to the next doctor records a share on the patient record.
 * It does not copy PHI into provider storage and it does not clear the chart.
 *
 * Not HIPAA. Nothing here is sent to a server.
 */
(function (root) {
  "use strict";

  var SOAP_KEY = "cognation.well.soap.v1";
  var PHI_FIELDS = ["intake", "hpi", "vitals", "meds", "allergies", "diagnoses", "plan"];
  var SOAP_FIELDS = ["subjective", "objective", "assessment", "plan"];
  var PHI_LEAK_KEYS = {
    bp: true,
    bpSys: true,
    bpDia: true,
    bloodPressure: true,
    hr: true,
    tempF: true,
    rr: true,
    spo2: true,
    weightLb: true,
    heightIn: true,
    pain: true,
    vitals: true,
    meds: true,
    medications: true,
    allergies: true,
    diagnoses: true,
    intake: true,
    hpi: true,
    chart: true,
    phi: true,
    insurance: true,
    dob: true,
    mrn: true,
    ssn: true,
    phone: true,
    email: true,
  };

  var SEED_SOAP = {
    id: "soap-seed-a1",
    patientId: "p1",
    appointmentId: "a1",
    clinicianId: "emp-maya",
    author: "Dr. Maya Chen, MD",
    at: "2026-09-18 09:45",
    subjective: "Feeling well. No acute issues. Taking meds as prescribed.",
    objective: "Vitals stable. Appears well, NAD. Heart RRR, lungs clear.",
    assessment: "1. Health maintenance  2. Essential hypertension — controlled  3. Seasonal allergic rhinitis",
    plan: "Continue lisinopril. Order lipid panel + CMP. F/u in 6 months or sooner PRN.",
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function emptyStore() {
    return { version: 1, notes: [] };
  }

  function hasPhiKeys(raw) {
    if (!raw || typeof raw !== "object") return false;
    var keys = Object.keys(raw);
    for (var i = 0; i < keys.length; i++) {
      if (PHI_LEAK_KEYS[keys[i]]) return true;
    }
    return false;
  }

  function normalizeSoapNote(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, reason: "SOAP note is missing." };
    }
    if (hasPhiKeys(raw)) {
      return {
        ok: false,
        reason: "Provider SOAP cannot store patient PHI (BP, meds, and similar).",
      };
    }
    var i;
    for (i = 0; i < SOAP_FIELDS.length; i++) {
      var value = raw[SOAP_FIELDS[i]];
      if (value && typeof value === "object") {
        return {
          ok: false,
          reason: "Provider SOAP cannot store patient PHI (BP, meds, and similar).",
        };
      }
    }
    var note = {
      id: String(raw.id || ""),
      patientId: String(raw.patientId || ""),
      appointmentId: String(raw.appointmentId || ""),
      clinicianId: String(raw.clinicianId || ""),
      author: String(raw.author || ""),
      at: String(raw.at || ""),
      subjective: String(raw.subjective || ""),
      objective: String(raw.objective || ""),
      assessment: String(raw.assessment || ""),
      plan: String(raw.plan || ""),
    };
    if (!note.id) return { ok: false, reason: "SOAP note needs an id." };
    if (!note.patientId) return { ok: false, reason: "SOAP note needs the visit's patient." };
    if (!note.appointmentId) return { ok: false, reason: "Write SOAP on a visit." };
    var hasBody = false;
    for (i = 0; i < SOAP_FIELDS.length; i++) {
      if (note[SOAP_FIELDS[i]].trim()) hasBody = true;
    }
    if (!hasBody) return { ok: false, reason: "Enter at least one SOAP field." };
    return { ok: true, note: note };
  }

  function normalizeStore(raw) {
    var store = emptyStore();
    var list = raw && Array.isArray(raw.notes) ? raw.notes : [];
    list.forEach(function (n) {
      var result = normalizeSoapNote(n);
      if (result.ok) store.notes.push(result.note);
    });
    return store;
  }

  function readStore(storage) {
    if (!storage || typeof storage.getItem !== "function") return emptyStore();
    try {
      var raw = storage.getItem(SOAP_KEY);
      if (!raw) return emptyStore();
      return normalizeStore(JSON.parse(raw));
    } catch (e) {
      return emptyStore();
    }
  }

  function writeStore(storage, store) {
    storage.setItem(SOAP_KEY, JSON.stringify(normalizeStore(store)));
  }

  function appendSoap(storage, raw) {
    var result = normalizeSoapNote(raw);
    if (!result.ok) return result;
    var store = readStore(storage);
    var exists = store.notes.some(function (n) {
      return n.id === result.note.id;
    });
    if (exists) return { ok: false, reason: "SOAP notes are append-only." };
    store.notes.push(result.note);
    writeStore(storage, store);
    return { ok: true, note: result.note, store: readStore(storage) };
  }

  function ensureSeed(storage, progress) {
    var store = readStore(storage);
    if (store.notes.length) return store;
    var note = deepClone(SEED_SOAP);
    if (progress && typeof progress === "object" && !hasPhiKeys(progress)) {
      SOAP_FIELDS.forEach(function (key) {
        if (typeof progress[key] === "string" && progress[key].trim()) note[key] = progress[key];
      });
    }
    store.notes.push(note);
    writeStore(storage, store);
    return readStore(storage);
  }

  function notesForPatient(storage, patientId) {
    return readStore(storage).notes.filter(function (n) {
      return n.patientId === patientId;
    });
  }

  function notesForVisit(storage, appointmentId) {
    return readStore(storage).notes.filter(function (n) {
      return n.appointmentId === appointmentId;
    });
  }

  function phiSnapshot(portal) {
    var chart = (portal && portal.chart) || {};
    var snap = {};
    PHI_FIELDS.forEach(function (key) {
      snap[key] = chart[key];
    });
    return snap;
  }

  function releaseChart(portal, release) {
    var next = deepClone(portal || {});
    next.chart = deepClone((portal && portal.chart) || {});
    next.releases = Array.isArray(next.releases) ? next.releases : [];
    var clinicianId = release && String(release.clinicianId || "");
    if (!clinicianId) return { ok: false, reason: "Choose a doctor.", portal: next };
    var already = next.releases.some(function (row) {
      return row && row.clinicianId === clinicianId;
    });
    if (already) return { ok: true, already: true, portal: next };
    next.releases.push({
      id: String((release && release.id) || "rel-" + clinicianId),
      clinicianId: clinicianId,
      clinicianName: String((release && release.clinicianName) || ""),
      at: String((release && release.at) || ""),
      by: "patient",
    });
    return { ok: true, portal: next };
  }

  function isReleasedTo(portal, clinicianId) {
    return (portal && portal.releases ? portal.releases : []).some(function (row) {
      return row && row.clinicianId === clinicianId;
    });
  }

  function visitMatchesLocalChart(portal, appt) {
    if (!portal || !appt) return false;
    var patient = portal.patient || {};
    if (appt.patientId && appt.patientId === "p1") return true;
    if (appt.patientName && patient.name && appt.patientName === patient.name) return true;
    return false;
  }

  function providerMayViewChart(portal, clinicianId, appt) {
    if (!appt) return { ok: false, reason: "no-visit" };
    if (!visitMatchesLocalChart(portal, appt)) return { ok: false, reason: "no-local-chart" };
    if (!isReleasedTo(portal, clinicianId)) return { ok: false, reason: "not-released" };
    return { ok: true, reason: "" };
  }

  /**
   * Chart context comes from the appointment, not a roster id.
   * PHI is returned only when this clinician has been released the chart.
   * The patient record is not modified.
   */
  function resolveVisitChart(portal, appointmentId, clinicianId) {
    var appt = null;
    var list = (portal && portal.appointments) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === appointmentId) {
        appt = list[i];
        break;
      }
    }
    if (!appt) {
      return { ok: false, reason: "no-visit", patientId: "", phi: null, appointment: null };
    }
    var access = providerMayViewChart(portal, clinicianId, appt);
    return {
      ok: access.ok,
      reason: access.reason,
      patientId: String(appt.patientId || ""),
      appointment: appt,
      phi: access.ok ? phiSnapshot(portal) : null,
    };
  }

  function guardProviderPortalWrite(prev, next) {
    var out = deepClone(next || {});
    var phiRejected = false;
    if (prev && prev.chart) {
      phiRejected = JSON.stringify(phiSnapshot(prev)) !== JSON.stringify(phiSnapshot(next || {}));
      out.chart = deepClone(prev.chart);
    }
    if (prev) {
      out.releases = deepClone(prev.releases || []);
      if (prev.appleHealth) out.appleHealth = deepClone(prev.appleHealth);
      if (prev.patient) out.patient = deepClone(prev.patient);
    }
    return { portal: out, phiRejected: phiRejected };
  }

  root.WellChartFlow = {
    SOAP_KEY: SOAP_KEY,
    PHI_FIELDS: PHI_FIELDS.slice(),
    SOAP_FIELDS: SOAP_FIELDS.slice(),
    SEED_SOAP: deepClone(SEED_SOAP),
    emptyStore: emptyStore,
    normalizeSoapNote: normalizeSoapNote,
    readStore: readStore,
    appendSoap: appendSoap,
    ensureSeed: ensureSeed,
    notesForPatient: notesForPatient,
    notesForVisit: notesForVisit,
    phiSnapshot: phiSnapshot,
    releaseChart: releaseChart,
    isReleasedTo: isReleasedTo,
    providerMayViewChart: providerMayViewChart,
    resolveVisitChart: resolveVisitChart,
    guardProviderPortalWrite: guardProviderPortalWrite,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
