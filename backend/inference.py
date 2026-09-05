"""
inference.py
--------------------------------------------------------------------------
SatQuery AI | SIH26167 | ISRO
--------------------------------------------------------------------------
SatQueryEngine is the modular inference handler for the project. It is
designed to run in two modes:

1. REAL MODE (SATQUERY_REAL_MODE=1 and model weights available locally):
   - A Vision-Language Model (e.g. RemoteCLIP, Qwen2-VL) is used to embed
     the natural-language query and score it against candidate scene
     labels / cropped image regions.
   - A spatial segmentation / grounding model (e.g. Grounding DINO for
     open-vocabulary box proposals, followed by SAM 2 for pixel-accurate
     masks) is used to convert the highest-scoring region into a spatial
     polygon, which is then converted to geographic coordinates using the
     raster's affine transform (via rasterio).

2. MOCK / FALLBACK MODE (default, and automatic fallback on any failure):
   - The query text is classified into one of the supported scenario
     labels using lightweight keyword scoring.
   - A hand-curated, realistic GeoJSON FeatureCollection is returned
     instead of a live model inference, so the system is always
     demoable without GPU hardware or downloaded weights.

The engine ALWAYS attempts REAL MODE first when enabled, and transparently
falls back to MOCK MODE on any ImportError, OSError, or runtime failure,
logging the reason so the operator can diagnose missing dependencies.
"""

from __future__ import annotations

import os
import time
import logging
from dataclasses import dataclass, field
from typing import Optional

from mock_data import get_scenario_geojson, list_presets

logger = logging.getLogger("satquery.inference")
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# Keyword lexicons used for lightweight zero-shot-style query classification.
# In REAL MODE these are replaced by actual VLM text-embedding similarity,
# but they remain useful as a fast pre-filter / fallback classifier.
# ---------------------------------------------------------------------------
SCENARIO_KEYWORDS = {
    "flood": [
        "flood", "flooded", "flooding", "inundat", "waterlog", "overflow",
        "submerg", "deluge", "monsoon damage", "breach",
    ],
    "urban": [
        "urban", "sprawl", "expansion", "built-up", "built up", "construction",
        "city growth", "development", "infrastructure", "settlement",
    ],
    "water": [
        "water body", "water bodies", "lake", "lagoon", "river", "wetland",
        "reservoir", "pond", "coastline", "water spread",
    ],
}


@dataclass
class InferenceResult:
    """Structured result returned by SatQueryEngine.run_inference()."""

    geojson: dict
    scenario_id: str
    mode: str  # "real" or "mock"
    processing_time_ms: float
    matched_label: str
    query_confidence: float
    message: str = ""


@dataclass
class SatQueryEngine:
    """
    Central inference orchestrator for SatQuery AI.

    Attributes:
        real_mode_requested: whether REAL mode was requested via env var.
        models_loaded: whether VLM + segmentation models were successfully
            loaded into memory. Remains False in a pure-mock deployment.
        vlm_model_name: HuggingFace hub id for the vision-language model.
        segmentation_model_name: identifier for the grounding/segmentation
            model used to convert text-grounded regions into polygons.
    """

    real_mode_requested: bool = field(
        default_factory=lambda: os.getenv("SATQUERY_REAL_MODE", "0") == "1"
    )
    vlm_model_name: str = field(
        default_factory=lambda: os.getenv(
            "SATQUERY_VLM_MODEL", "Qwen/Qwen2-VL-2B-Instruct"
        )
    )
    segmentation_model_name: str = field(
        default_factory=lambda: os.getenv(
            "SATQUERY_SEGMENTATION_MODEL", "IDEA-Research/grounding-dino-tiny"
        )
    )
    models_loaded: bool = False
    _vlm_pipeline: Optional[object] = None
    _segmentation_pipeline: Optional[object] = None

    def __post_init__(self):
        if self.real_mode_requested:
            self._try_load_models()
        else:
            logger.info(
                "SatQueryEngine initialized in MOCK mode "
                "(set SATQUERY_REAL_MODE=1 to attempt real model loading)."
            )

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------
    def _try_load_models(self) -> None:
        """
        Attempt to load the VLM and segmentation pipelines. Any failure
        (missing package, missing weights, no GPU, network error while
        fetching from the Hub) is caught and logged, and the engine
        remains in mock mode for this process lifetime.
        """
        try:
            import torch  # noqa: F401
            from transformers import pipeline

            logger.info(
                "Attempting to load VLM '%s' and segmentation model '%s'...",
                self.vlm_model_name,
                self.segmentation_model_name,
            )

            device = 0 if torch.cuda.is_available() else -1

            # NOTE: This constructs a real HuggingFace pipeline object.
            # It will download weights on first run if not cached, which
            # can be slow / fail without internet access. That failure is
            # caught below and the engine gracefully falls back to mock.
            self._vlm_pipeline = pipeline(
                task="image-to-text",
                model=self.vlm_model_name,
                device=device,
            )

            self._segmentation_pipeline = pipeline(
                task="zero-shot-object-detection",
                model=self.segmentation_model_name,
                device=device,
            )

            self.models_loaded = True
            logger.info("Real inference models loaded successfully.")

        except Exception as exc:  # noqa: BLE001 - intentional broad catch
            self.models_loaded = False
            logger.warning(
                "Falling back to MOCK mode. Real model load failed: %s", exc
            )

    # ------------------------------------------------------------------
    # Query classification (keyword-based; swapped for VLM embeddings
    # in real mode)
    # ------------------------------------------------------------------
    def classify_query(self, query_text: str) -> tuple[str, float]:
        """
        Classify a free-text query into one of the supported scenario
        labels ("flood", "urban", "water") using keyword scoring.

        Returns:
            (scenario_id, confidence) where confidence is a heuristic
            score in [0, 1] representing lexical match strength.
        """
        text = query_text.lower().strip()
        if not text:
            return "unknown", 0.0

        scores: dict[str, int] = {key: 0 for key in SCENARIO_KEYWORDS}
        for scenario_id, keywords in SCENARIO_KEYWORDS.items():
            for kw in keywords:
                if kw in text:
                    scores[scenario_id] += 1

        best_scenario = max(scores, key=lambda k: scores[k])
        best_score = scores[best_scenario]

        if best_score == 0:
            # No lexical match at all — default to the "water" scenario
            # since water-body segmentation is the most general-purpose
            # baseline capability, but flag low confidence.
            return "unknown", 0.35

        # Normalize a simple heuristic confidence: more keyword hits and
        # longer, more specific queries increase confidence.
        confidence = min(0.6 + 0.1 * best_score, 0.98)
        return best_scenario, round(confidence, 2)

    # ------------------------------------------------------------------
    # Real-mode inference hook (VLM + spatial grounding)
    # ------------------------------------------------------------------
    def _run_real_inference(
        self, query_text: str, image_path: Optional[str], scenario_hint: str
    ) -> dict:
        """
        Real inference pipeline sketch. This method is only reached when
        self.models_loaded is True (i.e. torch/transformers imported and
        model weights loaded successfully).

        Pipeline design (for the full production system):
            1. Load the raster tile with rasterio to obtain the affine
               transform (pixel -> geographic CRS) and the pixel array.
            2. Feed the query_text + image crop into the VLM
               (RemoteCLIP / Qwen2-VL) to obtain a grounded phrase and a
               coarse region-of-interest description.
            3. Pass the image + grounded phrase into an open-vocabulary
               detector (Grounding DINO) to obtain candidate bounding
               boxes, then refine each box into a pixel mask with SAM 2.
            4. Vectorize each mask's contour (e.g. via
               rasterio.features.shapes or OpenCV findContours) into
               polygon coordinates in pixel space.
            5. Apply the raster's affine transform to convert every
               polygon vertex from pixel space into geographic
               (lon, lat) coordinates, producing valid GeoJSON geometry.
            6. Attach confidence scores from the detector/segmenter and
               compute area_sqkm using a projected equal-area CRS via
               pyproj before returning the FeatureCollection.

        Since no proprietary satellite tile or GPU weights are bundled
        with this scaffold, this method currently raises NotImplementedError
        so that run_inference() cleanly falls back to mock data. Replace
        the body below with the real pipeline once weights + tiles are
        available in your deployment environment.
        """
        if not self.models_loaded or self._vlm_pipeline is None:
            raise RuntimeError("Real inference models are not loaded.")

        if image_path is None:
            raise RuntimeError(
                "Real inference requires an input raster/image path; "
                "none was supplied with this request."
            )

        # --- Real pipeline body would go here -----------------------
        # from PIL import Image
        # import rasterio
        # from rasterio.features import shapes as raster_shapes
        #
        # with rasterio.open(image_path) as src:
        #     transform = src.transform
        #     crs = src.crs
        #     image_array = src.read()
        #
        # image = Image.open(image_path).convert("RGB")
        # vlm_output = self._vlm_pipeline(image, prompt=query_text)
        # detections = self._segmentation_pipeline(
        #     image, candidate_labels=[scenario_hint]
        # )
        # ... convert detections -> pixel masks -> geographic polygons ...
        # --------------------------------------------------------------

        raise NotImplementedError(
            "Real inference pipeline requires bundled model weights and "
            "an input raster tile. Falling back to mock GeoJSON."
        )

    # ------------------------------------------------------------------
    # Public entrypoint used by the FastAPI route
    # ------------------------------------------------------------------
    def run_inference(
        self, query_text: str, image_path: Optional[str] = None
    ) -> InferenceResult:
        """
        Main entrypoint: classify the query, attempt real inference if
        enabled, and gracefully fall back to mock GeoJSON otherwise.
        """
        start = time.perf_counter()
        scenario_id, query_confidence = self.classify_query(query_text)

        # Map "unknown" queries to the water scenario as a sane default
        # demo response, but keep the reported confidence low.
        effective_scenario = scenario_id if scenario_id != "unknown" else "water"

        mode = "mock"
        message = "Served from mock inference fallback."

        if self.real_mode_requested and self.models_loaded:
            try:
                geojson = self._run_real_inference(
                    query_text, image_path, effective_scenario
                )
                mode = "real"
                message = "Served from real VLM + segmentation pipeline."
            except Exception as exc:  # noqa: BLE001
                logger.info("Real inference unavailable (%s); using mock.", exc)
                geojson = get_scenario_geojson(effective_scenario)
        else:
            geojson = get_scenario_geojson(effective_scenario)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return InferenceResult(
            geojson=geojson,
            scenario_id=effective_scenario,
            mode=mode,
            processing_time_ms=elapsed_ms,
            matched_label=effective_scenario,
            query_confidence=query_confidence,
            message=message,
        )

    def get_presets(self) -> list:
        """Expose the preset scenario list for the /scenarios endpoint."""
        return list_presets()

    def status(self) -> dict:
        """Health/status summary used by the /health endpoint."""
        return {
            "real_mode_requested": self.real_mode_requested,
            "models_loaded": self.models_loaded,
            "vlm_model_name": self.vlm_model_name,
            "segmentation_model_name": self.segmentation_model_name,
            "active_mode": "real" if self.models_loaded else "mock",
        }


# Singleton engine instance shared across FastAPI requests.
engine = SatQueryEngine()
