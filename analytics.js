(function () {
  const ACTIONS = {
    saveContactButton: "save_contact",
    callButton: "call",
    whatsappButton: "whatsapp",
    emailButton: "email",
    linkedinButton: "linkedin",
    websiteButton: "website",
    cvButton: "view_cv"
  };

  let initialized = false;

  document.addEventListener("DOMContentLoaded", initializeAnalytics);

  async function initializeAnalytics() {
    try {
      const response = await fetch(`contact.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const settings = data.analytics || {};
      const measurementId = String(settings.measurementId || "").trim();

      if (settings.enabled !== true || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
        return;
      }

      loadGoogleTag(measurementId);
      bindActionTracking();
      initialized = true;
    } catch (error) {
      console.warn("Analytics could not be initialized.", error);
    }
  }

  function loadGoogleTag(measurementId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: true
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  function bindActionTracking() {
    Object.entries(ACTIONS).forEach(([id, action]) => {
      const element = document.getElementById(id);
      if (!element || element.dataset.analyticsBound === "true") return;

      element.dataset.analyticsBound = "true";
      element.addEventListener("click", () => {
        track("contact_action", {
          action,
          button_id: id
        });
      }, { capture: true });
    });
  }

  function track(eventName, params) {
    if (!initialized && typeof window.gtag !== "function") return;
    window.gtag("event", eventName, params || {});
  }

  window.ContactCardAnalytics = { track };
})();
