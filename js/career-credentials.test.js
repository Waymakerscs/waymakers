/**
 * CAREER credentials — file rules and fail-closed gate.
 * Run: node js/career-credentials.test.js
 */
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var src = fs.readFileSync(path.join(__dirname, "career-credentials.js"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src), "no network fetch");
assert.ok(!/\bXMLHttpRequest\b/.test(src), "no XHR");
assert.ok(!/\bsendBeacon\b/.test(src), "no beacon");
assert.ok(!/\bWebSocket\b/.test(src), "no websocket");
assert.ok(!/\bFormData\b/.test(src), "no upload form body");
assert.ok(!/\blocalStorage\b/.test(src), "bytes do not fall back to localStorage");
assert.ok(!/\bsessionStorage\b/.test(src), "bytes do not fall back to sessionStorage");
assert.ok(!/\/api\//.test(src), "no API path");
assert.ok(/indexedDB/.test(src), "uses IndexedDB");

require("./career-credentials.js");
var cred = global.WaymakersCareerCredentials;
assert.ok(cred, "WaymakersCareerCredentials is exported");

assert.strictEqual(cred.DB_NAME, "waymakers.career.credentials.v1");
assert.strictEqual(cred.MAX_BYTES, 10 * 1024 * 1024);
assert.ok(/this browser only/.test(cred.DEMO_NOTE));
assert.ok(/Nothing is uploaded/.test(cred.DEMO_NOTE));
assert.ok(/Nothing was saved/.test(cred.STORAGE_UNAVAILABLE));
assert.ok(/nothing was sent/.test(cred.STORAGE_UNAVAILABLE));

var ids = cred.SLOTS.map(function (s) {
  return s.id;
});
assert.deepStrictEqual(ids, ["licensure", "credentialing", "degree", "resume"]);

function file(name, type, size) {
  return { name: name, type: type || "", size: size == null ? 1200 : size };
}

["licensure", "credentialing", "degree"].forEach(function (slot) {
  ["license.pdf", "scan.jpg", "scan.jpeg", "scan.png", "scan.gif", "scan.webp", "scan.bmp", "scan.tif", "scan.tiff", "scan.heic"].forEach(function (name) {
    var ok = cred.acceptFile(slot, file(name, "", 2048));
    assert.strictEqual(ok.ok, true, slot + " should accept " + name);
  });
  assert.strictEqual(cred.acceptFile(slot, file("notes.docx", "", 2048)).ok, false, slot + " rejects docx");
  assert.strictEqual(cred.acceptFile(slot, file("mark.svg", "image/svg+xml", 2048)).ok, false, slot + " rejects svg");
  var resumeOnly = cred.acceptFile(slot, file("cv.doc", "application/msword", 2048));
  assert.strictEqual(resumeOnly.ok, false);
  assert.ok(/Nothing was saved/.test(resumeOnly.message));
});

assert.strictEqual(cred.acceptFile("resume", file("Ada-Resume.pdf", "application/pdf", 5000)).ok, true);
assert.strictEqual(cred.acceptFile("resume", file("Ada-Resume.doc", "", 5000)).ok, true);
assert.strictEqual(cred.acceptFile("resume", file("Ada-Resume.docx", "application/octet-stream", 5000)).ok, true);
assert.strictEqual(
  cred.acceptFile("resume", file("Ada-Resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 5000)).kind,
  "docx"
);
var photoResume = cred.acceptFile("resume", file("headshot.png", "image/png", 5000));
assert.strictEqual(photoResume.ok, false);
assert.ok(/PDF, DOC, or DOCX/.test(photoResume.message));
assert.strictEqual(cred.acceptFile("resume", file("packet.zip", "application/zip", 5000)).ok, false);

var mimePdf = cred.acceptFile("resume", file("", "application/pdf", 80));
assert.strictEqual(mimePdf.ok, true);
assert.strictEqual(mimePdf.fileName, "document.pdf");
assert.strictEqual(mimePdf.mime, "application/pdf");

var pathName = cred.acceptFile("licensure", file("C:\\Users\\Ada\\secret\\license.pdf", "application/pdf", 80));
assert.strictEqual(pathName.fileName, "license.pdf");
var slashName = cred.acceptFile("degree", file("../../diploma.png", "image/png", 80));
assert.strictEqual(slashName.fileName, "diploma.png");
assert.strictEqual(slashName.kind, "image");

assert.strictEqual(cred.acceptFile("resume", file("empty.pdf", "application/pdf", 0)).code, "empty");
assert.strictEqual(cred.acceptFile("resume", null).code, "empty");
assert.strictEqual(cred.acceptFile("nope", file("a.pdf", "application/pdf", 10)).code, "unknown_slot");
var huge = cred.acceptFile("licensure", file("big.pdf", "application/pdf", cred.MAX_BYTES + 1));
assert.strictEqual(huge.code, "too_large");
assert.ok(/Nothing was saved/.test(huge.message));
assert.strictEqual(cred.acceptFile("licensure", file("edge.pdf", "application/pdf", cred.MAX_BYTES)).ok, true);

var resumeAccept = cred.acceptAttr(cred.slotById("resume"));
assert.ok(resumeAccept.indexOf(".pdf") !== -1);
assert.ok(resumeAccept.indexOf(".docx") !== -1);
assert.ok(resumeAccept.indexOf(".png") === -1);
var licenseAccept = cred.acceptAttr(cred.slotById("licensure"));
assert.ok(licenseAccept.indexOf(".png") !== -1);
assert.ok(licenseAccept.indexOf(".docx") === -1);
assert.ok(licenseAccept.indexOf("image/svg") === -1);

var blocked = cred.decideSave(false, { ok: true, slot: "resume" });
assert.strictEqual(blocked.save, false);
assert.strictEqual(blocked.message, cred.STORAGE_UNAVAILABLE);
var badType = cred.acceptFile("resume", file("pic.jpg", "image/jpeg", 10));
var refused = cred.decideSave(true, badType);
assert.strictEqual(refused.save, false);
assert.ok(/Nothing was saved/.test(refused.message));
var allowed = cred.decideSave(true, cred.acceptFile("degree", file("diploma.jpg", "image/jpeg", 10)));
assert.strictEqual(allowed.save, true);

cred.SLOTS.forEach(function (slot) {
  assert.ok(slot.title && slot.hint && slot.empty && slot.noun);
  assert.ok(/saved yet/.test(slot.empty));
  assert.ok(!/!/.test(slot.empty), "empty copy stays calm");
});

assert.strictEqual(cred.formatBytes(512), "512 B");
assert.strictEqual(cred.formatBytes(2048), "2.0 KB");

if (typeof indexedDB === "undefined") {
  assert.strictEqual(cred.canPersist(), false, "missing IndexedDB fails closed");
}

var html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.ok(html.indexOf('data-jobs-credentials') !== -1, "section lives on the page");
assert.ok(html.indexOf("Credentials &amp; documents") !== -1);
assert.ok(html.indexOf(cred.DEMO_NOTE) !== -1, "demo label matches the page");
assert.ok(html.indexOf('src="js/career-credentials.js"') !== -1);
var tablist = html.split('aria-label="WAYMAKERS topics"')[1].split("</div>")[0];
assert.ok(tablist.indexOf(">WELL<") !== -1);
assert.ok(tablist.indexOf(">PLAN<") !== -1);
assert.ok(tablist.indexOf(">DESK<") !== -1);
assert.ok(tablist.indexOf(">PAGES<") !== -1);
assert.ok(tablist.indexOf(">HOME<") !== -1);
assert.ok(tablist.indexOf(">CAREER<") !== -1);
assert.ok(tablist.indexOf(">TRANSIT<") !== -1);
assert.ok(tablist.indexOf(">WELL<") < tablist.indexOf(">PLAN<") && tablist.indexOf(">PLAN<") < tablist.indexOf(">DESK<"), "PLAN sits immediately to the right of WELL");
assert.ok(tablist.indexOf(">CAREER<") < tablist.indexOf(">TRANSIT<"));
assert.strictEqual((tablist.slice(tablist.indexOf(">CAREER<"), tablist.indexOf(">TRANSIT<")).match(/role="tab"/g) || []).length, 1, "TRANSIT sits immediately to the right of CAREER");
assert.strictEqual((tablist.match(/role="tab"/g) || []).length, 7, "CAREER stays one of the existing tabs");
assert.ok(tablist.indexOf("CREDENTIAL") === -1);
var careerPanel = html.split('id="panel-jobs"')[1].split('id="panel-')[0];
assert.ok(careerPanel.indexOf("data-jobs-credentials") !== -1, "section is inside CAREER");
assert.ok(html.split('id="panel-well"')[1].split('id="panel-desk"')[0].indexOf("data-jobs-credentials") === -1);

console.log("career-credentials.test.js ok");
