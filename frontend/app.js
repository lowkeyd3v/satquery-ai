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

  // API base is same-origin since FastAPI serves this file too.
  const API_BASE = window.location.origin;
  const ENDPOINTS = {
    scenarios: `${API_BASE}/api/v1/scenarios`,
    query: `${API_BASE}/api/v1/query`,
    health: `${API_BASE}/api/v1/health`,
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

  // ------------------------------------------------------------------
  // DOM references
  // ------------------------------------------------------------------
  const el = {
    statusDot: document.getElementById("statusDot"),
    statusText: document.getElementById("statusText"),
    queryForm: document.getElementById("queryForm"),
    queryInput: document.getElementById("queryInput"),
    submitBtn: document.getElementById("submitBtn"),
    quickChips: document.getElementById("quickChips"),
    exportGeoJsonBtn: document.getElementById("exportGeoJsonBtn"),
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
    el.statusText.textContent = text;
  }

  // ------------------------------------------------------------------
  // Utility: toast notifications
  // ------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message, isError = false) {
    el.toast.textContent = message;
    el.toast.classList.toggle("error", isError);
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
    }, 3500);
  }

  // ------------------------------------------------------------------
  // Fetch and render preset scenario buttons
  // ------------------------------------------------------------------
  async function loadPresets() {
    try {
      const res = await fetch(ENDPOINTS.scenarios);
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
      const res = await fetch(ENDPOINTS.query, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          scenario_id: scenario_id,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      lastQueryResult = data;
      handleQueryResponse(query, data);
      setStatus("online", "Inference engine online");
    } catch (err) {
      console.error("Query failed:", err);
      showToast(`Query failed: ${err.message}`, true);
      setStatus("error", "Last query failed");
      el.metricStatus.textContent = "Error";
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
    addHistoryEntry(originalQuery, data);
    showToast(
      `Detected "${data.matched_label}" (${Math.round(
        data.query_confidence * 100
      )}% confidence) in ${data.processing_time_ms}ms`
    );
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
    el.metricConfidence.textContent = `${Math.round(
      data.query_confidence * 100
    )}%`;
    el.confidenceBarFill.style.width = `${Math.round(
      data.query_confidence * 100
    )}%`;
    el.metricArea.textContent = `${totalArea.toFixed(1)} km²`;
    el.metricSensor.textContent = sensorText;
    el.metricMode.textContent = data.mode.toUpperCase();
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
    el.metricStatus.textContent = "Idle";
    showToast("Map view reset to Pan-India coverage.");
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

  if (el.resetMapBtn) {
    el.resetMapBtn.addEventListener("click", resetMapView);
  }

  // ------------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------------
  setStatus("busy", "Connecting to inference engine…");
  loadPresets();
})();
