/**
 * CAREER credentials & documents — browser-local v1.
 *
 * One file each for licensure, credentialing, college degree, and resume.
 * Bytes stay in IndexedDB (waymakers.career.credentials.v1). Nothing is
 * uploaded, emailed, or handed to a job board. If storage is missing or a
 * write fails, the section fails closed and keeps the previous copy.
 *
 * Indeed / LinkedIn and the openings board are unchanged (jobs.js).
 */
(function (root) {
  "use strict";

  var DB_NAME = "waymakers.career.credentials.v1";
  var STORE_NAME = "files";
  var DB_VERSION = 1;
  var MAX_BYTES = 10 * 1024 * 1024;
  var DEMO_NOTE =
    "Local demo. Each file stays in this browser only (up to 10 MB). Nothing is uploaded, emailed, or sent to an employer or a job board.";
  var STORAGE_UNAVAILABLE =
    "This browser cannot keep documents. Nothing was saved, and nothing was sent.";
  var STORAGE_FULL =
    "This browser is out of space for documents. Nothing new was saved.";

  var IMAGE_EXT = {
    ".jpg": 1,
    ".jpeg": 1,
    ".png": 1,
    ".gif": 1,
    ".webp": 1,
    ".bmp": 1,
    ".tif": 1,
    ".tiff": 1,
    ".heic": 1,
    ".heif": 1,
  };
  var IMAGE_MIME = {
    "image/jpeg": 1,
    "image/png": 1,
    "image/gif": 1,
    "image/webp": 1,
    "image/bmp": 1,
    "image/tiff": 1,
    "image/heic": 1,
    "image/heif": 1,
  };
  var PHOTO_REJECT =
    "Accepts a PDF or a photo (JPG, PNG, GIF, WEBP, BMP, TIFF, or HEIC). Nothing was saved.";

  var SLOTS = [
    {
      id: "licensure",
      title: "Licensure",
      hint: "State license, board certificate, or similar. PDF or a photo.",
      noun: "licensure document",
      empty: "No licensure document saved yet.",
      kinds: ["image", "pdf"],
      rejectMessage: "Licensure accepts a PDF or a photo (JPG, PNG, GIF, WEBP, BMP, TIFF, or HEIC). Nothing was saved.",
    },
    {
      id: "credentialing",
      title: "Credentialing",
      hint: "Credentialing packet or similar. PDF or a photo.",
      noun: "credentialing document",
      empty: "No credentialing document saved yet.",
      kinds: ["image", "pdf"],
      rejectMessage: "Credentialing accepts a PDF or a photo (JPG, PNG, GIF, WEBP, BMP, TIFF, or HEIC). Nothing was saved.",
    },
    {
      id: "degree",
      title: "College degree",
      hint: "Diploma or transcript. PDF or a photo.",
      noun: "college degree",
      empty: "No college degree saved yet.",
      kinds: ["image", "pdf"],
      rejectMessage: "College degree accepts a PDF or a photo (JPG, PNG, GIF, WEBP, BMP, TIFF, or HEIC). Nothing was saved.",
    },
    {
      id: "resume",
      title: "Resume",
      hint: "PDF preferred. Word documents (.doc, .docx) are also accepted.",
      noun: "resume",
      empty: "No resume saved yet.",
      kinds: ["pdf", "doc", "docx"],
      rejectMessage: "Resume accepts a PDF, DOC, or DOCX. Nothing was saved.",
    },
  ];

  function slotById(id) {
    for (var i = 0; i < SLOTS.length; i++) {
      if (SLOTS[i].id === id) return SLOTS[i];
    }
    return null;
  }

  function extOf(name) {
    var n = String(name || "").toLowerCase().trim();
    var i = n.lastIndexOf(".");
    if (i <= 0 || i === n.length - 1) return "";
    return n.slice(i);
  }

  function kindOf(file) {
    file = file || {};
    var ext = extOf(file.name);
    var mime = String(file.type || "").toLowerCase();
    if (ext === ".pdf") return "pdf";
    if (ext === ".docx") return "docx";
    if (ext === ".doc") return "doc";
    if (IMAGE_EXT[ext]) return "image";
    if (mime === "application/pdf") return "pdf";
    if (mime === "application/msword") return "doc";
    if (mime.indexOf("wordprocessingml") !== -1) return "docx";
    if (IMAGE_MIME[mime]) return "image";
    return "";
  }

  function baseName(name) {
    var s = String(name || "").replace(/\\/g, "/");
    var parts = s.split("/");
    var last = parts[parts.length - 1] || "";
    last = last.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!last || last === "." || last === "..") return "";
    if (last.length > 180) {
      var ext = extOf(last);
      if (ext && ext.length < 12) last = last.slice(0, 180 - ext.length) + ext;
      else last = last.slice(0, 180);
    }
    return last;
  }

  function defaultName(kind) {
    if (kind === "pdf") return "document.pdf";
    if (kind === "doc") return "document.doc";
    if (kind === "docx") return "document.docx";
    if (kind === "image") return "photo";
    return "document";
  }

  function ensureExtension(name, kind) {
    var want = { pdf: ".pdf", doc: ".doc", docx: ".docx" }[kind];
    if (!want) return name;
    if (extOf(name)) return name;
    return name + want;
  }

  function mimeFor(kind, file) {
    if (kind === "pdf") return "application/pdf";
    if (kind === "doc") return "application/msword";
    if (kind === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    var mime = String((file && file.type) || "").toLowerCase();
    if (IMAGE_MIME[mime]) return mime;
    var ext = extOf(file && file.name);
    var map = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".tif": "image/tiff",
      ".tiff": "image/tiff",
      ".heic": "image/heic",
      ".heif": "image/heif",
    };
    return map[ext] || "application/octet-stream";
  }

  function kindLabel(kind) {
    if (kind === "pdf") return "PDF";
    if (kind === "doc") return "DOC";
    if (kind === "docx") return "DOCX";
    if (kind === "image") return "Photo";
    return "File";
  }

  function formatBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function acceptAttr(slot) {
    if (!slot) return "";
    var parts = [];
    var kinds = slot.kinds || [];
    if (kinds.indexOf("pdf") !== -1) parts.push(".pdf", "application/pdf");
    if (kinds.indexOf("image") !== -1) {
      parts.push(
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tif",
        ".tiff",
        ".heic",
        ".heif",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff",
        "image/heic",
        "image/heif"
      );
    }
    if (kinds.indexOf("doc") !== -1) parts.push(".doc", "application/msword");
    if (kinds.indexOf("docx") !== -1) {
      parts.push(
        ".docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    }
    return parts.join(",");
  }

  /**
   * Pure gate. Does not read or write storage.
   * file: { name, type, size }
   */
  function acceptFile(slotId, file) {
    var slot = slotById(slotId);
    if (!slot) {
      return {
        ok: false,
        code: "unknown_slot",
        message: "That document type is not on this form. Nothing was saved.",
      };
    }
    if (!file) {
      return {
        ok: false,
        code: "empty",
        message: "Choose a file to add. Nothing was saved.",
      };
    }
    var size = Number(file.size);
    if (!isFinite(size) || size <= 0) {
      return {
        ok: false,
        code: "empty",
        message: "That file is empty. Nothing was saved.",
      };
    }
    if (size > MAX_BYTES) {
      return {
        ok: false,
        code: "too_large",
        message: "That file is over 10 MB. Nothing was saved.",
      };
    }
    var kind = kindOf(file);
    if (slot.kinds.indexOf(kind) === -1) {
      return {
        ok: false,
        code: "type",
        message: slot.rejectMessage || PHOTO_REJECT,
      };
    }
    var fileName = baseName(file.name);
    if (!fileName) fileName = defaultName(kind);
    else fileName = ensureExtension(fileName, kind);
    return {
      ok: true,
      slot: slot.id,
      kind: kind,
      fileName: fileName,
      mime: mimeFor(kind, file),
      size: size,
    };
  }

  /**
   * Fail closed: a valid file is still not saved when storage is unavailable.
   */
  function decideSave(canStore, verdict) {
    if (!canStore) {
      return { save: false, message: STORAGE_UNAVAILABLE };
    }
    if (!verdict || !verdict.ok) {
      return {
        save: false,
        message: (verdict && verdict.message) || "Nothing was saved.",
      };
    }
    return { save: true, message: "" };
  }

  function canPersist() {
    try {
      return typeof root.indexedDB !== "undefined" && !!root.indexedDB;
    } catch (e) {
      return false;
    }
  }

  function canPreview(mime) {
    return (
      mime === "image/jpeg" ||
      mime === "image/png" ||
      mime === "image/gif" ||
      mime === "image/webp" ||
      mime === "image/bmp"
    );
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function actionLabel(slot, verb) {
    if (verb === "add") return "Add " + slot.noun;
    if (verb === "replace") return "Replace " + slot.noun;
    if (verb === "remove") return "Remove " + slot.noun;
    return "Open " + slot.noun;
  }

  var records = {};
  var storageReady = false;
  var checking = false;
  var liveStatus = "";
  var slotNotes = {};
  var busySlot = "";
  var bootToken = 0;
  var previewUrls = [];
  var wired = false;

  function revokePreviews() {
    previewUrls.forEach(function (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        /* ignore */
      }
    });
    previewUrls = [];
  }

  function storageErrorMessage(err) {
    var name = err && (err.name || "");
    if (name === "QuotaExceededError") return STORAGE_FULL;
    return STORAGE_UNAVAILABLE;
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var idb = null;
      try {
        idb = root.indexedDB;
      } catch (e) {
        idb = null;
      }
      if (!idb) {
        reject(Object.assign(new Error("unavailable"), { code: "unavailable" }));
        return;
      }
      var req;
      try {
        req = idb.open(DB_NAME, DB_VERSION);
      } catch (e) {
        reject(Object.assign(e instanceof Error ? e : new Error("unavailable"), { code: "unavailable" }));
        return;
      }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "slot" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("open failed"));
      };
      req.onblocked = function () {
        reject(Object.assign(new Error("blocked"), { code: "unavailable" }));
      };
    });
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(Object.assign(new Error("timeout"), { code: "unavailable" }));
      }, ms);
      promise.then(
        function (value) {
          clearTimeout(timer);
          resolve(value);
        },
        function (err) {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  function listRecords() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, "readonly");
        var req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = function () {
          try {
            db.close();
          } catch (e) {
            /* ignore */
          }
          resolve(req.result || []);
        };
        req.onerror = function () {
          try {
            db.close();
          } catch (e2) {
            /* ignore */
          }
          reject(req.error || new Error("read failed"));
        };
      });
    });
  }

  function putRecord(record) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, "readwrite");
        var settled = false;
        function finish(err) {
          if (settled) return;
          settled = true;
          try {
            db.close();
          } catch (e) {
            /* ignore */
          }
          if (err) reject(err);
          else resolve(true);
        }
        tx.oncomplete = function () {
          finish(null);
        };
        tx.onerror = function () {
          finish(tx.error || new Error("write failed"));
        };
        tx.onabort = function () {
          finish(tx.error || new Error("write aborted"));
        };
        try {
          tx.objectStore(STORE_NAME).put(record);
        } catch (e) {
          try {
            tx.abort();
          } catch (e2) {
            /* ignore */
          }
          finish(e);
        }
      });
    });
  }

  function deleteRecord(slot) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, "readwrite");
        var settled = false;
        function finish(err) {
          if (settled) return;
          settled = true;
          try {
            db.close();
          } catch (e) {
            /* ignore */
          }
          if (err) reject(err);
          else resolve(true);
        }
        tx.oncomplete = function () {
          finish(null);
        };
        tx.onerror = function () {
          finish(tx.error || new Error("delete failed"));
        };
        tx.onabort = function () {
          finish(tx.error || new Error("delete aborted"));
        };
        try {
          tx.objectStore(STORE_NAME).delete(slot);
        } catch (e) {
          try {
            tx.abort();
          } catch (e2) {
            /* ignore */
          }
          finish(e);
        }
      });
    });
  }

  function rememberRows(rows) {
    records = {};
    (rows || []).forEach(function (row) {
      if (!row || !slotById(row.slot) || !row.blob) return;
      var kind = row.kind || kindOf({ name: row.fileName, type: row.mime });
      records[row.slot] = {
        slot: row.slot,
        fileName: baseName(row.fileName) || defaultName(kind),
        mime: String(row.mime || ""),
        size: Number(row.size) || (row.blob && row.blob.size) || 0,
        kind: kind,
        storedAt: String(row.storedAt || ""),
        blob: row.blob,
      };
    });
  }

  function sectionEl() {
    return root.document && root.document.querySelector("[data-jobs-credentials]");
  }

  function render() {
    var section = sectionEl();
    if (!section) return;
    var alertEl = section.querySelector("[data-jobs-credentials-alert]");
    var listEl = section.querySelector("[data-jobs-credentials-list]");
    var statusEl = section.querySelector("[data-jobs-credentials-status]");
    if (alertEl) {
      if (!checking && !storageReady) {
        alertEl.hidden = false;
        alertEl.textContent = STORAGE_UNAVAILABLE;
      } else {
        alertEl.hidden = true;
        alertEl.textContent = "";
      }
    }
    if (statusEl) statusEl.textContent = liveStatus || "";
    section.setAttribute("aria-busy", checking || busySlot ? "true" : "false");
    if (!listEl) return;
    revokePreviews();
    if (checking) {
      listEl.innerHTML =
        '<p class="jobs-credentials-empty">Checking this browser…</p>';
      return;
    }
    listEl.innerHTML = SLOTS.map(function (slot) {
      return renderSlot(slot, records[slot.id] || null);
    }).join("");
    listEl.querySelectorAll("[data-credential-preview]").forEach(function (img) {
      img.addEventListener("error", function () {
        img.hidden = true;
      });
    });
  }

  function renderSlot(slot, record) {
    var note = slotNotes[slot.id];
    var noteHtml = "";
    if (note && note.text) {
      noteHtml =
        '<p class="jobs-credentials-slot-note' +
        (note.error ? " is-error" : "") +
        '">' +
        escapeHtml(note.text) +
        "</p>";
    }
    var disabled = !storageReady || busySlot === slot.id;
    var body;
    if (!record) {
      body =
        '<p class="jobs-credentials-empty">' +
        escapeHtml(slot.empty) +
        "</p>" +
        '<div class="jobs-credentials-actions">' +
        fileControl(slot, "add", disabled) +
        "</div>";
    } else {
      var preview = "";
      if (record.blob && canPreview(record.mime) && typeof URL !== "undefined" && URL.createObjectURL) {
        try {
          var url = URL.createObjectURL(record.blob);
          previewUrls.push(url);
          preview =
            '<img class="jobs-credentials-preview" data-credential-preview alt="Saved ' +
            escapeHtml(slot.noun) +
            '" src="' +
            escapeHtml(url) +
            '">';
        } catch (e) {
          preview = "";
        }
      }
      body =
        '<div class="jobs-credentials-filecard">' +
        preview +
        '<p class="jobs-credentials-filename">' +
        escapeHtml(record.fileName) +
        "</p>" +
        '<p class="jobs-credentials-meta">' +
        escapeHtml(kindLabel(record.kind) + " · " + formatBytes(record.size) + " · saved in this browser") +
        "</p></div>" +
        '<div class="jobs-credentials-actions">' +
        fileControl(slot, "replace", disabled) +
        '<button type="button" class="jobs-credentials-btn" data-credential-open data-slot="' +
        escapeHtml(slot.id) +
        '"' +
        (disabled ? " disabled" : "") +
        ">" +
        escapeHtml(actionLabel(slot, "open")) +
        "</button>" +
        '<button type="button" class="jobs-credentials-btn" data-credential-remove data-slot="' +
        escapeHtml(slot.id) +
        '"' +
        (disabled ? " disabled" : "") +
        ">" +
        escapeHtml(actionLabel(slot, "remove")) +
        "</button></div>";
    }
    return (
      '<article class="jobs-credentials-slot" data-credential-slot="' +
      escapeHtml(slot.id) +
      '"><h5 class="jobs-credentials-label">' +
      escapeHtml(slot.title) +
      '</h5><p class="jobs-credentials-hint">' +
      escapeHtml(slot.hint) +
      "</p>" +
      body +
      noteHtml +
      "</article>"
    );
  }

  function fileControl(slot, verb, disabled) {
    if (disabled && !storageReady) {
      return (
        '<button type="button" class="jobs-credentials-btn" disabled>' +
        escapeHtml(actionLabel(slot, verb)) +
        "</button>"
      );
    }
    return (
      '<label class="jobs-credentials-file">' +
      "<span>" +
      escapeHtml(actionLabel(slot, verb)) +
      "</span>" +
      '<input type="file" data-credential-file data-slot="' +
      escapeHtml(slot.id) +
      '" accept="' +
      escapeHtml(acceptAttr(slot)) +
      '"' +
      (disabled ? " disabled" : "") +
      ">" +
      "</label>"
    );
  }

  function setSlotNote(slotId, text, isError) {
    if (!text) delete slotNotes[slotId];
    else slotNotes[slotId] = { text: text, error: !!isError };
  }

  function handleAdd(slotId, file) {
    if (!file || busySlot) return;
    var slot = slotById(slotId);
    if (!slot) return;
    var verdict = acceptFile(slotId, file);
    var decision = decideSave(storageReady, verdict);
    if (!decision.save) {
      setSlotNote(slotId, decision.message, true);
      liveStatus = decision.message;
      render();
      return;
    }
    var previous = records[slotId] || null;
    var blob;
    try {
      blob = file.slice(0, file.size, verdict.mime);
    } catch (e) {
      setSlotNote(slotId, STORAGE_UNAVAILABLE, true);
      liveStatus = STORAGE_UNAVAILABLE;
      render();
      return;
    }
    var next = {
      slot: slotId,
      fileName: verdict.fileName,
      mime: verdict.mime,
      size: verdict.size,
      kind: verdict.kind,
      storedAt: new Date().toISOString(),
      blob: blob,
    };
    busySlot = slotId;
    setSlotNote(slotId, "", false);
    liveStatus = "Saving the " + slot.noun + " in this browser…";
    render();
    putRecord(next).then(
      function () {
        if (busySlot === slotId) busySlot = "";
        records[slotId] = next;
        setSlotNote(slotId, "", false);
        liveStatus = (previous ? "Replaced the " : "Saved the ") + slot.noun + " in this browser.";
        render();
      },
      function (err) {
        if (busySlot === slotId) busySlot = "";
        if (previous) records[slotId] = previous;
        else delete records[slotId];
        var message = storageErrorMessage(err);
        setSlotNote(slotId, message, true);
        liveStatus = message;
        if (message === STORAGE_UNAVAILABLE) storageReady = false;
        render();
      }
    );
  }

  function handleRemove(slotId) {
    if (busySlot || !storageReady || !records[slotId]) return;
    var slot = slotById(slotId);
    if (!slot) return;
    var previous = records[slotId];
    busySlot = slotId;
    setSlotNote(slotId, "", false);
    liveStatus = "Removing the " + slot.noun + " from this browser…";
    render();
    deleteRecord(slotId).then(
      function () {
        if (busySlot === slotId) busySlot = "";
        delete records[slotId];
        setSlotNote(slotId, "", false);
        liveStatus = "Removed the " + slot.noun + " from this browser.";
        render();
      },
      function (err) {
        if (busySlot === slotId) busySlot = "";
        records[slotId] = previous;
        var message = storageErrorMessage(err);
        setSlotNote(slotId, message, true);
        liveStatus = message;
        if (message === STORAGE_UNAVAILABLE) storageReady = false;
        render();
      }
    );
  }

  function handleOpen(slotId) {
    var record = records[slotId];
    var slot = slotById(slotId);
    if (!record || !record.blob || !slot) {
      setSlotNote(slotId, "Could not open that copy. Nothing was sent.", true);
      liveStatus = "Could not open that copy. Nothing was sent.";
      render();
      return;
    }
    var url;
    try {
      url = URL.createObjectURL(record.blob);
    } catch (e) {
      setSlotNote(slotId, "Could not open that copy. Nothing was sent.", true);
      liveStatus = "Could not open that copy. Nothing was sent.";
      render();
      return;
    }
    var opened = false;
    if (record.kind === "pdf" || record.kind === "image") {
      try {
        var popup = root.open(url, "_blank", "noopener,noreferrer");
        opened = !!popup;
      } catch (e2) {
        opened = false;
      }
    }
    if (!opened) {
      var a = root.document.createElement("a");
      a.href = url;
      a.download = record.fileName || "document";
      a.rel = "noopener";
      root.document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(function () {
      try {
        URL.revokeObjectURL(url);
      } catch (e3) {
        /* ignore */
      }
    }, 60000);
  }

  function wire(section) {
    if (wired) return;
    wired = true;
    section.addEventListener("change", function (event) {
      var input = event.target && event.target.closest ? event.target.closest("[data-credential-file]") : null;
      if (!input || !section.contains(input)) return;
      var file = input.files && input.files[0];
      var slotId = input.getAttribute("data-slot");
      input.value = "";
      if (!file) return;
      handleAdd(slotId, file);
    });
    section.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var openBtn = target.closest("[data-credential-open]");
      if (openBtn && section.contains(openBtn)) {
        handleOpen(openBtn.getAttribute("data-slot"));
        return;
      }
      var removeBtn = target.closest("[data-credential-remove]");
      if (removeBtn && section.contains(removeBtn)) {
        handleRemove(removeBtn.getAttribute("data-slot"));
      }
    });
  }

  function load() {
    var section = sectionEl();
    if (!section) return;
    wire(section);
    var token = ++bootToken;
    if (!canPersist()) {
      checking = false;
      storageReady = false;
      records = {};
      render();
      return;
    }
    checking = true;
    storageReady = false;
    render();
    withTimeout(listRecords(), 4000).then(
      function (rows) {
        if (token !== bootToken) return;
        checking = false;
        storageReady = true;
        rememberRows(rows);
        render();
      },
      function () {
        if (token !== bootToken) return;
        checking = false;
        storageReady = false;
        records = {};
        render();
      }
    );
  }

  var api = {
    SLOTS: SLOTS,
    DB_NAME: DB_NAME,
    STORE_NAME: STORE_NAME,
    MAX_BYTES: MAX_BYTES,
    DEMO_NOTE: DEMO_NOTE,
    STORAGE_UNAVAILABLE: STORAGE_UNAVAILABLE,
    STORAGE_FULL: STORAGE_FULL,
    slotById: slotById,
    kindOf: kindOf,
    acceptFile: acceptFile,
    acceptAttr: acceptAttr,
    decideSave: decideSave,
    canPersist: canPersist,
    formatBytes: formatBytes,
    baseName: baseName,
  };

  root.WaymakersCareerCredentials = api;

  if (root.document && typeof root.document.addEventListener === "function") {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", load);
    } else {
      load();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
