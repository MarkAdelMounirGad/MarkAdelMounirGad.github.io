fetch("contact.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("Could not load contact.json");
    }

    return response.json();
  })
  .then(data => {
    const profile = data.profile || {};
    const contact = data.contact || {};
    const display = data.display || {};
    const executive = data.executiveProfile || {};

    document.body.classList.add(
      data.layout === "profile" ? "profile-layout" : "card-layout"
    );

    setText("profileName", profile.name);
    setText("profileTitle", profile.title);
    setText("profileOrganization", profile.organization);
    setText("profileLocation", profile.location);
    setText("profileTagline", profile.tagline);
    setText("aboutText", executive.about);

    configurePhoto(profile.photo, profile.name);

    configureSaveContact(data, display.showSaveContact);

    configureLink(
      "callButton",
      contact.phone ? `tel:${contact.phone}` : "",
      display.showCall
    );

    configureLink(
      "whatsappButton",
      contact.whatsapp ? `https://wa.me/${contact.whatsapp}` : "",
      display.showWhatsApp
    );

    configureLink(
      "emailButton",
      contact.email ? `mailto:${contact.email}` : "",
      display.showEmail
    );

    configureLink(
      "linkedinButton",
      contact.linkedin,
      display.showLinkedIn
    );

    configureLink(
      "websiteButton",
      contact.website,
      display.showWebsite
    );

    configureLink(
      "cvButton",
      executive.cv,
      display.showCV
    );

    toggleElement(
      "profileLocation",
      display.showLocation && Boolean(profile.location)
    );

    toggleElement(
      "profileTagline",
      display.showTagline && Boolean(profile.tagline)
    );

    toggleElement(
      "aboutSection",
      display.showAbout && Boolean(executive.about)
    );

    toggleElement(
      "expertiseSection",
      display.showExpertise &&
      Array.isArray(executive.expertise) &&
      executive.expertise.length > 0
    );

    toggleElement(
      "cvSection",
      display.showCV && Boolean(executive.cv)
    );

    renderExpertise(executive.expertise || []);

    document.title = profile.name || "Digital Contact Card";

    bindAnalyticsClicks();
    initializeEngagementAnalytics();
  })
  .catch(error => {
    console.error(error);

    setText("profileName", "Contact Card");
    setText("profileTitle", "Unable to load contact details");
  });

function setText(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = value || "";
}

function configureLink(id, href, shouldShow) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  const visible = Boolean(shouldShow && href);

  toggleElement(id, visible);

  if (visible) {
    element.href = href;
  }
}

function toggleElement(id, shouldShow) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.classList.toggle("is-hidden", !shouldShow);
}

function configurePhoto(photoUrl, name) {
  const image = document.getElementById("profilePhoto");
  const fallback = document.getElementById("photoFallback");

  if (!image || !fallback) {
    return;
  }

  fallback.textContent = getInitials(name);

  if (!photoUrl) {
    image.style.display = "none";
    fallback.style.display = "grid";
    return;
  }

  image.onload = () => {
    image.style.display = "block";
    fallback.style.display = "none";
  };

  image.onerror = () => {
    image.style.display = "none";
    fallback.style.display = "grid";
  };

  image.src = photoUrl;
}

function getInitials(name) {
  if (!name) {
    return "MA";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("");
}

function renderExpertise(items) {
  const container = document.getElementById("expertiseList");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  items.forEach(item => {
    const badge = document.createElement("span");

    badge.className = "expertise-item";
    badge.textContent = item;

    container.appendChild(badge);
  });
}


function configureSaveContact(data, shouldShow) {
  const button = document.getElementById("saveContactButton");
  if (!button) return;
  toggleElement("saveContactButton", Boolean(shouldShow));
  if (!shouldShow) return;

  button.removeAttribute("href");
  button.removeAttribute("download");
  button.addEventListener("click", event => {
    event.preventDefault();
    const vcard = buildVcard(data);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Mark_Adel.vcf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function buildVcard(data) {
  const profile = data.profile || {};
  const contact = data.contact || {};
  const parts = (profile.name || "").trim().split(/\s+/);
  const first = parts.shift() || "";
  const last = parts.join(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
    `FN:${escapeVcard(profile.name)}`,
    `ORG:${escapeVcard(profile.organization)}`,
    `TITLE:${escapeVcard(profile.title)}`,
    contact.phone ? `TEL;TYPE=CELL,VOICE:${escapeVcard(contact.phone)}` : "",
    contact.email ? `EMAIL;TYPE=INTERNET:${escapeVcard(contact.email)}` : "",
    contact.website ? `URL:${escapeVcard(contact.website)}` : "",
    contact.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${escapeVcard(contact.linkedin)}` : "",
    profile.location ? `ADR;TYPE=WORK:;;;${escapeVcard(profile.location)};;;;` : "",
    "END:VCARD"
  ].filter(Boolean).join("\r\n") + "\r\n";
}

function escapeVcard(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}



// ---------- Google Analytics interaction tracking ----------
const ANALYTICS_MEASUREMENT_ID = "G-Y64QEYK6LR";
const analyticsState = {
  loadedAt: Date.now(),
  maxScrollPercent: 0,
  interestLevel: "low",
  fired: new Set()
};

function analyticsAvailable() {
  return typeof window.gtag === "function";
}

function trackEvent(eventName, parameters = {}) {
  if (!analyticsAvailable()) return;

  const clean = {};
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      clean[key] = value;
    }
  });

  window.gtag("event", eventName, clean);
}

function trackOnce(key, eventName, parameters = {}) {
  if (analyticsState.fired.has(key)) return;
  analyticsState.fired.add(key);
  trackEvent(eventName, parameters);
}

function trackContactAction(actionName) {
  trackEvent("contact_action", {
    action_name: actionName,
    page_type: "digital_contact_card"
  });

  // High-intent actions contribute to a professional-interest signal.
  if (["save_contact", "call", "whatsapp", "email"].includes(actionName)) {
    setInterestLevel("high", actionName);
  } else if (["linkedin", "website", "cv"].includes(actionName)) {
    setInterestLevel("medium", actionName);
  }
}

function setInterestLevel(level, trigger) {
  const rank = { low: 1, medium: 2, high: 3 };
  if (rank[level] <= rank[analyticsState.interestLevel]) return;

  analyticsState.interestLevel = level;
  trackEvent("professional_interest", {
    interest_level: level,
    trigger: trigger || "engagement"
  });
}

function bindAnalyticsClicks() {
  const actions = {
    saveContactButton: "save_contact",
    callButton: "call",
    whatsappButton: "whatsapp",
    emailButton: "email",
    linkedinButton: "linkedin",
    websiteButton: "website",
    cvButton: "cv"
  };

  Object.entries(actions).forEach(([id, actionName]) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener("click", () => {
      trackContactAction(actionName);
    });
  });
}

function initializeEngagementAnalytics() {
  // Returning visitor is kept only on the visitor's own browser.
  try {
    const visitKey = "markCardVisitedBefore";
    if (localStorage.getItem(visitKey)) {
      trackOnce("return_visitor", "return_visitor", {
        visitor_type: "returning"
      });
      setInterestLevel("medium", "return_visit");
    } else {
      localStorage.setItem(visitKey, new Date().toISOString());
    }
  } catch (_) {}

  // Time-based engagement signals.
  setTimeout(() => {
    trackOnce("30_seconds", "engagement_milestone", {
      milestone: "30_seconds"
    });
    setInterestLevel("medium", "30_seconds");
  }, 30000);

  setTimeout(() => {
    trackOnce("60_seconds", "engagement_milestone", {
      milestone: "60_seconds"
    });
  }, 60000);

  setTimeout(() => {
    trackOnce("120_seconds", "engagement_milestone", {
      milestone: "120_seconds"
    });
    setInterestLevel("high", "120_seconds");
  }, 120000);

  window.addEventListener("scroll", () => {
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const viewportBottom = window.scrollY + window.innerHeight;
    const percent = documentHeight > 0
      ? Math.min(100, Math.round((viewportBottom / documentHeight) * 100))
      : 0;

    analyticsState.maxScrollPercent = Math.max(
      analyticsState.maxScrollPercent,
      percent
    );

    if (analyticsState.maxScrollPercent >= 50) {
      trackOnce("scroll_50", "engagement_milestone", {
        milestone: "scroll_50"
      });
      setInterestLevel("medium", "scroll_50");
    }

    if (analyticsState.maxScrollPercent >= 90) {
      trackOnce("scroll_90", "engagement_milestone", {
        milestone: "scroll_90"
      });
      setInterestLevel("high", "scroll_90");
    }
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;

    const seconds = Math.round((Date.now() - analyticsState.loadedAt) / 1000);
    trackEvent("session_summary", {
      engagement_seconds: seconds,
      max_scroll_percent: analyticsState.maxScrollPercent,
      interest_level: analyticsState.interestLevel
    });
  });
}
