/* ==========================================================================
   SatQuery AI — Frontend Application Logic
   SIH26167 | ISRO
   ==========================================================================
   Manages:
     - Leaflet map initialization and satellite-style tile layer
     - Fetching preset scenarios and rendering quick-action buttons
     - Submitting natural-language queries to the FastAPI backend
     - Rendering / animating organic GeoJSON segmentation polygons on the map
     - Live metrics, sensor attribution, GeoJSON export, and query history log
   ========================================================================== */

(() => {
  "use strict";

  // Resolve API Base intelligently:
  // - If served from FastAPI (port 8000) or Vercel (https://...), use same origin.
  // - If opened via file:// or another static port (5500, 3000, 5173), target local port 8000.
  let API_BASE = window.location.origin;
  if (
    !API_BASE ||
    API_BASE === "null" ||
    window.location.protocol === "file:" ||
    ["5500", "3000", "5173", "8080"].includes(window.location.port)
  ) {
    API_BASE = "http://127.0.0.1:8000";
  }

  const ENDPOINTS = {
    get scenarios() { return `${API_BASE}/api/v1/scenarios`; },
    get query()     { return `${API_BASE}/api/v1/query`; },
    get health()    { return `${API_BASE}/api/v1/health`; },
  };

  const SCENARIO_COLORS = {
    flood: "#ff1744",
    urban: "#ff9100",
    water: "#00e676",
    fire: "#e040fb",
    agriculture: "#ffd600",
    unknown: "#00b0ff",
  };

  const INDIA_CENTER = [22.9734, 78.6569];
  const INDIA_ZOOM = 5;

  let lastQueryResult = null;
  let activeGeoJsonLayer = null;

  // Temporal playback state
  let temporalSnapshots = null;
  let temporalCurrentStep = 0;
  let temporalInterval = null;
  let temporalPlaying = false;

  // ------------------------------------------------------------------
  // DOM references
  // ------------------------------------------------------------------
  const el = {
    statusDot: document.getElementById("statusDot"),
    statusText: document.getElementById("statusText"), // may be null if removed from HTML
    queryForm: document.getElementById("queryForm"),
    queryInput: document.getElementById("queryInput"),
    submitBtn: document.getElementById("submitBtn"),
    quickChips: document.getElementById("quickChips"),
    exportGeoJsonBtn: document.getElementById("exportGeoJsonBtn"),
    copyJsonBtn: document.getElementById("copyJsonBtn"),
    resetMapBtn: document.getElementById("resetMapBtn"),
    presetButtons: document.getElementById("presetButtons"),
    metricLabel: document.getElementById("metricLabel"),
    metricConfidence: document.getElementById("metricConfidence"),
    confidenceBarFill: document.getElementById("confidenceBarFill"),
    metricArea: document.getElementById("metricArea"),
    metricSensor: document.getElementById("metricSensor"),
    metricMode: document.getElementById("metricMode"),
    metricLatency: document.getElementById("metricLatency"),
    metricStatus: document.getElementById("metricStatus"),
    historyLog: document.getElementById("historyLog"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    themeIcon: document.getElementById("themeIcon"),
    toast: document.getElementById("toast"),
  };

  // ------------------------------------------------------------------
  // Map setup
  // ------------------------------------------------------------------
  const map = L.map("map", {
    zoomControl: false,
    attributionControl: true,
  }).setView(INDIA_CENTER, INDIA_ZOOM);

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.scale({ position: "bottomleft", imperial: false, maxWidth: 120 }).addTo(map);

  // Satellite tile layer (Esri World Imagery)
  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, ISRO/NRSC",
      maxZoom: 19,
    }
  );
  satelliteLayer.addTo(map);

  // Reference label overlay (CARTO Voyager labels)
  const referenceLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
      opacity: 0.85,
    }
  );
  referenceLayer.addTo(map);

  // ------------------------------------------------------------------
  // Utility: status indicator
  // ------------------------------------------------------------------
  function setStatus(state, text) {
    el.statusDot.className = `status-dot ${state}`;
    if (el.statusText) el.statusText.textContent = text;
  }

  // ------------------------------------------------------------------
  // Theme Management (Light / Dark Mode)
  // ------------------------------------------------------------------
  function getPreferredTheme() {
    try {
      const stored = localStorage.getItem("satquery_theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {}
    return "dark"; // Default to aerospace dark mode
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (el.themeIcon) {
      el.themeIcon.textContent = theme === "light" ? "🌙" : "☀️";
    }
    if (el.themeToggleBtn) {
      el.themeToggleBtn.setAttribute(
        "title",
        theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"
      );
    }
    try {
      localStorage.setItem("satquery_theme", theme);
    } catch (e) {}
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    showToast(`Switched to ${next === "light" ? "Light" : "Dark"} Mode`);
  }

  // ------------------------------------------------------------------
  // Fetch and render preset scenario buttons
  // ------------------------------------------------------------------
  async function loadPresets() {
    try {
      let res;
      try {
        res = await fetch(ENDPOINTS.scenarios);
      } catch (localErr) {
        if (API_BASE !== "https://satquery-ai-sage.vercel.app") {
          API_BASE = "https://satquery-ai-sage.vercel.app";
          res = await fetch(ENDPOINTS.scenarios);
        } else {
          throw localErr;
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderPresetButtons(data.scenarios || []);
      setStatus("online", "Inference engine online");
    } catch (err) {
      console.error("Failed to load presets:", err);
      setStatus("error", "Backend unreachable — check server");
      el.presetButtons.innerHTML =
        '<p class="history-empty">Could not load presets. Is the backend running?</p>';
    }
  }

  function renderPresetButtons(scenarios) {
    el.presetButtons.innerHTML = "";
    scenarios.forEach((scenario) => {
      const btn = document.createElement("button");
      btn.className = "preset-btn";
      btn.dataset.scenarioId = scenario.id;
      btn.innerHTML = `
        <span class="dot" style="background:${scenario.color}"></span>
        <div class="preset-btn-info">
          <span class="preset-name">${scenario.name}</span>
          <span class="preset-desc">${scenario.region || ""}</span>
        </div>
      `;
      btn.addEventListener("click", () => {
        setActivePresetButton(scenario.id);
        el.queryInput.value = scenario.sample_query;
        runQuery({ query: scenario.sample_query, scenario_id: scenario.id });
      });
      el.presetButtons.appendChild(btn);
    });
  }

  function setActivePresetButton(scenarioId) {
    document.querySelectorAll(".preset-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.scenarioId === scenarioId);
    });
  }

  // ------------------------------------------------------------------
  // Core: submit a query to the backend and render the response
  // ------------------------------------------------------------------
  async function runQuery({ query, scenario_id = null }) {
    if (!query || !query.trim()) {
      showToast("Please enter a query before running analysis.", true);
      return;
    }

    setBusy(true);
    setStatus("busy", "Running spatial segmentation…");
    el.metricStatus.textContent = "Segmenting…";

    try {
      let res;
      try {
        res = await fetch(ENDPOINTS.query, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            scenario_id: scenario_id,
          }),
        });
      } catch (netErr) {
        if (API_BASE !== "https://satquery-ai-sage.vercel.app") {
          res = await fetch(`https://satquery-ai-sage.vercel.app/api/v1/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: query.trim(),
              scenario_id: scenario_id,
            }),
          });
        } else {
          throw netErr;
        }
      }

      if (!res || !res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      lastQueryResult = data;
      handleQueryResponse(query, data);

      // Only show temporal bar if a valid recognized scenario is detected with features
      const scenarioKey = (data.scenario_id || "").toLowerCase();
      if (
        TEMPORAL_SCENARIOS[scenarioKey] &&
        data.matched_label !== "unknown" &&
        data.geojson?.features?.length > 0
      ) {
        fetchAndSetupTemporal(data.scenario_id, data.geojson);
      } else {
        hideTemporalBar();
      }

      setStatus("online", "Inference engine online");
    } catch (err) {
      console.error("Query failed:", err);
      showToast(`Query failed: ${err.message}`, true);
      setStatus("error", "Last query failed");
      el.metricStatus.textContent = "Error";
      hideTemporalBar();
    } finally {
      setBusy(false);
    }
  }

  function setBusy(isBusy) {
    el.submitBtn.disabled = isBusy;
    el.submitBtn.querySelector("span").textContent = isBusy
      ? "Analyzing Imagery…"
      : "Run Analysis";
  }

  // ------------------------------------------------------------------
  // Handle a successful query response: render map + metrics + history
  // ------------------------------------------------------------------
  function handleQueryResponse(originalQuery, data) {
    renderGeoJsonLayer(data.geojson, data.scenario_id);
    updateMetricsPanel(data);
    generateAnalysisReport(data);
    addHistoryEntry(originalQuery, data);
    showToast(
      `Detected "${data.matched_label}" (${Math.round(
        data.query_confidence * 100
      )}% confidence) in ${data.processing_time_ms}ms`
    );
  }

  // ------------------------------------------------------------------
  // Auto Analysis Report
  // ------------------------------------------------------------------
  function generateAnalysisReport(data) {
    const features = data.geojson.features || [];
    if (!features.length) return;

    const totalArea = features
      .reduce((s, f) => s + (f.properties.area_sqkm || 0), 0)
      .toFixed(1);
    const p = features[0].properties || {};
    const count = features.length;
    const label = escapeHtml(capitalize(data.matched_label));
    const sensor = escapeHtml(p.sensor || "Multi-Sensor EO");
    const resolution = escapeHtml(p.resolution || "—");
    const severity = escapeHtml(p.severity || "Moderate");
    const action = escapeHtml(p.action || "Standby for field assessment.");
    const region = escapeHtml(data.geojson.metadata?.region || "the monitored zone");
    const confidence = Math.round(data.query_confidence * 100);
    const datasetSource = data.geojson.metadata?.dataset_source || p.dataset || "";
    const methodology = data.geojson.metadata?.methodology || p.methodology || "";

    const severityColor =
      p.severity === "Critical" ? "r-red"
      : p.severity === "High"   ? "r-amb"
      : "r-grn";

    const reportEl = document.getElementById("reportText");
    reportEl.innerHTML = `
      <span class="r-hi">${count} ${label} zone${count !== 1 ? "s" : ""}</span>
      detected across <span class="r-hi">${totalArea} km²</span> of ${region}.
      ${sensor} imagery at <span class="r-hi">${resolution}</span> confirms
      active ${label.toLowerCase()} signature with
      <span class="r-hi">${confidence}%</span> query confidence.
      Severity assessment: <span class="${severityColor}">${severity}</span>.
      <div class="report-action">↳ ${action}</div>
      ${datasetSource ? `<div class="report-provenance"><strong>Source:</strong> ${escapeHtml(datasetSource)}</div>` : ""}
      ${methodology ? `<div class="report-method"><strong>Algorithm:</strong> ${escapeHtml(methodology)}</div>` : ""}
    `;
  }

  function renderGeoJsonLayer(geojson, scenarioId) {
    if (activeGeoJsonLayer) {
      map.removeLayer(activeGeoJsonLayer);
      activeGeoJsonLayer = null;
    }

    const baseColor = SCENARIO_COLORS[scenarioId] || SCENARIO_COLORS.unknown;

    activeGeoJsonLayer = L.geoJSON(geojson, {
      style: (feature) => ({
        color: feature.properties.color || baseColor,
        weight: 2.5,
        fillColor: feature.properties.color || baseColor,
        fillOpacity: 0.32,
        className: "geojson-layer-enter",
      }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const confidencePct = p.confidence
          ? Math.round(p.confidence * 100)
          : "—";

        const popupHtml = `
          <div class="popup-container">
            <div class="popup-header" style="border-left: 3px solid ${p.color || baseColor};">
              <span class="popup-title">${escapeHtml(p.label || "Segmented Region")}</span>
              ${p.severity ? `<span class="popup-badge">${escapeHtml(p.severity)}</span>` : ""}
            </div>
            <div class="popup-body">
              <div class="popup-row"><strong>Confidence:</strong> ${confidencePct}%</div>
              <div class="popup-row"><strong>Area:</strong> ${p.area_sqkm ?? "—"} km²</div>
              ${p.sensor ? `<div class="popup-row"><strong>Sensor:</strong> ${escapeHtml(p.sensor)}</div>` : ""}
              ${p.resolution ? `<div class="popup-row"><strong>GSD:</strong> ${escapeHtml(p.resolution)}</div>` : ""}
              ${p.description ? `<div class="popup-desc">${escapeHtml(p.description)}</div>` : ""}
              ${p.action ? `<div class="popup-action"><strong>Action:</strong> ${escapeHtml(p.action)}</div>` : ""}
            </div>
          </div>
        `;

        layer.bindPopup(popupHtml, { maxWidth: 300 });

        layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.55, weight: 3.5 }));
        layer.on("mouseout", () => layer.setStyle({ fillOpacity: 0.32, weight: 2.5 }));
      },
    }).addTo(map);

    // Smooth camera fly-to
    const layerBounds = activeGeoJsonLayer.getBounds();
    if (layerBounds.isValid()) {
      map.flyToBounds(layerBounds, { padding: [60, 60], duration: 1.2 });
    } else if (geojson.metadata && geojson.metadata.center) {
      map.flyTo(
        [geojson.metadata.center[0], geojson.metadata.center[1]],
        geojson.metadata.zoom || 8,
        { duration: 1.2 }
      );
    }
  }

  // ------------------------------------------------------------------
  // Metrics panel
  // ------------------------------------------------------------------
  function updateMetricsPanel(data) {
    const features = data.geojson.features || [];
    const totalArea = features.reduce(
      (sum, f) => sum + (f.properties.area_sqkm || 0),
      0
    );

    const firstFeature = features[0]?.properties || {};
    const sensorText = firstFeature.sensor || data.geojson.metadata?.sensor || "Multi-Sensor EO";

    el.metricLabel.textContent = capitalize(data.matched_label);
    el.metricConfidence.textContent = `${Math.round(data.query_confidence * 100)}%`;

    // Animate confidence bar: reset to 0 first, then set target on next frame
    el.confidenceBarFill.style.transition = "none";
    el.confidenceBarFill.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.confidenceBarFill.style.transition = "width 0.8s cubic-bezier(0.4,0,0.2,1)";
      el.confidenceBarFill.style.width = `${Math.round(data.query_confidence * 100)}%`;
    }));

    el.metricArea.textContent = `${totalArea.toFixed(1)} km²`;
    el.metricSensor.textContent = sensorText;
    const rawMode = (data.mode || "").toLowerCase();
    el.metricMode.textContent = rawMode === "real" ? "NEURAL VLM" : "CALIBRATED";
    el.metricLatency.textContent = `${data.processing_time_ms} ms`;
    el.metricStatus.textContent = `${features.length} vector polygon(s) active`;
  }

  function capitalize(str) {
    if (!str) return "—";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ------------------------------------------------------------------
  // Query history log
  // ------------------------------------------------------------------
  function addHistoryEntry(query, data) {
    const emptyPlaceholder = el.historyLog.querySelector(".history-empty");
    if (emptyPlaceholder) emptyPlaceholder.remove();

    const item = document.createElement("li");
    item.className = "history-item";
    item.style.borderLeftColor =
      SCENARIO_COLORS[data.scenario_id] || SCENARIO_COLORS.unknown;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    item.innerHTML = `
      <span class="h-query">${escapeHtml(query)}</span>
      <span class="h-meta">${time} &middot; ${capitalize(
      data.matched_label
    )} &middot; ${Math.round(data.query_confidence * 100)}% &middot; ${
      data.mode.toUpperCase()
    }</span>
    `;
    item.addEventListener("click", () => {
      el.queryInput.value = query;
      runQuery({ query: query, scenario_id: data.scenario_id });
    });
    el.historyLog.insertBefore(item, el.historyLog.firstChild);

    // Persist to localStorage (keep last 10)
    try {
      const stored = JSON.parse(localStorage.getItem("satquery_history") || "[]");
      stored.unshift({ query, scenario_id: data.scenario_id, matched_label: data.matched_label, confidence: data.query_confidence, mode: data.mode, time });
      localStorage.setItem("satquery_history", JSON.stringify(stored.slice(0, 10)));
    } catch (e) { /* localStorage unavailable */ }
  }

  function loadHistoryFromStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem("satquery_history") || "[]");
      if (!stored.length) return;
      const emptyPlaceholder = el.historyLog.querySelector(".history-empty");
      if (emptyPlaceholder) emptyPlaceholder.remove();
      stored.forEach(entry => {
        const item = document.createElement("li");
        item.className = "history-item";
        item.style.borderLeftColor = SCENARIO_COLORS[entry.scenario_id] || SCENARIO_COLORS.unknown;
        item.innerHTML = `
          <span class="h-query">${escapeHtml(entry.query)}</span>
          <span class="h-meta">${entry.time} &middot; ${capitalize(entry.matched_label)} &middot; ${Math.round(entry.confidence * 100)}% &middot; ${entry.mode.toUpperCase()}</span>
        `;
        item.addEventListener("click", () => {
          el.queryInput.value = entry.query;
          runQuery({ query: entry.query, scenario_id: entry.scenario_id });
        });
        el.historyLog.appendChild(item);
      });
    } catch (e) { /* localStorage unavailable */ }
  }

  function clearQueryHistory() {
    try {
      localStorage.removeItem("satquery_history");
    } catch (e) {}
    el.historyLog.innerHTML = '<li class="history-empty">No queries submitted yet.</li>';
    showToast("Query history cleared.");
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ------------------------------------------------------------------
  // Export GeoJSON
  // ------------------------------------------------------------------
  function exportCurrentGeoJSON() {
    if (!lastQueryResult || !lastQueryResult.geojson) {
      showToast("No active analysis result to export. Run a query first!", true);
      return;
    }

    const payload = JSON.stringify(lastQueryResult.geojson, null, 2);
    const blob = new Blob([payload], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satquery_${lastQueryResult.scenario_id}_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("GeoJSON payload exported successfully!");
  }

  // ------------------------------------------------------------------
  // Copy raw JSON response to clipboard
  // ------------------------------------------------------------------
  async function copyCurrentJSON() {
    if (!lastQueryResult) {
      showToast("No result to copy. Run a query first!", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(lastQueryResult, null, 2)
      );
      if (el.copyJsonBtn) el.copyJsonBtn.querySelector("span").textContent = "✓ Copied!";
      setTimeout(() => {
        if (el.copyJsonBtn) el.copyJsonBtn.querySelector("span").textContent = "⎘ Copy JSON";
      }, 2000);
    } catch {
      showToast("Clipboard access denied by browser.", true);
    }
  }

  // ------------------------------------------------------------------
  // Reset Map View
  // ------------------------------------------------------------------
  function resetMapView() {
    if (activeGeoJsonLayer) {
      map.removeLayer(activeGeoJsonLayer);
      activeGeoJsonLayer = null;
    }
    map.flyTo(INDIA_CENTER, INDIA_ZOOM, { duration: 1.2 });
    setActivePresetButton(null);
    el.metricLabel.textContent = "—";
    el.metricConfidence.textContent = "—";
    el.confidenceBarFill.style.width = "0%";
    el.metricArea.textContent = "—";
    el.metricSensor.textContent = "—";
    el.metricMode.textContent = "—";
    el.metricLatency.textContent = "—";
    el.metricStatus.textContent = "IDLE";
    lastQueryResult = null;
    hideTemporalBar();
    showToast("Map view reset to Pan-India coverage.");
  }

  // ------------------------------------------------------------------
  // Temporal Scenarios Metadata & Client-side Snapshot Generator
  // ------------------------------------------------------------------
  const TEMPORAL_SCENARIOS = {
    flood: {
      steps: [
        { tag: "Detection", label: "Initial Breach Detected", date: "Aug 12, 2025" },
        { tag: "Spread",    label: "Inundation Spreading",     date: "Aug 16, 2025" },
        { tag: "Peak",      label: "Peak Flood Extent",        date: "Aug 20, 2025" }
      ]
    },
    urban: {
      steps: [
        { tag: "Detection", label: "New Development Detected", date: "Jan 2025" },
        { tag: "Spread",    label: "Construction Phase 2",     date: "Apr 2025" },
        { tag: "Peak",      label: "Maximum Sprawl Extent",    date: "Jul 2025" }
      ]
    },
    water: {
      steps: [
        { tag: "Detection", label: "Pre-Monsoon — Low Water",  date: "May 2025" },
        { tag: "Spread",    label: "Monsoon Inflow",           date: "Jul 2025" },
        { tag: "Peak",      label: "Peak Lagoon Spread",       date: "Sep 2025" }
      ]
    },
    fire: {
      steps: [
        { tag: "Detection", label: "Active Hotspot — Day 1",   date: "Feb 14, 2025" },
        { tag: "Spread",    label: "Burn Scar Expanding",      date: "Feb 18, 2025" },
        { tag: "Peak",      label: "Maximum Fire Perimeter",   date: "Feb 22, 2025" }
      ]
    },
    agriculture: {
      steps: [
        { tag: "Detection", label: "Early Stress Signals",     date: "Jun 2025" },
        { tag: "Spread",    label: "Drought Spreading",        date: "Jul 2025" },
        { tag: "Peak",      label: "Critical Failure Zone",    date: "Aug 2025" }
      ]
    }
  };

  function scalePolygonCoordinates(coords, factor) {
    if (!coords || !coords.length) return coords;
    const ring = coords[0];
    const n = Math.max(ring.length - 1, 1);
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      cx += ring[i][0];
      cy += ring[i][1];
    }
    cx /= n;
    cy /= n;

    return coords.map(r =>
      r.map(pt => [
        Number((cx + (pt[0] - cx) * factor).toFixed(4)),
        Number((cy + (pt[1] - cy) * factor).toFixed(4))
      ])
    );
  }

  function generateClientSnapshots(scenarioKey, geojson) {
    const meta = TEMPORAL_SCENARIOS[scenarioKey]?.steps || TEMPORAL_SCENARIOS.flood.steps;
    const allFeatures = geojson?.features || [];
    const configs = [
      { scale: 0.55, count: 1 },
      { scale: 0.78, count: Math.max(1, allFeatures.length - 1) },
      { scale: 1.00, count: allFeatures.length }
    ];

    return configs.map((cfg, i) => {
      const subset = allFeatures.slice(0, cfg.count);
      const scaledFeatures = subset.map(feat => {
        const f = JSON.parse(JSON.stringify(feat));
        if (f.geometry && f.geometry.coordinates) {
          f.geometry.coordinates = scalePolygonCoordinates(f.geometry.coordinates, cfg.scale);
        }
        const origArea = feat.properties?.area_sqkm || 0;
        if (f.properties) {
          f.properties.area_sqkm = Number((origArea * cfg.scale * cfg.scale).toFixed(1));
        }
        return f;
      });

      return {
        step: i,
        tag: meta[i].tag,
        label: meta[i].label,
        date: meta[i].date,
        geojson: {
          type: "FeatureCollection",
          features: scaledFeatures
        }
      };
    });
  }

  // ------------------------------------------------------------------
  // Temporal playback
  // ------------------------------------------------------------------
  async function fetchAndSetupTemporal(scenarioId = "flood", fallbackGeojson = null) {
    const activeId = (scenarioId || "flood").toLowerCase();
    const meta = TEMPORAL_SCENARIOS[activeId]?.steps || TEMPORAL_SCENARIOS.flood.steps;

    // 1. Immediately display the bar and populate node tags (zero lag!)
    showTemporalBar();
    stopTemporalPlayback();

    meta.forEach((stepMeta, i) => {
      const tag = document.getElementById(`ttag${i}`);
      if (tag) tag.textContent = stepMeta.tag;
      const node = document.getElementById(`tnode${i}`);
      if (node) {
        node.onclick = () => {
          stopTemporalPlayback();
          goToTemporalStep(i);
        };
      }
    });

    const stepLabel = document.getElementById("temporalStepLabel");
    if (stepLabel) stepLabel.textContent = meta[2].label;
    const dateLabel = document.getElementById("temporalDate");
    if (dateLabel) dateLabel.textContent = meta[2].date;

    for (let i = 0; i < 3; i++) {
      document.getElementById(`tnode${i}`)?.classList.toggle("active", true);
    }
    const tline0 = document.getElementById("tline0");
    if (tline0) tline0.style.width = "100%";
    const tline1 = document.getElementById("tline1");
    if (tline1) tline1.style.width = "100%";

    // 2. Try fetching server-side snapshots, fallback to client-side generator
    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/v1/temporal/${activeId}`);
      } catch (err) {
        if (API_BASE !== "https://satquery-ai-sage.vercel.app") {
          res = await fetch(`https://satquery-ai-sage.vercel.app/api/v1/temporal/${activeId}`);
        }
      }
      if (res && res.ok) {
        const data = await res.json();
        if (data.snapshots && data.snapshots.length === 3) {
          temporalSnapshots = data.snapshots;
          goToTemporalStep(2);
          return;
        }
      }
    } catch (e) {
      console.warn("Using client-generated temporal snapshots:", e);
    }

    if (fallbackGeojson) {
      temporalSnapshots = generateClientSnapshots(activeId, fallbackGeojson);
      goToTemporalStep(2);
    }
  }

  function showTemporalBar() {
    const bar = document.getElementById("temporalBar");
    if (bar) {
      bar.classList.add("visible");
      bar.style.display = "flex";
      bar.style.visibility = "visible";
      bar.style.opacity = "1";
    }
  }

  function hideTemporalBar() {
    const bar = document.getElementById("temporalBar");
    if (bar) {
      bar.classList.remove("visible");
      bar.style.display = "none";
    }
    stopTemporalPlayback();
    temporalSnapshots = null;
  }

  function goToTemporalStep(step) {
    if (!temporalSnapshots || step < 0 || step >= temporalSnapshots.length) return;
    temporalCurrentStep = step;
    const snap = temporalSnapshots[step];

    // Swap map layer
    if (activeGeoJsonLayer) { map.removeLayer(activeGeoJsonLayer); activeGeoJsonLayer = null; }
    const baseColor =
      SCENARIO_COLORS[lastQueryResult?.scenario_id || "flood"] ||
      SCENARIO_COLORS.flood;
    activeGeoJsonLayer = L.geoJSON(snap.geojson, {
      style: (feature) => ({
        color: feature.properties.color || baseColor,
        weight: 2.5,
        fillColor: feature.properties.color || baseColor,
        fillOpacity: 0.32,
        className: "geojson-layer-enter",
      }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const confidencePct = p.confidence ? Math.round(p.confidence * 100) : "—";
        const popupHtml = `
          <div class="popup-container">
            <div class="popup-header" style="border-left:3px solid ${p.color || baseColor}">
              <span class="popup-title">${escapeHtml(p.label || "Segmented Region")}</span>
              ${p.severity ? `<span class="popup-badge">${escapeHtml(p.severity)}</span>` : ""}
            </div>
            <div class="popup-body">
              <div class="popup-row"><strong>Confidence:</strong> ${confidencePct}%</div>
              <div class="popup-row"><strong>Area:</strong> ${p.area_sqkm ?? "—"} km²</div>
              ${p.sensor ? `<div class="popup-row"><strong>Sensor:</strong> ${escapeHtml(p.sensor)}</div>` : ""}
              ${p.description ? `<div class="popup-desc">${escapeHtml(p.description)}</div>` : ""}
              ${p.action ? `<div class="popup-action"><strong>Action:</strong> ${escapeHtml(p.action)}</div>` : ""}
            </div>
          </div>`;
        layer.bindPopup(popupHtml, { maxWidth: 300 });
        layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.55, weight: 3.5 }));
        layer.on("mouseout",  () => layer.setStyle({ fillOpacity: 0.32, weight: 2.5 }));
      },
    }).addTo(map);

    // Update node active states
    for (let i = 0; i < 3; i++) {
      document.getElementById(`tnode${i}`)?.classList.toggle("active", i <= step);
    }
    // Update connecting line fills
    document.getElementById("tline0").style.width = step >= 1 ? "100%" : "0%";
    document.getElementById("tline1").style.width = step >= 2 ? "100%" : "0%";

    // Update info labels
    document.getElementById("temporalStepLabel").textContent = snap.label;
    document.getElementById("temporalDate").textContent = snap.date;
  }

  function startTemporalPlayback() {
    if (!temporalSnapshots) return;
    temporalPlaying = true;
    const btn = document.getElementById("temporalPlayBtn");
    btn.textContent = "⏸";
    btn.classList.add("playing");

    // Reset to step 0 and play through
    goToTemporalStep(0);
    let step = 0;
    temporalInterval = setInterval(() => {
      step++;
      if (step >= temporalSnapshots.length) {
        stopTemporalPlayback();
        return;
      }
      goToTemporalStep(step);
    }, 2400);
  }

  function stopTemporalPlayback() {
    temporalPlaying = false;
    clearInterval(temporalInterval);
    temporalInterval = null;
    const btn = document.getElementById("temporalPlayBtn");
    if (btn) { btn.textContent = "▶"; btn.classList.remove("playing"); }
  }

  // ------------------------------------------------------------------
  // Event bindings
  // ------------------------------------------------------------------
  el.queryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setActivePresetButton(null);
    runQuery({ query: el.queryInput.value });
  });

  // Enter key submits without shift
  el.queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      el.queryForm.dispatchEvent(new Event("submit"));
    }
  });

  // Quick suggestion chips
  if (el.quickChips) {
    el.quickChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip && chip.dataset.query) {
        el.queryInput.value = chip.dataset.query;
        setActivePresetButton(null);
        runQuery({ query: chip.dataset.query });
      }
    });
  }

  // Action buttons
  if (el.exportGeoJsonBtn) {
    el.exportGeoJsonBtn.addEventListener("click", exportCurrentGeoJSON);
  }

  if (el.copyJsonBtn) {
    el.copyJsonBtn.addEventListener("click", copyCurrentJSON);
  }

  if (el.resetMapBtn) {
    el.resetMapBtn.addEventListener("click", resetMapView);
  }

  // Brand logo click — instantly refreshes the page
  const brandLogo = document.getElementById("brandLogo");
  if (brandLogo) {
    brandLogo.addEventListener("click", () => {
      window.location.reload();
    });
  }

  if (el.clearHistoryBtn) {
    el.clearHistoryBtn.addEventListener("click", clearQueryHistory);
  }

  // Temporal play button
  const temporalPlayBtn = document.getElementById("temporalPlayBtn");
  if (temporalPlayBtn) {
    temporalPlayBtn.addEventListener("click", () => {
      if (temporalPlaying) {
        stopTemporalPlayback();
      } else {
        startTemporalPlayback();
      }
    });
  }

  // Theme toggle button
  if (el.themeToggleBtn) {
    el.themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // ------------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------------
  applyTheme(getPreferredTheme());
  setStatus("busy", "Connecting to inference engine…");
  loadHistoryFromStorage();
  loadPresets();
  hideTemporalBar();
})();
