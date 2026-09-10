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
    earthquake: "#e91e63",
    landslide: "#ff5722",
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
    sourceModal: document.getElementById("sourceModal"),
    modalCloseBtn: document.getElementById("modalCloseBtn"),
    modalBody: document.getElementById("modalBody"),
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
      zIndex: 500,
    }
  );
  referenceLayer.addTo(map);

  // NASA GIBS Daily Satellite Tile Layer (MODIS Terra TrueColor)
  // Uses default/default WMTS endpoint for automatic latest available global daily composite.
  // maxNativeZoom: 9 ensures Leaflet overzooms smoothly up to level 19 without HTTP 400 errors.
  const gibsSatelliteLayer = L.tileLayer(
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
    {
      attribution: "Daily Satellite &copy; NASA EOSDIS GIBS",
      minZoom: 1,
      maxNativeZoom: 9,
      maxZoom: 19,
      opacity: 0.95,
      zIndex: 200,
    }
  );

  // ------------------------------------------------------------------
  // Utility: status indicator
  // ------------------------------------------------------------------
  function setStatus(state, text) {
    el.statusDot.className = `status-dot ${state}`;
    if (el.statusText) el.statusText.textContent = text;
  }

  // ------------------------------------------------------------------
  // Utility: toast notifications
  // ------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message, isError = false) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.toggle("error", isError);
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el.toast) el.toast.classList.remove("show");
    }, 3500);
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

  const SUN_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  const MOON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (el.themeIcon) {
      el.themeIcon.innerHTML = theme === "light" ? MOON_SVG : SUN_SVG;
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

      // Only show temporal bar if a valid recognized scenario is detected with active features
      const scenarioKey = (data.scenario_id || "").toLowerCase();
      const firstFeatureProps = data.geojson?.features?.[0]?.properties || {};
      const isDynamic = Boolean(
        data.mode === "dynamic_api" ||
        data.geojson?.metadata?.is_dynamic ||
        (data.geojson?.metadata?.region && !data.geojson?.metadata?.region.toLowerCase().includes("chilika") && scenarioKey === "water")
      );
      if (
        !isDynamic &&
        TEMPORAL_SCENARIOS[scenarioKey] &&
        data.matched_label !== "unknown" &&
        data.geojson?.features?.length > 0 &&
        firstFeatureProps.flood_active !== false
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
  // Data Source & AI Model Details Modal
  // ------------------------------------------------------------------
  let activeModalData = null;

  function openSourceModal() {
    if (!activeModalData || !el.modalBody) return;
    const meta = activeModalData.geojson?.metadata || {};
    const features = activeModalData.geojson?.features || [];
    const p = features[0]?.properties || {};
    const hydro = meta.hydrology_telemetry;
    const granule = meta.granule_id || p.granule_id || "Sentinel-2 Daily";
    const cloudCover = meta.cloud_cover_percent != null ? `${meta.cloud_cover_percent}%` : "—";
    const sunElev = meta.sun_elevation_deg != null ? `${meta.sun_elevation_deg}°` : "—";
    const acqDate = meta.acquisition_date ? meta.acquisition_date.replace("T", " ").replace("Z", " UTC") : "—";
    const dataset = meta.dataset_source || p.dataset || "Copernicus Sentinel-2 Level-2A & GloFAS River Telemetry";
    const method = meta.methodology || p.methodology || "STAC Satellite Query + Dynamic Remote Sensing Validation";
    const sensor = p.sensor || meta.sensor || "Sentinel-2 MSI (10m) / ESA Copernicus STAC";
    const gsd = p.resolution || "10m GSD Multi-Spectral";
    const region = meta.region || "Monitored Region";

    let hydroHtml = "";
    if (hydro) {
      hydroHtml = `
        <div class="source-item">
          <span class="source-item-label">GloFAS River Discharge Telemetry</span>
          <span class="source-item-value highlight-cyan">${hydro.river_discharge_m3s} m³/s (${escapeHtml(hydro.flood_trend)} trend)</span>
          <span style="font-size: 10px; color: var(--text-2); margin-top: 2px;">Station Network: ${escapeHtml(hydro.network || "Copernicus Emergency Management (GloFAS)")}</span>
        </div>
      `;
    }

    el.modalBody.innerHTML = `
      <div class="source-item">
        <span class="source-item-label">AI / ML Model Architecture</span>
        <span class="source-item-value highlight-cyan">RemoteCLIP (VLM) + SAM 2 (Spatial Segmentation)</span>
        <span style="font-size: 10.5px; color: var(--text-1); margin-top: 3px; line-height: 1.45;">Vision-Language Model multimodal cross-attention prompt encoder coupled with Meta's Segment Anything Model 2 for zero-shot raster polygon vectorization.</span>
      </div>

      <div class="source-item">
        <span class="source-item-label">Primary Satellite & Ground Data</span>
        <span class="source-item-value">${escapeHtml(dataset)}</span>
      </div>

      <div class="source-item">
        <span class="source-item-label">Target Region & Boundary</span>
        <span class="source-item-value">${escapeHtml(region)}</span>
      </div>

      <div class="source-item">
        <span class="source-item-label">Sentinel-2 STAC Granule Identifier</span>
        <span class="source-item-value"><code>${escapeHtml(granule)}</code></span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div class="source-item">
          <span class="source-item-label">Scene Cloud Cover</span>
          <span class="source-item-value">${cloudCover}</span>
        </div>
        <div class="source-item">
          <span class="source-item-label">Sun Elevation Angle</span>
          <span class="source-item-value">${sunElev}</span>
        </div>
      </div>

      <div class="source-item">
        <span class="source-item-label">Sensor & Spatial Resolution</span>
        <span class="source-item-value">${escapeHtml(sensor)} (${escapeHtml(gsd)})</span>
      </div>

      ${hydroHtml}

      <div class="source-item">
        <span class="source-item-label">Acquisition Timestamp</span>
        <span class="source-item-value">${escapeHtml(acqDate)}</span>
      </div>

      <div class="source-item">
        <span class="source-item-label">Verification Methodology</span>
        <span class="source-item-value">${escapeHtml(method)}</span>
      </div>
    `;

    if (el.sourceModal) el.sourceModal.classList.add("open");
  }

  function closeSourceModal() {
    if (el.sourceModal) el.sourceModal.classList.remove("open");
  }

  // ------------------------------------------------------------------
  // Analysis Report Generator
  // ------------------------------------------------------------------
  function generateAnalysisReport(data) {
    const features = data.geojson.features || [];
    if (!features.length) return;

    activeModalData = data;

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

    const severityColor =
      p.severity === "Critical" ? "r-red"
      : p.severity === "High"   ? "r-amb"
      : "r-grn";

    const isSafeFloodCheck = (p.flood_active === false) || (p.severity === "Normal" && data.matched_label.toLowerCase().includes("flood"));

    const sourceBtnHtml = `
      <button type="button" class="report-source-btn" id="openSourceBtn" title="View Data Source, Satellite Granule & AI Model Details">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>View Source & AI Model Details ↗</span>
      </button>
    `;

    const reportEl = document.getElementById("reportText");

    if (data.scenario_id === "unknown" || data.mode === "unsupported") {
      reportEl.innerHTML = `
        <div style="padding: 4px 0;">
          <span class="r-amb" style="font-weight: 600; font-size: 13px;">No matching remote-sensing workflow</span>
          <p style="margin: 8px 0; font-size: 12px; color: var(--text-2); line-height: 1.5;">
            ${escapeHtml(data.message || "Query could not be mapped to an Earth Observation pipeline.")}
          </p>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 4px; border: 1px solid var(--border);">
            Supported domains: <strong>Floods, Earthquakes, Landslides, Wildfires, Urban Sprawl, Drought, Water Bodies</strong>.
          </div>
        </div>
      `;
      return;
    }

    if (isSafeFloodCheck) {
      reportEl.innerHTML = `
        <span class="r-grn">No active flood inundation detected</span> across ${region}.
        ${sensor} imagery at <span class="r-hi">${resolution}</span> confirms
        stable seasonal river flow with <span class="r-hi">${confidence}%</span> confidence.
        Severity assessment: <span class="r-grn">Normal (Safe)</span>.
        <div class="report-action">↳ ${action}</div>
        ${sourceBtnHtml}
      `;
    } else if (data.scenario_id === "earthquake") {
      const eqListHtml = features.slice(0, 5).map(f => {
        const fp = f.properties || {};
        return `<li><strong>${escapeHtml(fp.label || "Earthquake")}:</strong> ${escapeHtml(fp.place || "Regional")} <span class="r-amb">(Depth: ${fp.depth_km ?? "—"} km)</span></li>`;
      }).join("");

      reportEl.innerHTML = `
        <span class="r-hi">${count} Seismic Event${count !== 1 ? "s" : ""}</span>
        detected across ${region}.
        ${sensor} confirms active tectonic rupture signatures with
        <span class="r-hi">${confidence}%</span> query confidence.
        Severity rating: <span class="${severityColor}">${severity}</span>.
        <ul class="report-feature-breakdown" style="margin: 8px 0; padding-left: 18px; font-size: 11.5px; line-height: 1.6; color: var(--text-1);">
          ${eqListHtml}
        </ul>
        <div class="report-action">↳ ${action}</div>
        ${sourceBtnHtml}
      `;
    } else if (count > 1 && (data.scenario_id === "water" || label.toLowerCase().includes("water"))) {
      const waterListHtml = features.map(f => {
        const fp = f.properties || {};
        return `<li><strong>${escapeHtml(fp.name || "Water Body")}:</strong> <span class="r-hi">${fp.area_sqkm ?? "—"} km²</span></li>`;
      }).join("");

      reportEl.innerHTML = `
        <span class="r-hi">${count} Water Bodies</span>
        detected across <span class="r-hi">${totalArea} km²</span> of ${region}.
        ${sensor} imagery at <span class="r-hi">${resolution}</span> confirms
        active surface water signatures with
        <span class="r-hi">${confidence}%</span> query confidence.
        <ul class="report-feature-breakdown" style="margin: 8px 0; padding-left: 18px; font-size: 11.5px; line-height: 1.6; color: var(--text-1);">
          ${waterListHtml}
        </ul>
        <div class="report-action">↳ ${action}</div>
        ${sourceBtnHtml}
      `;
    } else {
      const headingLabel = (count === 1 && (data.scenario_id === "water" || label.toLowerCase().includes("water")))
        ? escapeHtml(p.name || label)
        : `${count} ${label} zone${count !== 1 ? "s" : ""}`;
      reportEl.innerHTML = `
        <span class="r-hi">${headingLabel}</span>
        detected across <span class="r-hi">${totalArea} km²</span> of ${region}.
        ${sensor} imagery at <span class="r-hi">${resolution}</span> confirms
        active ${label.toLowerCase()} signature with
        <span class="r-hi">${confidence}%</span> query confidence.
        Severity assessment: <span class="${severityColor}">${severity}</span>.
        <div class="report-action">↳ ${action}</div>
        ${sourceBtnHtml}
      `;
    }

    const btn = document.getElementById("openSourceBtn");
    if (btn) btn.addEventListener("click", openSourceModal);
  }

  function renderGeoJsonLayer(geojson, scenarioId) {
    if (activeGeoJsonLayer) {
      map.removeLayer(activeGeoJsonLayer);
      activeGeoJsonLayer = null;
    }

    const baseColor = SCENARIO_COLORS[scenarioId] || SCENARIO_COLORS.unknown;

    activeGeoJsonLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const p = feature.properties || {};
        if (p.flood_active === false || p.severity === "Normal") {
          return {
            color: p.color || "#10b981",
            weight: 2,
            dashArray: "5, 5",
            fillColor: "#10b981",
            fillOpacity: 0.08,
            className: "geojson-layer-enter",
          };
        }
        return {
          color: p.color || baseColor,
          weight: 2.8,
          fillColor: p.color || baseColor,
          fillOpacity: 0.38,
          className: "geojson-layer-enter",
        };
      },
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
    el.metricMode.textContent =
      rawMode === "real" ? "NEURAL VLM"
      : rawMode === "dynamic_api" ? "LIVE STAC API"
      : "CALIBRATED";
    el.metricLatency.textContent = `${data.processing_time_ms} ms`;
    if (firstFeature.flood_active === false) {
      el.metricStatus.textContent = "SAFE — No flood detected";
    } else {
      el.metricStatus.textContent = `${features.length} vector polygon(s) active`;
    }
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
    landslide: {
      steps: [
        { tag: "Pre-Event", label: "Slope Creep & Saturation",  date: "Jul 28, 2024" },
        { tag: "Failure",   label: "Crown Scarp & Debris Surge", date: "Jul 30, 2024" },
        { tag: "Deposit",   label: "Runout & Deposition Fan",    date: "Aug 02, 2024" }
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
        { tag: "Peak",      label: "Peak Water Spread",        date: "Sep 2025" }
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

  // NASA GIBS daily satellite imagery toggle
  const gibsToggle = document.getElementById("gibsToggle");
  const gibsToggleLabel = document.getElementById("gibsToggleLabel");
  if (gibsToggle) {
    gibsToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (!map.hasLayer(gibsSatelliteLayer)) {
          gibsSatelliteLayer.addTo(map);
        }
        if (referenceLayer) referenceLayer.bringToFront();
        if (activeGeoJsonLayer) activeGeoJsonLayer.bringToFront();
        if (gibsToggleLabel) gibsToggleLabel.classList.add("active");
        showToast("NASA GIBS Daily True-Color Imagery enabled (Live NASA EOSDIS)");
      } else {
        if (map.hasLayer(gibsSatelliteLayer)) {
          map.removeLayer(gibsSatelliteLayer);
        }
        if (gibsToggleLabel) gibsToggleLabel.classList.remove("active");
        showToast("Switched to high-res baseline satellite imagery");
      }
    });
  }

  // Data Source Modal close listeners
  if (el.modalCloseBtn) {
    el.modalCloseBtn.addEventListener("click", closeSourceModal);
  }
  if (el.sourceModal) {
    el.sourceModal.addEventListener("click", (e) => {
      if (e.target === el.sourceModal) closeSourceModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSourceModal();
  });

  // ------------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------------
  applyTheme(getPreferredTheme());
  setStatus("busy", "Connecting to inference engine…");
  loadHistoryFromStorage();
  loadPresets();
  hideTemporalBar();
})();
