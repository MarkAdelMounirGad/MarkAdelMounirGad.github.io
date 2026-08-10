const PROPERTY_DEFAULT = window.ADMIN_CONFIG?.gaPropertyId || "549159908";
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
      localStorage.getItem("markGaClientId") || window.ADMIN_CONFIG?.gaClientId || "";
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
      events,
      returning,
      live
    ] = await Promise.all([
      runReport({
        dateRanges: [{ startDate, endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "engagementRate" },
          { name: "userEngagementDuration" }
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

      rankedReport(startDate, "country", "activeUsers", 10),

      runReport({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              exactFilter("eventName", "contact_save_contact"),
              exactFilter("eventName", "contact_email"),
              exactFilter("eventName", "contact_linkedin")
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
        limit: "20"
      }),

      runReport({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [{ name: "activeUsers" }]
      }),

      runRealtime({
        metrics: [{ name: "activeUsers" }]
      })
    ]);

    paintSummary(summary);
    paintTrend(trend);
    paintRanking("gaCountries", countries);
    paintContactEvents(events);
    paintReturningVisitors(returning);
    paintLive(live);

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


function exactFilter(fieldName, value) {
  return {
    filter: {
      fieldName,
      stringFilter: {
        matchType: "EXACT",
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

  if ($("gaEngagementRate")) {
    $("gaEngagementRate").textContent = percent(row[1]?.value);
  }

  if ($("gaEngagement")) {
    const totalEngagedSeconds = Number(row[2]?.value || 0);
    const activeUsers = Number(row[0]?.value || 0);
    const averageEngagedSeconds =
      activeUsers > 0 ? totalEngagedSeconds / activeUsers : 0;

    $("gaEngagement").textContent = duration(averageEngagedSeconds);
  }
}

function paintTrend(report) {
  const container = $("gaTrendChart");
  if (!container) return;

  const rows = report.rows || [];

  if (!rows.length) {
    container.className =
      "analytics-line-chart analytics-empty";
    container.textContent =
      "No visitor data for this period yet.";
    return;
  }

  const points = rows.map((row) => ({
    date: row.dimensionValues?.[0]?.value || "",
    value: Number(row.metricValues?.[0]?.value || 0)
  }));

  const maxValue = Math.max(...points.map((p) => p.value), 1);

  const width = 900;
  const height = 210;
  const padLeft = 40;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 36;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padLeft + plotWidth / 2
        : padLeft + (index / (points.length - 1)) * plotWidth;

    const y =
      padTop + plotHeight -
      (point.value / maxValue) * plotHeight;

    return {
      ...point,
      x,
      y
    };
  });

  const path = coords
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    )
    .join(" ");

  const areaPath =
    `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)}` +
    ` L ${coords[0].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`;

  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const y = padTop + (i / yTicks) * plotHeight;
    const value = Math.round(maxValue * (1 - i / yTicks));

    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}"
        class="analytics-chart-grid"/>
      <text x="${padLeft - 12}" y="${y + 4}" text-anchor="end"
        class="analytics-chart-axis">${value}</text>
    `;
  }).join("");

  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const xLabels = coords
    .map((point, index) => {
      if (
        index !== 0 &&
        index !== coords.length - 1 &&
        index % labelStep !== 0
      ) {
        return "";
      }

      return `
        <text x="${point.x}" y="${height - 10}" text-anchor="middle"
          class="analytics-chart-axis">
          ${escapeHtml(formatDate(point.date))}
        </text>
      `;
    })
    .join("");

  const dots = coords
    .map((point) => `
      <circle cx="${point.x}" cy="${point.y}" r="4"
        class="analytics-chart-dot">
        <title>${escapeHtml(formatDate(point.date))}: ${point.value} unique visitors</title>
      </circle>
    `)
    .join("");

  container.className = "analytics-line-chart";
  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Unique visitors over time">
      ${gridLines}
      <path d="${areaPath}" class="analytics-chart-area"></path>
      <path d="${path}" class="analytics-chart-line"></path>
      ${dots}
      ${xLabels}
    </svg>
  `;
}

function paintRanking(id, report) {
  const container = $(id);
  if (!container) return;

  const rows = report.rows || [];

  if (!rows.length) {
    container.className =
      "analytics-ranking analytics-empty";
    container.textContent = "No country data yet.";
    return;
  }

  const values = rows.map((row) =>
    Number(row.metricValues?.[0]?.value || 0)
  );

  const total = values.reduce((sum, value) => sum + value, 0);
  const max = Math.max(...values, 1);

  container.className = "analytics-ranking";

  container.innerHTML = rows
    .map((row, i) => {
      const rawLabel =
        row.dimensionValues?.[0]?.value || "(not set)";

      const label =
        rawLabel === "(not set)" || !rawLabel
          ? "Location unavailable"
          : rawLabel;

      const value = values[i];
      const share = total > 0 ? (value / total) * 100 : 0;

      return `
        <div class="analytics-rank-row">
          <div class="analytics-rank-topline">
            <span class="analytics-rank-label">
              ${escapeHtml(label)}
            </span>

            <strong class="analytics-rank-value">
              ${number(value)}
              <span class="analytics-rank-percent">
                (${share.toFixed(1)}%)
              </span>
            </strong>
          </div>

          <div class="analytics-meter">
            <i style="width:${Math.max(
              4,
              (value / max) * 100
            )}%"></i>
          </div>
        </div>
      `;
    })
    .join("");
}

function paintContactEvents(report) {
  const counts = {
    contact_save_contact: 0,
    contact_email: 0,
    contact_linkedin: 0
  };

  (report.rows || []).forEach((row) => {
    const name = row.dimensionValues?.[0]?.value || "";
    const count = Number(row.metricValues?.[0]?.value || 0);

    if (Object.prototype.hasOwnProperty.call(counts, name)) {
      counts[name] += count;
    }
  });

  if ($("gaSaveContact")) {
    $("gaSaveContact").textContent = number(counts.contact_save_contact);
  }

  if ($("gaEmailClicks")) {
    $("gaEmailClicks").textContent = number(counts.contact_email);
  }

  if ($("gaLinkedInClicks")) {
    $("gaLinkedInClicks").textContent = number(counts.contact_linkedin);
  }
}

function paintReturningVisitors(report) {
  let returning = 0;

  (report.rows || []).forEach((row) => {
    const label = (row.dimensionValues?.[0]?.value || "").toLowerCase();
    const count = Number(row.metricValues?.[0]?.value || 0);

    if (label === "returning") {
      returning += count;
    }
  });

  if ($("gaReturningVisitors")) {
    $("gaReturningVisitors").textContent = number(returning);
  }
}

function paintLive(live) {
  const liveCount = Number(
    live.rows?.[0]?.metricValues?.[0]?.value || 0
  );

  if ($("gaLiveUsers")) {
    $("gaLiveUsers").textContent = number(liveCount);
  }
}

function number(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat().format(
    Number.isFinite(n) ? n : 0
  );
}

function percent(value) {
  const ratio = Number(value || 0);

  if (!Number.isFinite(ratio)) {
    return "0%";
  }

  return `${(ratio * 100).toFixed(1)}%`;
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
