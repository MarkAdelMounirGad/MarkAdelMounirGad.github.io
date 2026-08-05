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

    configureLink(
      "saveContactButton",
      contact.vcard,
      display.showSaveContact
    );

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
