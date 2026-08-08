const PROPERTY_DEFAULT = "549159908";
const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const API_BASE = "https://analyticsdata.googleapis.com/v1beta/properties/";

let accessToken = "";
let tokenClient = null;
let selectedDays = 30;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  const editorGrid = document.querySelector(".admin-grid");
  const analyticsView = document.getElementById("analyticsView");
  const showEditorButton = document.getElementById("showEditorButton");
  const showAnalyticsButton = document.getElementById("showAnalyticsButton");

  showEditorButton?.addEventListener("click", () => {
    editorGrid?.classList.remove("is-hidden");
    analyticsView?.classList.add("is-hidden");
    showEditorButton.classList.add("active-admin-view");
    showAnalyticsButton?.classList.remove("active-admin-view");
  });

  showAnalyticsButton?.addEventListener("click", () => {
    editorGrid?.classList.add("is-hidden");
    analyticsView?.classList.remove("is-hidden");
    showAnalyticsButton.classList.add("active-admin-view");
    showEditorButton?.classList.remove("active-admin-view");
  });

  if ($("gaPropertyId")) {
    $("gaPropertyId").value =
      localStorage.getItem("markGaPropertyId") || PROPERTY_DEFAULT;
  }

  if ($("gaClientId")) {
    $("gaClientId").value =
      localStorage.getItem("markGaClientId") || "";
  }

  $("gaConnectButton")?.addEventListener("click", connectGoogle);
  $("gaRefreshButton")?.addEventListener("click", loadDashboard);

  document.querySelectorAll(".analytics-range").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".analytics-range")
        .forEach((b) => b.classList.remove("active"));

      button.classList.add("active");
      selectedDays = Number(button.dataset.days || 30);

      if (accessToken) {
        loadDashboard();
      }
    });
  });
});

function connectGoogle() {
  clearError();

  const clientId = $("gaClientId")?.value.trim() || "";
  const propertyId = $("gaPropertyId")?.value.trim() || "";

  if (!clientId) {
    showError("Paste your Google OAuth Client ID first.");
    return;
  }

  if (!/^\d+$/.test(propertyId)) {
    showError("The GA4 Property ID should contain numbers only.");
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    showError(
      "Google Identity Services has not loaded yet. Wait a few seconds and try again."
    );
    return;
  }

  localStorage.setItem("markGaClientId", clientId);
  localStorage.setItem("markGaPropertyId", propertyId);

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GA_SCOPE,

    callback: async (response) => {
      if (response.error) {
        showError(`Google authorization failed: ${response.error}`);
        return;
      }

      accessToken = response.access_token;

      if ($("gaConnectionStatus")) {
        $("gaConnectionStatus").textContent = "Connected";
        $("gaConnectionStatus").classList.add("connected");
      }

      $("analyticsDashboard")?.classList.remove("analytics-disabled");

      await loadDashboard();
    },

    error_callback: (err) => {
      showError(
        `Google sign-in could not complete: ${
          err?.type || "unknown error"
        }`
      );
    }
  });

  tokenClient.requestAccessToken({ prompt: "" });
}

async function loadDashboard() {
  if (!accessToken) {
    showError("Connect Google Analytics first.");
    return;
  }

  clearError();

  const dashboard = $("analyticsDashboard");
  dashboard?.setAttribute("aria-busy", "true");
  dashboard?.classList.add("loading");

  try {
    const startDate =
      selectedDays === 1
        ? "today"
        : `${selectedDays - 1}daysAgo`;

    const [
      summary,
      trend,
      countries,
      devices,
      browsers,
      events,
      live,
      liveCountries
    ] = await Promise.all([
      runReport({
        dateRanges: [{ startDate, endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" }
        ]
      }),

      runReport({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [
          {
            dimension: {
              dimensionName: "date"
            }
          }
        ]
      }),

      rankedReport(startDate, "country", "activeUsers", 8),

      rankedReport(startDate, "deviceCategory", "activeUsers", 8),

      rankedReport(startDate, "browser", "activeUsers", 8),

      runReport({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              startsWithFilter("eventName", "contact_"),
              startsWithFilter("eventName", "interest_")
            ]
          }
        },
        orderBys: [
          {
            metric: {
              metricName: "eventCount"
            },
            desc: true
          }
        ],
        limit: "50"
      }),

      runRealtime({
        metrics: [{ name: "activeUsers" }]
      }),

      runRealtime({
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [
          {
            metric: {
              metricName: "activeUsers"
            },
            desc: true
          }
        ],
        limit: "8"
      })
    ]);

    paintSummary(summary);
    paintTrend(trend);
    paintRanking("gaCountries", countries);
    paintRanking("gaDevices", devices);
    paintRanking("gaBrowsers", browsers);
    paintEvents(events);
    paintLive(live, liveCountries);

    if ($("gaLastUpdated")) {
      $("gaLastUpdated").textContent =
        `Updated ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}`;
    }
  } catch (error) {
    console.error("Analytics dashboard error:", error);

    if (error.status === 401) {
      accessToken = "";

      if ($("gaConnectionStatus")) {
        $("gaConnectionStatus").textContent = "Session expired";
        $("gaConnectionStatus").classList.remove("connected");
      }

      showError(
        "Your Google access session expired. Click Connect Google Analytics again."
      );
    } else {
      showError(error.message || String(error));
    }
  } finally {
    dashboard?.setAttribute("aria-busy", "false");
    dashboard?.classList.remove("loading");
  }
}

async function rankedReport(startDate, dimension, metric, limit) {
  return runReport({
    dateRanges: [{ startDate, endDate: "today" }],
    dimensions: [{ name: dimension }],
    metrics: [{ name: metric }],
    orderBys: [
      {
        metric: {
          metricName: metric
        },
        desc: true
      }
    ],
    limit: String(limit)
  });
}

function startsWithFilter(fieldName, value) {
  return {
    filter: {
      fieldName,
      stringFilter: {
        matchType: "BEGINS_WITH",
        value,
        caseSensitive: false
      }
    }
  };
}

async function runReport(body) {
  return gaFetch("runReport", body);
}

async function runRealtime(body) {
  return gaFetch("runRealtimeReport", body);
}

async function gaFetch(method, body) {
  const propertyId = $("gaPropertyId")?.value.trim() || PROPERTY_DEFAULT;

  const response = await fetch(
    `${API_BASE}${encodeURIComponent(propertyId)}:${method}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    let detail = "";

    try {
      const payload = await response.json();
      detail =
        payload?.error?.message ||
        JSON.stringify(payload, null, 2);
    } catch (_) {
      detail = await response.text();
    }

    const error = new Error(
      `${response.status} ${response.statusText}\n${detail}`
    );

    error.status = response.status;
    throw error;
  }

  return response.json();
}

function paintSummary(report) {
  const row = report.rows?.[0]?.metricValues || [];

  if ($("gaActiveUsers")) {
    $("gaActiveUsers").textContent = number(row[0]?.value);
  }

  if ($("gaSessions")) {
    $("gaSessions").textContent = number(row[1]?.value);
  }

  if ($("gaViews")) {
    $("gaViews").textContent = number(row[2]?.value);
  }

  if ($("gaEngagement")) {
    $("gaEngagement").textContent = duration(row[3]?.value);
  }
}

function paintTrend(report) {
  const container = $("gaTrendChart");
  if (!container) return;

  const rows = report.rows || [];

  if (!rows.length) {
    container.className =
      "analytics-bar-chart analytics-empty";
    container.textContent =
      "No data for this period yet.";
    return;
  }

  const points = rows.map((row) => ({
    date: row.dimensionValues?.[0]?.value || "",
    value: Number(row.metricValues?.[0]?.value || 0)
  }));

  const max = Math.max(
    ...points.map((p) => p.value),
    1
  );

  container.className = "analytics-bar-chart";

  container.innerHTML = points
    .map((point) => {
      const h = Math.max(
        2,
        Math.round((point.value / max) * 180)
      );

      const label = formatDate(point.date);

      return `
        <div class="analytics-bar-column">
          <div
            class="analytics-bar"
            style="height:${h}px"
            data-tip="${escapeHtml(label)} · ${point.value} users">
          </div>
          <span class="analytics-bar-label">
            ${escapeHtml(label)}
          </span>
        </div>
      `;
    })
    .join("");
}

function paintRanking(id, report) {
  const container = $(id);
  if (!container) return;

  const rows = report.rows || [];

  if (!rows.length) {
    container.className =
      "analytics-ranking analytics-empty";
    container.textContent = "No data yet.";
    return;
  }

  const values = rows.map((row) =>
    Number(row.metricValues?.[0]?.value || 0)
  );

  const max = Math.max(...values, 1);

  container.className = "analytics-ranking";

  container.innerHTML = rows
    .map((row, i) => {
      const label =
        row.dimensionValues?.[0]?.value || "(not set)";

      const value = values[i];

      return `
        <div class="analytics-rank-row">
          <span class="analytics-rank-label">
            ${escapeHtml(label)}
          </span>

          <strong class="analytics-rank-value">
            ${number(value)}
          </strong>

          <div class="analytics-meter">
            <i style="width:${Math.max(
              3,
              (value / max) * 100
            )}%"></i>
          </div>
        </div>
      `;
    })
    .join("");
}

function paintEvents(report) {
  const actionNames = {
    contact_save_contact: "Save Contact",
    contact_call: "Call",
    contact_whatsapp: "WhatsApp",
    contact_email: "Email",
    contact_linkedin: "LinkedIn",
    contact_website: "Website",
    contact_cv: "CV"
  };

  const actions = [];

  const interests = {
    low: 0,
    medium: 0,
    high: 0
  };

  (report.rows || []).forEach((row) => {
    const name =
      row.dimensionValues?.[0]?.value || "";

    const count =
      Number(row.metricValues?.[0]?.value || 0);

    if (
      name.startsWith("contact_") &&
      actionNames[name]
    ) {
      actions.push({
        name,
        label: actionNames[name],
        count
      });
    }

    if (name === "interest_low") {
      interests.low += count;
    }

    if (name === "interest_medium") {
      interests.medium += count;
    }

    if (name === "interest_high") {
      interests.high += count;
    }
  });

  const totalActions = actions.reduce(
    (sum, item) => sum + item.count,
    0
  );

  if ($("gaContactActions")) {
    $("gaContactActions").textContent =
      number(totalActions);
  }

  const actionsContainer = $("gaActions");

  if (actionsContainer) {
    if (!actions.length) {
      actionsContainer.className =
        "analytics-action-list analytics-empty";

      actionsContainer.textContent =
        "No tracked contact actions yet.";
    } else {
      actions.sort((a, b) => b.count - a.count);

      actionsContainer.className =
        "analytics-action-list";

      actionsContainer.innerHTML = actions
        .map(
          (item) => `
            <div class="analytics-action-row">
              <span class="analytics-action-label">
                ${escapeHtml(item.label)}
              </span>
              <strong class="analytics-action-value">
                ${number(item.count)}
              </strong>
            </div>
          `
        )
        .join("");
    }
  }

  const interestTotal =
    interests.low +
    interests.medium +
    interests.high;

  let level = "No signal yet";

  if (interestTotal) {
    const weighted =
      (
        interests.low +
        interests.medium * 2 +
        interests.high * 3
      ) /
      interestTotal;

    level =
      weighted >= 2.35
        ? "High"
        : weighted >= 1.55
          ? "Medium"
          : "Low";
  }

  if ($("gaInterestLevel")) {
    $("gaInterestLevel").textContent = level;
  }

  const interestRows = [
    ["High", interests.high],
    ["Medium", interests.medium],
    ["Low", interests.low]
  ].filter(([, count]) => count > 0);

  const container = $("gaInterestBreakdown");

  if (!container) return;

  if (!interestRows.length) {
    container.className =
      "analytics-ranking analytics-empty";

    container.textContent =
      "No interest events collected yet.";

    return;
  }

  const max = Math.max(
    ...interestRows.map(([, count]) => count),
    1
  );

  container.className = "analytics-ranking";

  container.innerHTML = interestRows
    .map(
      ([label, count]) => `
        <div class="analytics-rank-row">
          <span class="analytics-rank-label">
            ${escapeHtml(label)}
          </span>

          <strong class="analytics-rank-value">
            ${number(count)}
          </strong>

          <div class="analytics-meter">
            <i style="width:${Math.max(
              3,
              (count / max) * 100
            )}%"></i>
          </div>
        </div>
      `
    )
    .join("");
}

function paintLive(live, countries) {
  const liveCount = Number(
    live.rows?.[0]?.metricValues?.[0]?.value || 0
  );

  if ($("gaLiveUsers")) {
    $("gaLiveUsers").textContent =
      number(liveCount);
  }

  paintRanking(
    "gaLiveCountries",
    countries
  );
}

function number(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat().format(
    Number.isFinite(n) ? n : 0
  );
}

function duration(value) {
  const seconds = Number(value || 0);

  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0s";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);

  return `${minutes}m ${rest}s`;
}

function formatDate(raw) {
  if (!/^\d{8}$/.test(raw)) {
    return raw;
  }

  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);

  return new Date(
    `${y}-${m}-${d}T00:00:00`
  ).toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
  );
}

function showError(message) {
  const panel = $("gaErrorPanel");

  if (!panel) {
    console.error(message);
    return;
  }

  panel.textContent = message;
  panel.classList.remove("is-hidden");
}

function clearError() {
  const panel = $("gaErrorPanel");

  if (!panel) return;

  panel.classList.add("is-hidden");
  panel.textContent = "";
}
