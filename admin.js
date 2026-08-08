const DEFAULT_PASSWORD = "mark-admin";
const PASSWORD_KEY = "markContactAdminPassword";
const DRAFT_KEY = "markContactAdminDraft";
const DISPLAY_LABELS = {
  showLocation: "Location",
  showTagline: "Tagline",
  showCall: "Call button",
  showWhatsApp: "WhatsApp button",
  showEmail: "Email button",
  showLinkedIn: "LinkedIn button",
  showWebsite: "Website button",
  showSaveContact: "Save Contact button",
  showAbout: "About section",
  showExpertise: "Expertise section",
  showCV: "CV section"
};

let publishedData = null;
let selectedPhoto = null;
let selectedPhotoUrl = "";

const loginView = document.getElementById("loginView");
const editorView = document.getElementById("editorView");
const profileForm = document.getElementById("profileForm");

initialize();

async function initialize() {
  buildDisplayToggles();
  bindEvents();
  try {
    publishedData = await fetchJson("contact.json");
  } catch (error) {
    publishedData = createBlankData();
    console.error(error);
  }
}

function bindEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("photoFile").addEventListener("change", handlePhoto);
  document.getElementById("downloadJsonButton").addEventListener("click", downloadJson);
  document.getElementById("downloadVcardButton").addEventListener("click", downloadVcard);
  document.getElementById("downloadPhotoButton").addEventListener("click", downloadPhoto);
  document.getElementById("saveDraftButton").addEventListener("click", saveDraft);
  document.getElementById("resetButton").addEventListener("click", loadPublishedData);
  document.getElementById("changePasswordButton").addEventListener("click", changePassword);
  profileForm.addEventListener("input", updatePreview);
}

function handleLogin(event) {
  event.preventDefault();
  const entered = document.getElementById("passwordInput").value;
  const current = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
  if (entered !== current) {
    setMessage("loginMessage", "Incorrect password.");
    return;
  }
  loginView.classList.add("is-hidden");
  editorView.classList.remove("is-hidden");
  const draft = readDraft();
  populateForm(draft || publishedData || createBlankData());
  setMessage("loginMessage", "");
}

function logout() {
  editorView.classList.add("is-hidden");
  loginView.classList.remove("is-hidden");
  document.getElementById("passwordInput").value = "";
}

function populateForm(data) {
  const profile = data.profile || {};
  const contact = data.contact || {};
  const display = data.display || {};
  const executive = data.executiveProfile || {};

  setValue("name", profile.name);
  setValue("title", profile.title);
  setValue("organization", profile.organization);
  setValue("location", profile.location);
  setValue("tagline", profile.tagline);
  setValue("photoPath", profile.photo || "assets/images/profile.jpeg");
  setValue("phone", contact.phone);
  setValue("whatsapp", contact.whatsapp);
  setValue("email", contact.email);
  setValue("linkedin", contact.linkedin);
  setValue("website", contact.website);
  setValue("about", executive.about);
  setValue("expertise", Array.isArray(executive.expertise) ? executive.expertise.join("\n") : "");
  setValue("cv", executive.cv);

  Object.keys(DISPLAY_LABELS).forEach(key => {
    const input = document.getElementById(key);
    if (input) input.checked = display[key] !== false;
  });

  selectedPhoto = null;
  selectedPhotoUrl = "";
  document.getElementById("photoFile").value = "";
  document.getElementById("downloadPhotoButton").disabled = true;
  showPhoto(profile.photo, profile.name);
  updatePreview();
}

function collectData() {
  const expertise = value("expertise").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  const display = {};
  Object.keys(DISPLAY_LABELS).forEach(key => { display[key] = document.getElementById(key).checked; });

  return {
    layout: publishedData?.layout || "card",
    profile: {
      name: value("name"),
      title: value("title"),
      organization: value("organization"),
      location: value("location"),
      tagline: value("tagline"),
      photo: value("photoPath") || "assets/images/profile.jpeg"
    },
    contact: {
      phone: value("phone"),
      whatsapp: normalizeWhatsApp(value("whatsapp")),
      email: value("email"),
      linkedin: value("linkedin"),
      website: value("website"),
      vcard: "Mark_Adel.vcf"
    },
    display,
    executiveProfile: {
      about: value("about"),
      expertise,
      cv: value("cv")
    }
  };
}

function updatePreview() {
  const data = collectData();
  setText("miniName", data.profile.name || "Your name");
  setText("miniTitle", data.profile.title);
  setText("miniOrganization", data.profile.organization);
  setText("miniLocation", data.profile.location);
  setText("miniTagline", data.profile.tagline);
  const initials = getInitials(data.profile.name);
  setText("photoPreviewFallback", initials);
  setText("miniFallback", initials);
}

function handlePhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  selectedPhoto = file;
  if (selectedPhotoUrl) URL.revokeObjectURL(selectedPhotoUrl);
  selectedPhotoUrl = URL.createObjectURL(file);
  showPhoto(selectedPhotoUrl, value("name"));
  document.getElementById("downloadPhotoButton").disabled = false;
  const extension = getExtension(file.name) || "jpg";
  setValue("photoPath", `assets/images/profile.${extension}`);
  updatePreview();
}

function showPhoto(source, name) {
  [
    ["photoPreview", "photoPreviewFallback"],
    ["miniPhoto", "miniFallback"]
  ].forEach(([imageId, fallbackId]) => {
    const image = document.getElementById(imageId);
    const fallback = document.getElementById(fallbackId);
    fallback.textContent = getInitials(name);
    if (!source) {
      image.style.display = "none";
      fallback.style.display = "grid";
      return;
    }
    image.onload = () => { image.style.display = "block"; fallback.style.display = "none"; };
    image.onerror = () => { image.style.display = "none"; fallback.style.display = "grid"; };
    image.src = source;
  });
}

function downloadJson() {
  const data = collectData();
  downloadBlob(new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" }), "contact.json");
  setMessage("exportMessage", "contact.json downloaded.", true);
}

function downloadVcard() {
  const data = collectData();
  const vcard = createVcard(data);
  downloadBlob(new Blob([vcard], { type: "text/vcard;charset=utf-8" }), "Mark_Adel.vcf");
  setMessage("exportMessage", "Mark_Adel.vcf downloaded.", true);
}

function downloadPhoto() {
  if (!selectedPhoto) return;
  const extension = getExtension(selectedPhoto.name) || "jpg";
  downloadBlob(selectedPhoto, `profile.${extension}`);
  setMessage("exportMessage", "Profile photo downloaded. Upload it inside assets/images/.", true);
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(collectData()));
  setMessage("exportMessage", "Draft saved on this device.", true);
}

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
}

function loadPublishedData() {
  localStorage.removeItem(DRAFT_KEY);
  populateForm(publishedData || createBlankData());
  setMessage("exportMessage", "Published information reloaded.", true);
}

function changePassword() {
  const password = value("newPassword");
  const confirmation = value("confirmPassword");
  if (password.length < 6) return setMessage("passwordMessage", "Use at least 6 characters.");
  if (password !== confirmation) return setMessage("passwordMessage", "Passwords do not match.");
  localStorage.setItem(PASSWORD_KEY, password);
  setValue("newPassword", "");
  setValue("confirmPassword", "");
  setMessage("passwordMessage", "Local password changed.", true);
}

function buildDisplayToggles() {
  const container = document.getElementById("displayToggles");
  Object.entries(DISPLAY_LABELS).forEach(([key, label]) => {
    const row = document.createElement("label");
    row.className = "toggle-item";
    row.innerHTML = `<span>${label}</span><input id="${key}" type="checkbox" checked>`;
    container.appendChild(row);
  });
}

function createVcard(data) {
  const p = data.profile || {};
  const c = data.contact || {};
  const parts = (p.name || "").trim().split(/\s+/);
  const first = parts.shift() || "";
  const last = parts.join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
    `FN:${escapeVcard(p.name)}`,
    `ORG:${escapeVcard(p.organization)}`,
    `TITLE:${escapeVcard(p.title)}`,
    c.phone ? `TEL;TYPE=CELL,VOICE:${escapeVcard(c.phone)}` : "",
    c.whatsapp ? `TEL;TYPE=CELL:${escapeVcard("+" + c.whatsapp.replace(/^\+/, ""))}` : "",
    c.email ? `EMAIL;TYPE=INTERNET:${escapeVcard(c.email)}` : "",
    c.website ? `URL:${escapeVcard(c.website)}` : "",
    c.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${escapeVcard(c.linkedin)}` : "",
    p.location ? `ADR;TYPE=WORK:;;;${escapeVcard(p.location)};;;;` : "",
    "END:VCARD"
  ].filter(Boolean);
  return lines.join("\r\n") + "\r\n";
}

function normalizeWhatsApp(number) { return (number || "").replace(/[^0-9]/g, ""); }
function escapeVcard(text) { return String(text || "").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;"); }
function getExtension(name) { return String(name || "").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, ""); }
function getInitials(name) { return (name || "MA").trim().split(/\s+/).slice(0,2).map(part => part[0]?.toUpperCase() || "").join("") || "MA"; }
function value(id) { return document.getElementById(id)?.value.trim() || ""; }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val || ""; }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val || ""; }
function setMessage(id, message, success = false) { const el = document.getElementById(id); if (!el) return; el.textContent = message; el.classList.toggle("success", success); }
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function fetchJson(path) { const response = await fetch(`${path}?v=${Date.now()}`); if (!response.ok) throw new Error(`Could not load ${path}`); return response.json(); }
function createBlankData() { return { layout:"card", profile:{}, contact:{vcard:"Mark_Adel.vcf"}, display:{}, executiveProfile:{expertise:[]} }; }
