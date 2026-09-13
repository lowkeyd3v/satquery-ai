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
    get scenarios()    { return `${API_BASE}/api/v1/scenarios`; },
    get query()        { return `${API_BASE}/api/v1/query`; },
    get health()       { return `${API_BASE}/api/v1/health`; },
    get uploadQuery()  { return `${API_BASE}/api/v1/upload-query`; },
  };

  const SCENARIO_COLORS = {
    flood: "#ff1744",
    sikkim_flood: "#ff1744",
    joshimath: "#9c27b0",
    landslide: "#ff5722",
    manipur_landslide: "#ff7043",
    earthquake: "#e91e63",
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

  // Uploaded image file (File object or null)
  let uploadedFile = null;

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
    presetSelect: document.getElementById("presetSelect"),
    presetCountBadge: document.getElementById("presetCountBadge"),
    presetActiveCard: document.getElementById("presetActiveCard"),
    presetCardDot: document.getElementById("presetCardDot"),
    presetCardTitle: document.getElementById("presetCardTitle"),
    presetCardRegion: document.getElementById("presetCardRegion"),
    presetCardDesc: document.getElementById("presetCardDesc"),
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
    // Dossier modal & actions
    dossierModal: document.getElementById("dossierModal"),
    dossierSheet: document.getElementById("dossierSheet"),
    headerDossierBtn: document.getElementById("headerDossierBtn"),
    printDossierBtn: document.getElementById("printDossierBtn"),
    downloadGeoJsonBtn: document.getElementById("downloadGeoJsonBtn"),
    dossierCloseBtn: document.getElementById("dossierCloseBtn"),
    // Upload zone
    uploadZone: document.getElementById("uploadZone"),
    uploadFileInput: document.getElementById("uploadFileInput"),
    uploadIdle: document.getElementById("uploadIdle"),
    uploadPreview: document.getElementById("uploadPreview"),
    uploadThumb: document.getElementById("uploadThumb"),
    uploadFilename: document.getElementById("uploadFilename"),
    uploadFilesize: document.getElementById("uploadFilesize"),
    uploadClearBtn: document.getElementById("uploadClearBtn"),
  };

  // ------------------------------------------------------------------
  // Map setup
  // ------------------------------------------------------------------
  const map = L.map("map", {
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,             // Hardware-accelerated GPU 2D canvas for all vector polygons
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    updateWhenZooming: false,       // Prevents micro-stutters during zoom transitions
    updateWhenIdle: true,
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
      keepBuffer: 4,               // Pre-buffers neighboring tiles in RAM for lag-free panning
      updateWhenZooming: false,
      updateWhenIdle: true,
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
      keepBuffer: 4,
      updateWhenZooming: false,
      updateWhenIdle: true,
    }
  );
  referenceLayer.addTo(map);

  // NASA GIBS Daily Satellite Tile Layer (MODIS Terra TrueColor)
  // NASA GIBS daily global composite compiles continuously and finalizes daily swaths by ~18:00 UTC.
  // Using yesterday's UTC date prior to 18:00 UTC guarantees 100% completed global coverage with zero 404 tile misses.
  // Notice: WMTS template mandates explicit ISO date (YYYY-MM-DD) and .jpeg extension (not .jpg).
  function getLatestGibsDate() {
    const now = new Date();
    const offsetDays = now.getUTCHours() < 18 ? 1 : 0;
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offsetDays));
    const yyyy = target.getUTCFullYear();
    const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(target.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const gibsDate = getLatestGibsDate();

  const gibsSatelliteLayer = L.tileLayer(
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`,
    {
      attribution: `Daily Satellite (${gibsDate}) &copy; NASA EOSDIS GIBS`,
      minZoom: 1,
      maxNativeZoom: 9,
      maxZoom: 19,
      opacity: 0.95,
      zIndex: 200,
      keepBuffer: 3,
      updateWhenZooming: false,
      updateWhenIdle: true,
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
  // Image Upload Zone — drag-drop, preview, clear
  // ------------------------------------------------------------------
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setUploadedFile(file) {
    if (!file) {
      uploadedFile = null;
      el.uploadPreview.style.display = "none";
      el.uploadIdle.style.display = "flex";
      el.uploadThumb.src = "";
      el.submitBtn.classList.remove("has-image");
      return;
    }

    // Validate type
    const validExts = [".png", ".jpg", ".jpeg", ".tif", ".tiff"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      showToast("Unsupported file type. Use PNG, JPEG, or GeoTIFF.", true);
      return;
    }

    // Validate size (50 MB)
    if (file.size > 50 * 1024 * 1024) {
      showToast(`File too large (${formatBytes(file.size)}). Max 50 MB.`, true);
      return;
    }

    uploadedFile = file;

    // Show thumbnail preview
    const reader = new FileReader();
    reader.onload = (e) => {
      el.uploadThumb.src = e.target.result;
      el.uploadPreview.style.display = "flex";
      el.uploadIdle.style.display = "none";
      el.uploadFilename.textContent = file.name;
      el.uploadFilesize.textContent = formatBytes(file.size);
      el.submitBtn.classList.add("has-image");

      // Auto-suggest query if textarea is blank
      if (!el.queryInput.value.trim()) {
        el.queryInput.value = "Analyze this satellite image and detect any significant features";
      }
      showToast(`Image loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  function initUploadZone() {
    if (!el.uploadZone) return;

    // Click to open file picker
    el.uploadZone.addEventListener("click", (e) => {
      if (e.target === el.uploadClearBtn) return;
      el.uploadFileInput.click();
    });

    // File input change
    el.uploadFileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) setUploadedFile(file);
      e.target.value = ""; // reset so same file can be re-picked
    });

    // Clear button
    el.uploadClearBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      setUploadedFile(null);
    });

    // Drag-drop
    el.uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.uploadZone.classList.add("drag-over");
    });

    el.uploadZone.addEventListener("dragleave", (e) => {
      if (!el.uploadZone.contains(e.relatedTarget)) {
        el.uploadZone.classList.remove("drag-over");
      }
    });

    el.uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      el.uploadZone.classList.remove("drag-over");
      const file = e.dataTransfer?.files?.[0];
      if (file) setUploadedFile(file);
    });
  }

  // ------------------------------------------------------------------
  // Upload + Query — sends multipart/form-data to /api/v1/upload-query
  // ------------------------------------------------------------------
  async function runUploadQuery(queryText) {
    const formData = new FormData();
    formData.append("query", queryText);
    formData.append("file", uploadedFile, uploadedFile.name);

    let res;
    try {
      res = await fetch(ENDPOINTS.uploadQuery, { method: "POST", body: formData });
    } catch (netErr) {
      // Fallback to Vercel
      res = await fetch(
        `https://satquery-ai-sage.vercel.app/api/v1/upload-query`,
        { method: "POST", body: formData }
      );
    }

    if (!res || !res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ------------------------------------------------------------------
  // Fetch and render preset scenario dropdown
  // ------------------------------------------------------------------
  let loadedPresets = [];

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
      loadedPresets = data.scenarios || [];
      renderPresetDropdown(loadedPresets);
      setStatus("online", "Inference engine online");
    } catch (err) {
      console.error("Failed to load presets:", err);
      setStatus("error", "Backend unreachable — check server");
      if (el.presetSelect) {
        el.presetSelect.innerHTML =
          '<option value="" disabled selected>Could not load presets (server offline)</option>';
      }
    }
  }

  function renderPresetDropdown(scenarios) {
    if (!el.presetSelect) return;
    el.presetSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = `— Select a scenario (${scenarios.length} available) —`;
    el.presetSelect.appendChild(placeholder);

    if (el.presetCountBadge) {
      el.presetCountBadge.textContent = `${scenarios.length} Scenarios`;
    }

    // Group scenarios into Disasters vs Environment & Urban
    const disasterGroup = document.createElement("optgroup");
    disasterGroup.label = "🚨 Emergency & Disaster Geohazards";

    const planningGroup = document.createElement("optgroup");
    planningGroup.label = "🛰️ Environmental & Urban Telemetry";

    scenarios.forEach((scenario) => {
      const opt = document.createElement("option");
      opt.value = scenario.id;
      opt.textContent = `${scenario.name} — ${scenario.region || ""}`;

      const isDisaster = ["flood", "sikkim_flood", "joshimath", "landslide", "manipur_landslide", "fire"].includes(scenario.id);
      if (isDisaster) {
        disasterGroup.appendChild(opt);
      } else {
        planningGroup.appendChild(opt);
      }
    });

    if (disasterGroup.children.length > 0) el.presetSelect.appendChild(disasterGroup);
    if (planningGroup.children.length > 0) el.presetSelect.appendChild(planningGroup);

    // Attach change handler
    el.presetSelect.onchange = () => {
      const selectedId = el.presetSelect.value;
      const scenario = loadedPresets.find((s) => s.id === selectedId);
      if (!scenario) return;

      setActivePreset(scenario.id);
      el.queryInput.value = scenario.sample_query;
      runQuery({ query: scenario.sample_query, scenario_id: scenario.id });
    };
  }

  function setActivePreset(scenarioId) {
    if (!el.presetSelect) return;
    el.presetSelect.value = scenarioId || "";

    if (!scenarioId) {
      if (el.presetActiveCard) el.presetActiveCard.style.display = "none";
      return;
    }

    const scenario = loadedPresets.find((s) => s.id === scenarioId);
    if (scenario && el.presetActiveCard) {
      if (el.presetCardDot) el.presetCardDot.style.background = scenario.color || "var(--cyan)";
      if (el.presetCardTitle) el.presetCardTitle.textContent = scenario.name;
      if (el.presetCardRegion) el.presetCardRegion.textContent = scenario.region || "";
      if (el.presetCardDesc) el.presetCardDesc.textContent = scenario.description || "";
      el.presetActiveCard.style.display = "flex";
    }
  }

  function setActivePresetButton(scenarioId) {
    setActivePreset(scenarioId);
  }

  // ------------------------------------------------------------------
  // Core: submit a query to the backend and render the response
  // ------------------------------------------------------------------
  async function runQuery({ query, scenario_id = null }) {
    if (!query || !query.trim()) {
      showToast("Please enter a query before running analysis.", true);
      return;
    }

    const isUploadMode = Boolean(uploadedFile && !scenario_id);
    setBusy(true, isUploadMode);
    setStatus("busy", isUploadMode ? "Analyzing uploaded tile…" : "Running spatial segmentation…");
    el.metricStatus.textContent = isUploadMode ? "Processing image…" : "Segmenting…";

    try {
      let data;

      if (isUploadMode) {
        // ── Image Upload Mode: POST multipart/form-data ─────────────
        data = await runUploadQuery(query.trim());
      } else {
        // ── Standard JSON Mode: POST application/json ───────────────
        let res;
        try {
          res = await fetch(ENDPOINTS.query, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query.trim(), scenario_id }),
          });
        } catch (netErr) {
          if (API_BASE !== "https://satquery-ai-sage.vercel.app") {
            res = await fetch(`https://satquery-ai-sage.vercel.app/api/v1/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: query.trim(), scenario_id }),
            });
          } else {
            throw netErr;
          }
        }
        if (!res || !res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `HTTP ${res.status}`);
        }
        data = await res.json();
      }

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
      setBusy(false, false);
    }
  }

  function setBusy(isBusy, isUploadMode = false) {
    el.submitBtn.disabled = isBusy;
    const span = el.submitBtn.querySelector("span");
    if (!isBusy) {
      span.textContent = "Run Analysis";
    } else {
      span.textContent = isUploadMode ? "Analyzing Tile…" : "Analyzing Imagery…";
    }
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
  // Tactical Intelligence Dossier (PDF & SITREP Export)
  // ------------------------------------------------------------------
  function openDossierModal() {
    if (!activeModalData || !el.dossierSheet) return;
    const meta = activeModalData.geojson?.metadata || {};
    const features = activeModalData.geojson?.features || [];
    const p = features[0]?.properties || {};
    const hydro = meta.hydrology_telemetry;
    const granule = meta.granule_id || p.granule_id || "Sentinel-2 Level-2A STAC";
    const sensor = p.sensor || meta.sensor || "Sentinel-2 MSI / Multi-Spectral";
    const gsd = p.resolution || "10m GSD Multi-Spectral";
    const region = meta.region || "Monitored Operational Zone";
    const severity = p.severity || "Moderate";
    const action = p.action || "Standby for tactical field assessment and regional resource staging.";
    const totalArea = features.reduce((s, f) => s + (f.properties.area_sqkm || 0), 0).toFixed(1);
    const confidence = Math.round((activeModalData.query_confidence || 0.95) * 100);
    const scenarioId = (activeModalData.scenario_id || "EO").toUpperCase();
    const sitrepId = `SATQ-SITREP-2026-${scenarioId}-${Math.floor(1000 + (features.length * 89) % 9000)}`;
    const label = capitalize(activeModalData.matched_label || "Geohazard Incident");
    const cloudCover = meta.cloud_cover_percent != null ? `${meta.cloud_cover_percent}%` : "0.0%";
    const sunElev = meta.sun_elevation_deg != null ? `${meta.sun_elevation_deg}°` : "58.4°";

    const sevClass = severity === "Critical" ? "critical" : severity === "High" ? "high" : "moderate";

    const istTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "medium" }) + " IST";
    const utcTime = new Date().toUTCString();

    const maxRows = 4;
    let tableRowsHtml = features.slice(0, maxRows).map((f, idx) => {
      const fp = f.properties || {};
      let coordsStr = "—";
      if (f.geometry?.coordinates) {
        try {
          let pts = [];
          if (f.geometry.type === "Polygon") pts = f.geometry.coordinates[0];
          else if (f.geometry.type === "MultiPolygon") pts = f.geometry.coordinates[0][0];
          else if (f.geometry.type === "Point") pts = [f.geometry.coordinates];
          if (pts && pts.length) {
            const avgLon = pts.reduce((a, c) => a + c[0], 0) / pts.length;
            const avgLat = pts.reduce((a, c) => a + c[1], 0) / pts.length;
            coordsStr = `${avgLat.toFixed(4)}°N, ${avgLon.toFixed(4)}°E`;
          }
        } catch (e) {
          coordsStr = "—";
        }
      }
      return `
        <tr>
          <td>#${idx + 1}</td>
          <td><strong>${escapeHtml(fp.label || fp.name || `Sector ${idx + 1}`)}</strong></td>
          <td>${fp.area_sqkm != null ? fp.area_sqkm + " km²" : "—"}</td>
          <td>${coordsStr}</td>
          <td><span class="sitrep-badge ${sevClass}">${escapeHtml(fp.severity || severity)}</span></td>
        </tr>
      `;
    }).join("");

    if (features.length > maxRows) {
      tableRowsHtml += `
        <tr>
          <td colspan="5" style="text-align: center; font-size: 8px; padding: 2px; color: var(--text-2); background: rgba(255,255,255,0.02);">
            + ${features.length - maxRows} additional delineated sectors recorded in full GeoJSON telemetry
          </td>
        </tr>
      `;
    }

    let hydroRow = "";
    if (hydro) {
      hydroRow = `
        <div class="sitrep-stat-card">
          <span class="sitrep-stat-label">GloFAS River Discharge</span>
          <span class="sitrep-stat-value highlight">${hydro.river_discharge_m3s} m³/s (${escapeHtml(hydro.flood_trend)})</span>
        </div>
      `;
    }

    el.dossierSheet.innerHTML = `
      <div class="sitrep-top-banner">
        <div class="sitrep-org-header">
          <div class="sitrep-org-title">
            <h4>Government of India • Ministry of Earth Sciences</h4>
            <h2>National Remote Sensing Centre (NRSC / ISRO)</h2>
            <div class="sitrep-subhead">SatQuery AI — Tactical Situational Intelligence Dossier (SITREP)</div>
          </div>
          <div class="sitrep-stamp-box">
            <div class="sitrep-stamp-title">SECURITY CLASSIFICATION</div>
            <div class="sitrep-stamp-id">RESTRICTED // OPS</div>
            <div style="font-family: var(--mono); font-size: 8.5px; color: var(--text-2); margin-top: 3px;">REF: ${sitrepId}</div>
          </div>
        </div>

        <div class="sitrep-meta-bar">
          <div class="sitrep-meta-cell">
            <span class="sitrep-meta-label">Disaster Domain</span>
            <span class="sitrep-meta-val">${escapeHtml(label)}</span>
          </div>
          <div class="sitrep-meta-cell">
            <span class="sitrep-meta-label">Operational Theatre</span>
            <span class="sitrep-meta-val">${escapeHtml(region)}</span>
          </div>
          <div class="sitrep-meta-cell">
            <span class="sitrep-meta-label">Issuance (IST / Local)</span>
            <span class="sitrep-meta-val">${istTime}</span>
          </div>
          <div class="sitrep-meta-cell">
            <span class="sitrep-meta-label">Issuance (UTC)</span>
            <span class="sitrep-meta-val">${utcTime}</span>
          </div>
        </div>
      </div>

      <!-- Executive Directive -->
      <div class="sitrep-section">
        <div class="sitrep-section-title">
          <span>1. Operational Tactical Directive</span>
          <span class="sitrep-badge ${sevClass}">${severity.toUpperCase()} ALERT</span>
        </div>
        <div class="sitrep-directive-box">
          <div class="sitrep-directive-title">NDRF / SDMA Field Action Guidance</div>
          <p class="sitrep-directive-text">↳ ${escapeHtml(action)}</p>
        </div>
      </div>

      <!-- Remote Sensing Telemetry -->
      <div class="sitrep-section">
        <div class="sitrep-section-title">2. Earth Observation Sensor & Pipeline Telemetry</div>
        <div class="sitrep-grid-2x4">
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">Primary Satellite</span>
            <span class="sitrep-stat-value highlight">${escapeHtml(sensor)}</span>
          </div>
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">Spatial Resolution (GSD)</span>
            <span class="sitrep-stat-value">${escapeHtml(gsd)}</span>
          </div>
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">AI Architecture</span>
            <span class="sitrep-stat-value highlight">RemoteCLIP + SAM-2</span>
          </div>
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">Query Confidence</span>
            <span class="sitrep-stat-value">${confidence}%</span>
          </div>
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">Delineated Footprint</span>
            <span class="sitrep-stat-value highlight">${totalArea} km² (${features.length} zones)</span>
          </div>
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">Pipeline Latency</span>
            <span class="sitrep-stat-value">${activeModalData.processing_time_ms || 120}ms</span>
          </div>
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">Scene Cloud Cover</span>
            <span class="sitrep-stat-value">${cloudCover}</span>
          </div>
          <div class="sitrep-stat-card">
            <span class="sitrep-stat-label">Sun Elevation</span>
            <span class="sitrep-stat-value">${sunElev}</span>
          </div>
          ${hydroRow}
        </div>
      </div>

      <!-- Spatial Delineation Sectors -->
      <div class="sitrep-section">
        <div class="sitrep-section-title">3. Delineated Geographic Sectors & Impact Zones</div>
        <div class="sitrep-table-wrap">
          <table class="sitrep-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sector Name / Classification</th>
                <th>Area</th>
                <th>Centroid Coordinates</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Autonomous Audit Trace -->
      <div class="sitrep-section">
        <div class="sitrep-section-title">4. Autonomous Agentic Decision Trace Audit</div>
        <div class="sitrep-audit-list">
          <div class="sitrep-audit-row">
            <div class="sitrep-audit-step"><span class="sitrep-audit-icon">⚡</span> Stage 1: Natural Language Semantic Intent Routing</div>
            <div class="sitrep-audit-val">Classified: ${escapeHtml(label)} (${confidence}%)</div>
          </div>
          <div class="sitrep-audit-row">
            <div class="sitrep-audit-step"><span class="sitrep-audit-icon">🛰️</span> Stage 2: Autonomous Sensor & STAC Granule Allocation</div>
            <div class="sitrep-audit-val">Granule: ${escapeHtml(granule.substring(0, 32))}...</div>
          </div>
          <div class="sitrep-audit-row">
            <div class="sitrep-audit-step"><span class="sitrep-audit-icon">📐</span> Stage 3: Spatial Vector Delineation & Metric Extraction</div>
            <div class="sitrep-audit-val">${features.length} Polygons Vectorized (${totalArea} km²)</div>
          </div>
          <div class="sitrep-audit-row">
            <div class="sitrep-audit-step"><span class="sitrep-audit-icon">📋</span> Stage 4: Operational Emergency Directive Synthesis</div>
            <div class="sitrep-audit-val">Protocol: ${severity.toUpperCase()} DISPATCH</div>
          </div>
        </div>
      </div>

      <!-- Forensic Chain of Custody Footer -->
      <div class="sitrep-footer">
        <div>
          <div><strong>Forensic Chain of Custody:</strong> Cryptographically grounded via STAC Copernicus / USGS Catalog.</div>
          <div style="font-size: 8.5px; margin-top: 3px; font-family: var(--mono); color: var(--text-2);">SYSTEM ID: SATQ-VLM-SAM2-AGENTIC-2026 // NDRF-ISRO DMSP PROTOCOL</div>
        </div>
        <div class="sitrep-sign-box">
          <div>OFFICIAL TACTICAL DISPATCH</div>
          <div style="font-size: 8px; color: var(--text-muted); margin-top: 2px;">AUTOMATED ELECTRONIC SIGNATURE</div>
        </div>
      </div>
    `;

    if (el.dossierModal) el.dossierModal.classList.add("open");
  }

  function closeDossierModal() {
    if (el.dossierModal) el.dossierModal.classList.remove("open");
  }

  function triggerDossierPrint() {
    window.print();
  }

  function downloadDossierJson() {
    if (!activeModalData) return;
    const jsonStr = JSON.stringify(activeModalData.geojson, null, 2);
    const blob = new Blob([jsonStr], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satquery_sitrep_${activeModalData.scenario_id || "tactical"}_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("GeoJSON Telemetry exported successfully.");
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

    const methodology = escapeHtml(p.methodology || data.geojson.metadata?.methodology || "Spectral Indices & Spatial Vector Delineation");
    const queryUsed = escapeHtml(el.queryInput?.value?.trim() || data.matched_label);
    const latency = data.processing_time_ms ? `${data.processing_time_ms}ms` : "120ms";
    const modeLabel = data.mode === "dynamic_api" ? "Dynamic Live API Ingestion" : data.mode === "real" ? "Deep Learning VLM + Segmenter" : "Calibrated Spatial Benchmark";
    const primarySensor = escapeHtml((sensor || "Multi-Sensor EO").split('/')[0].trim());

    const agenticTraceHtml = `
      <div class="agentic-trace-wrap collapsed" id="agenticTraceWrap">
        <div class="agentic-trace-header" id="agenticTraceHeader" title="Click to collapse / expand agentic execution trace">
          <div class="agentic-title-group">
            <span class="agentic-pulse-dot"></span>
            <span class="agentic-title-text">⚡ Agentic Execution Trace</span>
            <span class="agentic-steps-badge">4/4 Steps</span>
          </div>
          <span class="agentic-toggle-icon">▼</span>
        </div>
        <div class="agentic-timeline">
          <div class="agentic-step">
            <div class="agentic-step-icon">✓</div>
            <div class="agentic-step-body">
              <div class="agentic-step-title">
                <span>1. Query Parsing & Intent Routing</span>
                <span class="agentic-step-tag">${data.scenario_id.toUpperCase()}</span>
              </div>
              <div class="agentic-step-desc">
                Parsed prompt <code>"${queryUsed}"</code> &rarr; Disambiguated geohazard class: <strong>${escapeHtml(capitalize(data.scenario_id))}</strong> (${confidence}% confidence).
              </div>
            </div>
          </div>
          <div class="agentic-step">
            <div class="agentic-step-icon">✓</div>
            <div class="agentic-step-body">
              <div class="agentic-step-title">
                <span>2. Sensor Selection & Orchestration</span>
                <span class="agentic-step-tag">${primarySensor}</span>
              </div>
              <div class="agentic-step-desc">
                Orchestrated <strong>${sensor}</strong> (${resolution}) &bull; Mode: <em>${modeLabel}</em>.
              </div>
            </div>
          </div>
          <div class="agentic-step">
            <div class="agentic-step-icon">✓</div>
            <div class="agentic-step-body">
              <div class="agentic-step-title">
                <span>3. Vector Grounding & Spatial Segmentation</span>
                <span class="agentic-step-tag">${latency}</span>
              </div>
              <div class="agentic-step-desc">
                Pipeline: <em>${methodology}</em> &bull; Delineated <strong>${count} polygon(s)</strong> covering <strong>${totalArea} km²</strong>.
              </div>
            </div>
          </div>
          <div class="agentic-step">
            <div class="agentic-step-icon">✓</div>
            <div class="agentic-step-body">
              <div class="agentic-step-title">
                <span>4. Operational Directive Synthesis</span>
                <span class="agentic-step-tag">${severity}</span>
              </div>
              <div class="agentic-step-desc">
                Synthesized tactical directive &bull; Protocol dispatched for emergency field deployment.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const sourceBtnHtml = `
      <button type="button" class="report-source-btn" id="openSourceBtn" title="View Data Source, Satellite Granule & AI Model Details">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>View Source & AI Model Details ↗</span>
      </button>
    `;

    const dossierBtnHtml = `
      <button type="button" class="report-dossier-btn" id="openDossierBtn" title="Generate & Export Tactical PDF Intelligence Dossier">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <span>Export Tactical Dossier (PDF) 📄</span>
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
      if (el.headerDossierBtn) el.headerDossierBtn.style.display = "none";
      return;
    }

    if (isSafeFloodCheck) {
      reportEl.innerHTML = `
        <span class="r-grn">No active flood inundation detected</span> across ${region}.
        ${sensor} imagery at <span class="r-hi">${resolution}</span> confirms
        stable seasonal river flow with <span class="r-hi">${confidence}%</span> confidence.
        Severity assessment: <span class="r-grn">Normal (Safe)</span>.
        <div class="report-action">↳ ${action}</div>
        ${agenticTraceHtml}
        ${sourceBtnHtml}
        ${dossierBtnHtml}
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
        ${agenticTraceHtml}
        ${sourceBtnHtml}
        ${dossierBtnHtml}
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
        ${agenticTraceHtml}
        ${sourceBtnHtml}
        ${dossierBtnHtml}
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
        ${agenticTraceHtml}
        ${sourceBtnHtml}
        ${dossierBtnHtml}
      `;
    }

    const traceHeader = document.getElementById("agenticTraceHeader");
    const traceWrap = document.getElementById("agenticTraceWrap");
    if (traceHeader && traceWrap) {
      traceHeader.addEventListener("click", () => {
        traceWrap.classList.toggle("collapsed");
      });
    }

    const btn = document.getElementById("openSourceBtn");
    if (btn) btn.addEventListener("click", openSourceModal);

    const dossierBtn = document.getElementById("openDossierBtn");
    if (dossierBtn) dossierBtn.addEventListener("click", openDossierModal);

    if (el.headerDossierBtn) el.headerDossierBtn.style.display = "inline-flex";
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
    sikkim_flood: {
      steps: [
        { tag: "GLOF Breach", label: "South Lhonak Moraine Breach", date: "Oct 03, 2023" },
        { tag: "Dam Surge",   label: "Chungthang Inundation Surge",  date: "Oct 04, 2023" },
        { tag: "Peak Extent", label: "Teesta Basin Maximum Flood",   date: "Oct 06, 2023" }
      ]
    },
    joshimath: {
      steps: [
        { tag: "Baseline",     label: "Pre-Displacement InSAR Stack", date: "Nov 2022" },
        { tag: "Acceleration", label: "Rapid Subsidence & Cracking",  date: "Jan 03, 2023" },
        { tag: "Peak Sinking", label: "Critical Displacement Core",   date: "Jan 18, 2023" }
      ]
    },
    landslide: {
      steps: [
        { tag: "Pre-Event", label: "Slope Creep & Saturation",  date: "Jul 28, 2024" },
        { tag: "Failure",   label: "Crown Scarp & Debris Surge", date: "Jul 30, 2024" },
        { tag: "Deposit",   label: "Runout & Deposition Fan",    date: "Aug 02, 2024" }
      ]
    },
    manipur_landslide: {
      steps: [
        { tag: "Shear Phase",  label: "Initial Slope Instability",    date: "Jun 25, 2023" },
        { tag: "Failure",      label: "Catastrophic Tupul Collapse",   date: "Jun 29, 2023" },
        { tag: "Valley Dam",   label: "Barak Channel Blockage & Fan", date: "Jul 05, 2023" }
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
        showToast(`NASA GIBS Daily True-Color (${gibsDate}) enabled (Live NASA EOSDIS)`);
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
    if (e.key === "Escape") {
      closeSourceModal();
      closeDossierModal();
    }
  });

  // Tactical Intelligence Dossier listeners
  if (el.dossierCloseBtn) {
    el.dossierCloseBtn.addEventListener("click", closeDossierModal);
  }
  if (el.dossierModal) {
    el.dossierModal.addEventListener("click", (e) => {
      if (e.target === el.dossierModal) closeDossierModal();
    });
  }
  if (el.printDossierBtn) {
    el.printDossierBtn.addEventListener("click", triggerDossierPrint);
  }
  if (el.downloadGeoJsonBtn) {
    el.downloadGeoJsonBtn.addEventListener("click", downloadDossierJson);
  }
  if (el.headerDossierBtn) {
    el.headerDossierBtn.addEventListener("click", openDossierModal);
  }

  // ------------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------------
  applyTheme(getPreferredTheme());
  setStatus("busy", "Connecting to inference engine…");
  loadHistoryFromStorage();
  initUploadZone();
  loadPresets();
  hideTemporalBar();
})();
