"""API du tableau de bord de maintenance prédictive.

Toutes les données servies proviennent :
  - du jeu réel `ai4i2020.csv` ;
  - des artefacts calculés par `train_artifacts.py`, qui rejoue exactement le
    protocole du notebook (5 modèles, SVMSMOTE, CV 5 folds, test non rééquilibré) ;
  - du pipeline joblib du modèle retenu pour les inférations à la demande.

Aucune route n'accepte de valeur saisie : les prédictions sont calculées sur
des observations existantes du jeu de test.
"""

from __future__ import annotations

import json
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
BACKEND = Path(__file__).resolve().parent
ARTIFACTS = BACKEND / "artifacts"
ANALYTICS = ARTIFACTS / "analytics.json"
MODEL_FILE = ARTIFACTS / "modele_retenu.joblib"
DIST = ROOT / "frontend" / "dist"

_cache: dict | None = None
_model = None
_features = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
    "Delta temperature [K]",
    "Power proxy [W]",
    "Type",
]


def ensure_artifacts():
    if not ANALYTICS.exists() or not MODEL_FILE.exists():
        print("Artifacts absents : entraînement des modèles depuis ai4i2020.csv...")
        subprocess.run([sys.executable, str(BACKEND / "train_artifacts.py")], check=True, cwd=ROOT)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_artifacts()
    yield


app = FastAPI(title="API Maintenance Prédictive AI4I", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


def analytics() -> dict:
    global _cache
    if _cache is None:
        if not ANALYTICS.exists():
            raise HTTPException(503, "Artifacts non disponibles : lancez backend/train_artifacts.py")
        _cache = json.loads(ANALYTICS.read_text(encoding="utf-8"))
    return _cache


def model():
    global _model
    if _model is None:
        if not MODEL_FILE.exists():
            raise HTTPException(503, "Modèle non disponible : lancez backend/train_artifacts.py")
        _model = joblib.load(MODEL_FILE)
    return _model


@app.get("/api/health")
def health():
    data = analytics()
    return {
        "status": "ok",
        "model": data["selected"]["label"],
        "dataset": data["meta"]["dataset"],
        "rows": data["eda"]["rows"],
        "predictions": len(data["predictions"]),
        "generatedAt": data["meta"]["generatedAt"],
        "versions": data["meta"]["versions"],
    }


@app.get("/api/bootstrap")
def bootstrap():
    """Charge en une seule requête l'ensemble des données réelles du tableau de bord."""
    return analytics()


@app.get("/api/overview")
def overview():
    data = analytics()
    return {k: data[k] for k in ("meta", "protocol", "split", "selected")}


@app.get("/api/eda")
def eda():
    return analytics()["eda"]


@app.get("/api/cv")
def cv():
    return analytics()["cv"]


@app.get("/api/test")
def test():
    return analytics()["test"]


@app.get("/api/selected")
def selected():
    return analytics()["selected"]


@app.get("/api/importance")
def importance():
    return analytics()["importance"]


@app.get("/api/explanations")
def explanations():
    return analytics()["shap"]


@app.get("/api/predictions")
def predictions(
    outcome: str = Query("ALL", pattern="^(ALL|TP|FN|FP|TN)$"),
    offset: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=200),
):
    rows = analytics()["predictions"]
    if outcome != "ALL":
        rows = [row for row in rows if row["outcome"] == outcome]
    return {"total": len(rows), "offset": offset, "rows": rows[offset : offset + limit]}


@app.get("/api/supervision/feed")
def supervision_feed(offset: int = Query(0, ge=0), limit: int = Query(8, ge=1, le=50)):
    """Inférence réelle du pipeline joblib sur les observations du jeu de test.

    L'offset sélectionne une fenêtre d'observations : aucune saisie, aucune
    génération aléatoire, aucune valeur simulée.
    """
    data = analytics()
    stored = data["predictions"]
    if not stored:
        return []
    start = offset % len(stored)
    indices = [(start + i) % len(stored) for i in range(min(limit, len(stored)))]
    frame = pd.DataFrame(
        [
            {
                "Air temperature [K]": stored[i]["air"],
                "Process temperature [K]": stored[i]["process"],
                "Rotational speed [rpm]": stored[i]["speed"],
                "Torque [Nm]": stored[i]["torque"],
                "Tool wear [min]": stored[i]["wear"],
                "Delta temperature [K]": stored[i]["delta"],
                "Power proxy [W]": stored[i]["power"],
                "Type": stored[i]["type"],
            }
            for i in indices
        ],
        columns=_features,
    )
    probs = model().predict_proba(frame)[:, 1]
    alert_threshold = data["meta"]["threshold"]
    return [
        {
            "position": i + 1,
            "id": stored[i]["id"],
            "productId": stored[i]["productId"],
            "type": stored[i]["type"],
            "speed": stored[i]["speed"],
            "torque": stored[i]["torque"],
            "wear": stored[i]["wear"],
            "delta": stored[i]["delta"],
            "actual": stored[i]["actual"],
            "probability": round(float(p), 6),
            "alert": bool(p >= alert_threshold),
            "verifiedOutcome": stored[i]["outcome"],
        }
        for i, p in zip(indices, probs)
    ]


@app.get("/logo.png", include_in_schema=False)
def logo():
    for image in (DIST / "logo.png", ROOT / "frontend" / "public" / "logo.png", ROOT / "logo.png"):
        if image.is_file():
            return FileResponse(image)
    raise HTTPException(404, "Logo absent")


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")

else:

    @app.get("/", include_in_schema=False)
    def root():
        return JSONResponse(
            {
                "message": "API opérationnelle. Le frontend doit être compilé dans frontend/dist.",
                "docs": "/docs",
            }
        )
