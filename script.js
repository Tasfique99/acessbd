/* ============================================================
   ACCESSBD — Main script
   Demo mode with clearly separated API hooks.
   ============================================================ */

/* ---------- Demo Data (clearly separated) ---------- */
const DEMO_DATA = {
  schoolNotice: {
    name: "School Science Exhibition 2026",
    language: "English",
    confidence: "94%",
    text: `NOTICE

School Science Exhibition 2026

Students participating in the Science Exhibition must submit their project forms to the school office before 30 September 2026.

Participants must bring their completed project materials on the exhibition day.

For further information, contact the Science Department.`,
    translationBn: `বিজ্ঞপ্তি

স্কুল বিজ্ঞান প্রদর্শনী ২০২৬

বিজ্ঞান প্রদর্শনীতে অংশগ্রহণকারী শিক্ষার্থীদের ৩০ সেপ্টেম্বর ২০২৬-এর আগে তাদের প্রকল্পের ফর্ম স্কুল অফিসে জমা দিতে হবে।

অংশগ্রহণকারীদের প্রদর্শনীর দিনে তাদের সম্পূর্ণ প্রকল্প সামগ্রী সাথে আনতে হবে।

আরও তথ্যের জন্য বিজ্ঞান বিভাগের সাথে যোগাযোগ করুন।`,
    simpleEn: `NOTICE

School Science Exhibition 2026

If you are joining the Science Exhibition, submit your project form to the school office before 30 September 2026.

Bring your finished project materials on the exhibition day.

For more info, contact the Science Department.`,
    simpleBn: `বিজ্ঞপ্তি

স্কুল বিজ্ঞান প্রদর্শনী ২০২৬

আপনি যদি বিজ্ঞান প্রদর্শনীতে অংশ নেন, ৩০ সেপ্টেম্বর ২০২৬-এর আগে আপনার প্রকল্প ফর্ম স্কুল অফিসে জমা দিন।

প্রদর্শনীর দিন আপনার সম্পূর্ণ প্রকল্প সামগ্রী আনুন।

আরও তথ্যের জন্য বিজ্ঞান বিভাগে যোগাযোগ করুন।`,
    isForm: false
  }
};

/* ---------- App State ---------- */
let currentDocument = null;   // { name, text, language, confidence, isForm, demoKey }
let currentImageDataUrl = null;
let currentQuestion = null;

/* ============================================================
   INIT
   ============================================================ */
function initApp() {
  applyAccessibilitySettings();
  setupNavigation();
  setupMobileMenu();
  setupUpload();
  setupCamera();
  setupActions();
  setupAccessibilityControls();
  loadHistory();
}

document.addEventListener("DOMContentLoaded", initApp);

/* ============================================================
   NAVIGATION
   ============================================================ */
function setupNavigation() {
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const target = el.dataset.nav;
      showPage(target);
    });
  });

  // Hero demo button
  const heroBtn = document.getElementById("heroDemoBtn");
  if (heroBtn) heroBtn.addEventListener("click", () => {
    showPage("scan");
    setTimeout(() => loadSampleDocument(), 100);
  });
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + name);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.nav === name);
  });

  // Close mobile menu
  document.getElementById("mainNav").classList.remove("open");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");

  // Refresh history when opening history page
  if (name === "history") loadHistory();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

/* ============================================================
   UPLOAD / CAMERA
   ============================================================ */
function setupUpload() {
  const uploadBtn = document.getElementById("uploadImageBtn");
  const fileInput = document.getElementById("fileInput");
  const uploadArea = document.getElementById("uploadArea");

  uploadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) handleImageUpload(e.target.files[0]);
  });

  // Drag & drop
  ["dragover", "dragenter"].forEach(evt => {
    uploadArea.addEventListener(evt, e => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(evt => {
    uploadArea.addEventListener(evt, e => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
    });
  });
  uploadArea.addEventListener("drop", e => {
    const f = e.dataTransfer.files[0];
    if (f) handleImageUpload(f);
  });

  document.getElementById("changeImageBtn").addEventListener("click", resetUpload);
  document.getElementById("scanDocumentBtn").addEventListener("click", () => {
    if (!currentImageDataUrl) return showToast("Please select an image first.");
    processDocument({ name: "Uploaded image", image: currentImageDataUrl });
  });
}

function handleImageUpload(file) {
  if (!file.type.startsWith("image/")) {
    return showToast("Please choose a valid image file (JPG, PNG, WEBP).");
  }
  const reader = new FileReader();
  reader.onload = e => {
    currentImageDataUrl = e.target.result;
    showImagePreview(currentImageDataUrl);
  };
  reader.readAsDataURL(file);
}

function showImagePreview(url) {
  document.getElementById("uploadPlaceholder").hidden = true;
  document.getElementById("imagePreviewContainer").hidden = false;
  document.getElementById("imagePreview").src = url;
}

function resetUpload() {
  currentImageDataUrl = null;
  document.getElementById("fileInput").value = "";
  document.getElementById("uploadPlaceholder").hidden = false;
  document.getElementById("imagePreviewContainer").hidden = true;
  document.getElementById("resultArea").hidden = true;
}

function setupCamera() {
  const takePhotoBtn = document.getElementById("takePhotoBtn");
  const cameraBox = document.getElementById("cameraBox");
  const video = document.getElementById("cameraPreview");
  const captureBtn = document.getElementById("captureBtn");
  const closeBtn = document.getElementById("closeCameraBtn");
  let stream = null;

  takePhotoBtn.addEventListener("click", async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return showToast("Camera not supported in this browser. Please upload an image instead.");
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      cameraBox.hidden = false;
    } catch (err) {
      showToast("Camera permission denied or unavailable. You can still upload an image.");
    }
  });

  captureBtn.addEventListener("click", () => {
    const canvas = document.getElementById("cameraCanvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    currentImageDataUrl = dataUrl;
    closeStream();
    showImagePreview(dataUrl);
  });

  closeBtn.addEventListener("click", closeStream);

  function closeStream() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    cameraBox.hidden = true;
  }
}

/* ============================================================
   DOCUMENT PROCESSING (OCR placeholder)
   ============================================================ */
async function processDocument(source) {
  // source: { name, image } OR { demoKey }
  if (source.demoKey) {
    const demo = DEMO_DATA[source.demoKey];
    if (!demo) return showToast("Sample document not found.");
    currentDocument = {
      name: demo.name,
      text: demo.text,
      language: demo.language,
      confidence: demo.confidence,
      isForm: demo.isForm,
      demoKey: source.demoKey
    };
    displayResult();
    saveToHistory(currentDocument);
    return;
  }

  if (source.image) {
    showToast("Reading document…");
    // TODO: Connect real OCR API here (e.g. Tesseract.js, Google Vision, etc.)
    // For now, fall back to demo text.
    const fallback = DEMO_DATA.schoolNotice;
    currentDocument = {
      name: source.name || "Scanned document",
      text: fallback.text,
      language: fallback.language,
      confidence: "88% (demo fallback)",
      isForm: false,
      demoKey: "schoolNotice"
    };
    displayResult();
    saveToHistory(currentDocument);
  }
}

function displayResult() {
  const area = document.getElementById("resultArea");
  area.hidden = false;

  document.getElementById("detectedLanguage").textContent = "Language: " + currentDocument.language;
  document.getElementById("detectedConfidence").textContent = "Confidence: " + currentDocument.confidence;

  document.getElementById("extractedText").textContent = currentDocument.text;

  // Reset panels
  ["translatePanel", "simplifyPanel", "askPanel", "formAssistant"].forEach(id => {
    document.getElementById(id).hidden = true;
  });
  document.getElementById("translatedText").textContent = "";
  document.getElementById("simplifiedText").textContent = "";
  document.getElementById("askAnswer").textContent = "";
  document.getElementById("askInput").value = "";

  if (currentDocument.isForm) {
    document.getElementById("formAssistant").hidden = false;
  }

  area.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ============================================================
   ACTION BAR
   ============================================================ */
function setupActions() {
  document.getElementById("trySampleBtn").addEventListener("click", loadSampleDocument);
  document.getElementById("readAloudBtn").addEventListener("click", () => {
    if (!currentDocument) return showToast("No document loaded.");
    speakText(currentDocument.text, currentDocument.language === "Bangla" ? "bn" : "en");
  });
  document.getElementById("stopSpeakingBtn").addEventListener("click", stopSpeaking);

  document.getElementById("translateBtn").addEventListener("click", () => {
    if (!currentDocument) return showToast("No document loaded.");
    const panel = document.getElementById("translatePanel");
    panel.hidden = false;
    translateDocument(currentDocument.text, "bn");
  });
  document.getElementById("simplifyBtn").addEventListener("click", () => {
    if (!currentDocument) return showToast("No document loaded.");
    const panel = document.getElementById("simplifyPanel");
    panel.hidden = false;
    simplifyDocument(currentDocument.text, "en");
  });
  document.getElementById("askDocumentBtn").addEventListener("click", () => {
    if (!currentDocument) return showToast("No document loaded.");
    document.getElementById("askPanel").hidden = false;
    document.getElementById("askInput").focus();
  });

  // Translate language buttons
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll('[data-lang]').forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      translateDocument(currentDocument.text, btn.dataset.lang);
    });
  });

  // Simplify buttons
  document.querySelectorAll('[data-simplify]').forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll('[data-simplify]').forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      simplifyDocument(currentDocument.text, btn.dataset.simplify);
    });
  });

  // Ask
  document.getElementById("askSubmitBtn").addEventListener("click", submitQuestion);
  document.getElementById("askInput").addEventListener("keydown", e => {
    if (e.key === "Enter") submitQuestion();
  });
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.getElementById("askInput").value = chip.dataset.question;
      submitQuestion();
    });
  });

  // Form assistant
  document.getElementById("explainFormBtn").addEventListener("click", explainForm);
}

function loadSampleDocument() {
  processDocument({ demoKey: "schoolNotice" });
}

function submitQuestion() {
  const input = document.getElementById("askInput");
  const q = input.value.trim();
  if (!q) return showToast("Please type a question first.");
  if (!currentDocument) return showToast("No document loaded.");
  const answer = askDocument(currentDocument.text, q);
  document.getElementById("askAnswer").textContent = answer;
}

/* ============================================================
   TRANSLATION (demo — replace later with real API)
   ============================================================ */
function translateDocument(text, targetLang) {
  const out = document.getElementById("translatedText");
  if (!currentDocument) return;

  // Demo translation: if sample loaded, use canned Bangla
  if (currentDocument.demoKey === "schoolNotice" && targetLang === "bn") {
    out.textContent = DEMO_DATA.schoolNotice.translationBn;
    return;
  }
  if (targetLang === "en") {
    out.textContent = currentDocument.text;
    return;
  }
  // TODO: Connect real translation API here
  out.textContent = "[Demo translation]\n\n" + text;
}

/* ============================================================
   SIMPLIFY (demo — replace later with AI API)
   ============================================================ */
function simplifyDocument(text, lang) {
  const out = document.getElementById("simplifiedText");
  if (!currentDocument) return;

  if (currentDocument.demoKey === "schoolNotice") {
    out.textContent = lang === "bn"
      ? DEMO_DATA.schoolNotice.simpleBn
      : DEMO_DATA.schoolNotice.simpleEn;
    return;
  }
  // TODO: Connect real simplification AI API here
  out.textContent = text;
}

/* ============================================================
   ASK THE DOCUMENT (demo — replace later with AI API)
   ============================================================ */
function askDocument(documentText, question) {
  const q = question.toLowerCase();

  // Simple rule-based demo answers
  if (currentDocument && currentDocument.demoKey === "schoolNotice") {
    if (q.includes("deadline") || q.includes("when") || q.includes("date") || q.includes("last date")) {
      return "The project form must be submitted before 30 September 2026.";
    }
    if (q.includes("who") && q.includes("participate")) {
      return "Students participating in the Science Exhibition may take part. They must bring their completed project materials on the exhibition day.";
    }
    if (q.includes("submit") || q.includes("what do i need")) {
      return "You need to submit your project form to the school office before 30 September 2026, and bring your completed project materials on the exhibition day.";
    }
    if (q.includes("bangla") || q.includes("বাংলা")) {
      return "সারসংক্ষেপ: বিজ্ঞান প্রদর্শনীতে অংশ নিতে চাইলে ৩০ সেপ্টেম্বর ২০২৬-এর আগে স্কুল অফিসে প্রকল্প ফর্ম জমা দিতে হবে এবং প্রদর্শনীর দিনে সম্পূর্ণ প্রকল্প সামগ্রী আনতে হবে।";
    }
    if (q.includes("summar") || q.includes("summary") || q.includes("সারসংক্ষেপ")) {
      return "Summary: This is a notice about the School Science Exhibition 2026. Students must submit project forms to the school office before 30 September 2026, and bring completed project materials on the exhibition day.";
    }
  }

  // Fallback
  if (documentText.toLowerCase().includes(q.split(" ").pop())) {
    return "The document mentions that information, but the demo Q&A system cannot fully explain it. Please connect a real AI API for detailed answers.";
  }

  return "The document does not provide that information.";
}

/* ============================================================
   TEXT TO SPEECH
   ============================================================ */
function speakText(text, language) {
  if (!("speechSynthesis" in window)) {
    return showToast("Speech not supported in this browser.");
  }
  stopSpeaking();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = language === "bn" ? "bn-BD" : "en-US";
  utter.rate = 0.95;

  utter.onstart = () => {
    document.getElementById("stopSpeakingBtn").hidden = false;
    document.getElementById("readAloudBtn").textContent = "🔊 Reading aloud…";
  };
  utter.onend = () => {
    document.getElementById("stopSpeakingBtn").hidden = true;
    document.getElementById("readAloudBtn").textContent = "🔊 Read Aloud";
  };
  utter.onerror = () => {
    document.getElementById("stopSpeakingBtn").hidden = true;
    document.getElementById("readAloudBtn").textContent = "🔊 Read Aloud";
    showToast("Could not read this text aloud.");
  };

  window.speechSynthesis.speak(utter);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  document.getElementById("stopSpeakingBtn").hidden = true;
  const btn = document.getElementById("readAloudBtn");
  if (btn) btn.textContent = "🔊 Read Aloud";
}

/* ============================================================
   FORM ASSISTANT
   ============================================================ */
function explainForm() {
  const box = document.getElementById("formExplanation");
  box.hidden = false;
  box.innerHTML = `
    <p><strong>Full Name:</strong> Write your complete name as it appears on official papers.</p>
    <p><strong>Date of Birth:</strong> The day, month, and year you were born.</p>
    <p><strong>Address:</strong> Your current home address including district.</p>
    <p><strong>Phone Number:</strong> A mobile number where you can be reached.</p>
    <p><strong>Signature:</strong> Your handwritten signature or a mark.</p>
    <p><em>AccessBD will never fill or submit this form for you.</em></p>
  `;
}

/* ============================================================
   HISTORY (localStorage)
   ============================================================ */
function saveToHistory(doc) {
  const history = JSON.parse(localStorage.getItem("accessbd_history") || "[]");
  history.unshift({
    id: Date.now(),
    name: doc.name,
    date: new Date().toLocaleString(),
    language: doc.language,
    preview: doc.text.slice(0, 160),
    text: doc.text,
    demoKey: doc.demoKey || null
  });
  localStorage.setItem("accessbd_history", JSON.stringify(history.slice(0, 30)));
  loadHistory();
}

function loadHistory() {
  const list = document.getElementById("historyList");
  const empty = document.getElementById("historyEmpty");
  const history = JSON.parse(localStorage.getItem("accessbd_history") || "[]");

  list.innerHTML = "";
  if (history.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  history.forEach(item => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.innerHTML = `
      <h3>${escapeHtml(item.name)}</h3>
      <div class="history-meta">${escapeHtml(item.date)} · ${escapeHtml(item.language)}</div>
      <div class="history-preview">${escapeHtml(item.preview)}…</div>
      <div class="history-actions">
        <button class="btn btn-primary" data-open="${item.id}">OPEN</button>
        <button class="btn btn-secondary" data-delete="${item.id}">DELETE</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("[data-open]").forEach(b => {
    b.addEventListener("click", () => openHistoryItem(Number(b.dataset.open)));
  });
  list.querySelectorAll("[data-delete]").forEach(b => {
    b.addEventListener("click", () => deleteHistory(Number(b.dataset.delete)));
  });
}

function openHistoryItem(id) {
  const history = JSON.parse(localStorage.getItem("accessbd_history") || "[]");
  const item = history.find(h => h.id === id);
  if (!item) return showToast("Document not found.");
  currentDocument = {
    name: item.name,
    text: item.text,
    language: item.language,
    confidence: "—",
    isForm: false,
    demoKey: item.demoKey
  };
  showPage("scan");
  displayResult();
}

function deleteHistory(id) {
  let history = JSON.parse(localStorage.getItem("accessbd_history") || "[]");
  history = history.filter(h => h.id !== id);
  localStorage.setItem("accessbd_history", JSON.stringify(history));
  loadHistory();
}

/* ============================================================
   ACCESSIBILITY SETTINGS
   ============================================================ */
function setupAccessibilityControls() {
  document.querySelectorAll("[data-textsize]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-textsize]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setSetting("textsize", btn.dataset.textsize);
    });
  });
  document.querySelectorAll("[data-contrast]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-contrast]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setSetting("contrast", btn.dataset.contrast);
    });
  });
  document.querySelectorAll("[data-motion]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-motion]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setSetting("motion", btn.dataset.motion);
    });
  });
  document.querySelectorAll("[data-uilang]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-uilang]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setSetting("uilang", btn.dataset.uilang);
    });
  });
}

function setSetting(key, value) {
  const settings = JSON.parse(localStorage.getItem("accessbd_settings") || "{}");
  settings[key] = value;
  localStorage.setItem("accessbd_settings", JSON.stringify(settings));
  applyAccessibilitySettings();
}

function applyAccessibilitySettings() {
  const settings = JSON.parse(localStorage.getItem("accessbd_settings") || "{}");
  document.body.className = "";

  const size = settings.textsize || "medium";
  if (size !== "medium") document.body.classList.add("text-" + size);

  if (settings.contrast === "on") document.body.classList.add("high-contrast");
  if (settings.motion === "on") document.body.classList.add("reduce-motion");

  // Update button active states
  document.querySelectorAll("[data-textsize]").forEach(b => b.classList.toggle("active", b.dataset.textsize === size));
  document.querySelectorAll("[data-contrast]").forEach(b => b.classList.toggle("active", b.dataset.contrast === (settings.contrast || "off")));
  document.querySelectorAll("[data-motion]").forEach(b => b.classList.toggle("active", b.dataset.motion === (settings.motion || "off")));
  document.querySelectorAll("[data-uilang]").forEach(b => b.classList.toggle("active", b.dataset.uilang === (settings.uilang || "en")));
}

/* ============================================================
   UTILITIES
   ============================================================ */
function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}