"""Reproduit exactement le protocole du notebook `soutenance_finalise_cv.ipynb`.

Le script ne lit que les données réelles `ai4i2020.csv`, réentraîne les cinq
modèles avec la même configuration et exporte l'ensemble des résultats et le
pipeline retenu dans `backend/artifacts/`.

Aucune valeur n'est inventée : chaque chiffre exporté est calculé à partir du
CSV et des prédictions des modèles entraînés.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
import shap
import sklearn
import imblearn
import xgboost
from imblearn.over_sampling import SVMSMOTE
from imblearn.pipeline import Pipeline
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline as SkPipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC
from xgboost import XGBClassifier

import joblib

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)

SEED = 42
N_FOLDS = 5

NUMERIC = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]
MODES = ["TWF", "HDF", "PWF", "OSF", "RNF"]
MODE_LABELS = {
    "TWF": "Tool Wear Failure",
    "HDF": "Heat Dissipation Failure",
    "PWF": "Power Failure",
    "OSF": "Overstrain Failure",
    "RNF": "Random Failure",
}

FEATURE_LABELS = {
    "Air temperature [K]": "Température air",
    "Process temperature [K]": "Température procédé",
    "Rotational speed [rpm]": "Vitesse de rotation",
    "Torque [Nm]": "Couple",
    "Tool wear [min]": "Usure outil",
    "Delta temperature [K]": "Écart thermique ΔT",
    "Power proxy [W]": "Puissance approchée",
    "Type": "Type produit",
}

MODEL_LABELS = {
    "Logistic Regression": "Régression logistique",
    "SVM RBF": "SVM RBF",
    "Random Forest": "Forêt aléatoire",
    "XGBoost": "XGBoost",
    "MLP": "MLP",
}

METRICS_CV = ["F1-score", "Recall", "Precision", "ROC-AUC"]


def r(value, digits=6):
    """Arrondit les floats pour un JSON compact, sans altérer la valeur utile."""
    if isinstance(value, (np.floating, float)):
        return round(float(value), digits)
    if isinstance(value, (np.integer, int)):
        return int(value)
    return value


def preprocessing():
    return ColumnTransformer(
        [
            (
                "num",
                SkPipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                [c for c in NUMERIC + ["Delta temperature [K]", "Power proxy [W]"]],
            ),
            (
                "cat",
                SkPipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                ["Type"],
            ),
        ],
        sparse_threshold=0,
    )


def build_pipeline(estimator, use_smote=True):
    steps = [("preprocess", preprocessing())]
    if use_smote:
        steps.append(("balance", SVMSMOTE(random_state=SEED, k_neighbors=3, m_neighbors=5)))
    steps.append(("model", estimator))
    return Pipeline(steps)


def models():
    return {
        "Logistic Regression": LogisticRegression(max_iter=1500, random_state=SEED),
        "SVM RBF": SVC(C=1, kernel="rbf", probability=True, random_state=SEED),
        "Random Forest": RandomForestClassifier(
            n_estimators=200, min_samples_leaf=2, random_state=SEED, n_jobs=-1
        ),
        "XGBoost": XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            eval_metric="logloss",
            random_state=SEED,
            n_jobs=2,
        ),
        "MLP": MLPClassifier(
            hidden_layer_sizes=(64, 32), max_iter=350, early_stopping=True, random_state=SEED
        ),
    }


def histogram(df, column, bins=22):
    values = df[column].to_numpy(dtype=float)
    counts, edges = np.histogram(values, bins=bins)
    fail = df.loc[df["Machine failure"] == 1, column].to_numpy(dtype=float)
    normal = df.loc[df["Machine failure"] == 0, column].to_numpy(dtype=float)
    c_fail, _ = np.histogram(fail, bins=edges)
    c_normal, _ = np.histogram(normal, bins=edges)
    return {
        "binEdges": [r(e, 3) for e in edges],
        "normal": [int(c) for c in c_normal],
        "failure": [int(c) for c in c_fail],
        "total": [int(c) for c in counts],
    }


def box_stats(df, column):
    out = {}
    for classe, label in [(0, "normal"), (1, "failure")]:
        v = df.loc[df["Machine failure"] == classe, column].to_numpy(dtype=float)
        q1, med, q3 = np.percentile(v, [25, 50, 75])
        iqr = q3 - q1
        lo = float(v[v >= q1 - 1.5 * iqr].min())
        hi = float(v[v <= q3 + 1.5 * iqr].max())
        out[label] = {
            "min": r(lo, 3),
            "q1": r(q1, 3),
            "median": r(med, 3),
            "q3": r(q3, 3),
            "max": r(hi, 3),
            "outliers": int(((v < lo) | (v > hi)).sum()),
        }
    return out


def build_eda(df):
    target = df["Machine failure"].astype(int)
    descriptive = []
    numeric_for_corr = NUMERIC + ["Delta temperature [K]", "Power proxy [W]", "Machine failure"]
    derived = df.copy()
    derived["Delta temperature [K]"] = derived["Process temperature [K]"] - derived["Air temperature [K]"]
    derived["Power proxy [W]"] = (
        derived["Torque [Nm]"] * derived["Rotational speed [rpm]"] * 2 * np.pi / 60
    )
    corr_full = derived[numeric_for_corr].corr()
    for col in NUMERIC:
        s = derived[col]
        descriptive.append(
            {
                "variable": FEATURE_LABELS[col],
                "raw": col,
                "mean": r(s.mean(), 3),
                "std": r(s.std(), 3),
                "min": r(s.min(), 3),
                "median": r(s.median(), 3),
                "max": r(s.max(), 3),
                "corrTarget": r(corr_full.loc[col, "Machine failure"], 4),
            }
        )

    mode_counts = df[MODES].sum().astype(int)
    inconsistency = int((target != df[MODES].max(axis=1)).sum())
    type_rows = []
    for t in ["L", "M", "H"]:
        sub = df[df["Type"] == t]
        type_rows.append(
            {
                "type": t,
                "count": int(len(sub)),
                "failures": int(sub["Machine failure"].sum()),
                "rate": r(sub["Machine failure"].mean(), 6),
            }
        )

    tmp = df[["Type", "Tool wear [min]", "Machine failure"]].copy()
    tmp["quartile"] = pd.qcut(tmp["Tool wear [min]"], 4, duplicates="drop")
    pivot = tmp.pivot_table(
        index="Type", columns="quartile", values="Machine failure", aggfunc="mean", observed=True
    )
    quartile_labels = [str(x) for x in pivot.columns]
    wear_quartile = {
        "quartiles": quartile_labels,
        "types": [str(x) for x in pivot.index],
        "rates": [[r(v, 6) for v in row] for row in pivot.to_numpy()],
    }

    corr_labels = [FEATURE_LABELS.get(c, "Cible") for c in numeric_for_corr]
    return {
        "rows": int(len(df)),
        "columns": int(df.shape[1]),
        "missing": int(df.isna().sum().sum()),
        "duplicates": int(df.duplicated().sum()),
        "target": {
            "normal": int((target == 0).sum()),
            "failure": int((target == 1).sum()),
            "rate": r(target.mean(), 6),
        },
        "modes": [
            {"code": m, "label": MODE_LABELS[m], "count": int(mode_counts[m])}
            for m in ["HDF", "OSF", "PWF", "TWF", "RNF"]
        ],
        "labelConsistency": {
            "mismatch": inconsistency,
            "withModeZeroTargetOne": int(((df[MODES].max(axis=1) == 0) & (target == 1)).sum()),
            "withModeOneTargetZero": int(((df[MODES].max(axis=1) == 1) & (target == 0)).sum()),
            "rate": r(inconsistency / len(df), 6),
        },
        "types": type_rows,
        "descriptives": descriptive,
        "correlation": {
            "labels": corr_labels,
            "matrix": [[r(v, 4) for v in row] for row in corr_full.to_numpy()],
        },
        "histograms": {FEATURE_LABELS[c]: histogram(derived, c) for c in NUMERIC},
        "boxStats": {FEATURE_LABELS[c]: box_stats(derived, c) for c in NUMERIC},
        "wearQuartile": wear_quartile,
        "scatter": {
            "speed": [int(v) for v in derived["Rotational speed [rpm]"].to_numpy()],
            "torque": [r(v, 2) for v in derived["Torque [Nm]"].to_numpy()],
            "failure": [int(v) for v in derived["Machine failure"].to_numpy()],
        },
    }


def main():
    print("Chargement du jeu de données réel...")
    df = pd.read_csv(ROOT / "ai4i2020.csv")

    data = df.copy()
    data["Delta temperature [K]"] = data["Process temperature [K]"] - data["Air temperature [K]"]
    data["Power proxy [W]"] = data["Torque [Nm]"] * data["Rotational speed [rpm]"] * 2 * np.pi / 60
    features = NUMERIC + ["Delta temperature [K]", "Power proxy [W]", "Type"]
    X = data[features].copy()
    y = data["Machine failure"].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=SEED
    )
    print(f"Train : {X_train.shape} | Test : {X_test.shape}")

    # --- Équilibrage (visualisation du notebook, train uniquement) ---
    X_train_transforme = preprocessing().fit_transform(X_train)
    _, y_train_illustre = SVMSMOTE(random_state=SEED, k_neighbors=3, m_neighbors=5).fit_resample(
        X_train_transforme, y_train
    )
    avant = pd.Series(y_train).value_counts().reindex([0, 1], fill_value=0)
    apres = pd.Series(y_train_illustre).value_counts().reindex([0, 1], fill_value=0)
    equilibrage = [
        {
            "label": label,
            "before": int(avant.iloc[i]),
            "after": int(apres.iloc[i]),
            "beforePct": r(100 * avant.iloc[i] / avant.sum(), 2),
            "afterPct": r(100 * apres.iloc[i] / apres.sum(), 2),
        }
        for i, label in enumerate(["Normal (0)", "Défaillance (1)"])
    ]

    # --- Validation croisée 5 folds sur le train uniquement ---
    print("Validation croisée 5 folds (5 modèles)...")
    cv = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)
    scoring_cv = {"F1-score": "f1", "Recall": "recall", "Precision": "precision", "ROC-AUC": "roc_auc"}
    control_folds = []
    for k, (idx_tr, idx_val) in enumerate(cv.split(X_train, y_train), start=1):
        control_folds.append(
            {
                "fold": k,
                "train": int(len(idx_tr)),
                "validation": int(len(idx_val)),
                "failures": int(y_train.iloc[idx_val].sum()),
                "rate": r(100 * float(y_train.iloc[idx_val].mean()), 2),
            }
        )

    cv_rows = []
    cv_duree = {}
    for nom, estimateur in models().items():
        t0 = time.time()
        pipeline_cv = build_pipeline(clone(estimateur), use_smote=True)
        scores = cross_validate(
            pipeline_cv, X_train, y_train, cv=cv, scoring=scoring_cv, n_jobs=1, error_score="raise"
        )
        cv_duree[nom] = time.time() - t0
        for k in range(N_FOLDS):
            row = {"model": nom, "modelLabel": MODEL_LABELS[nom], "fold": k + 1}
            row.update({m: r(scores[f"test_{m}"][k], 6) for m in METRICS_CV})
            cv_rows.append(row)
        print(f"  {nom:<20} F1={scores['test_F1-score'].mean():.4f} ± {scores['test_F1-score'].std(ddof=1):.4f}")

    cv_folds = pd.DataFrame(cv_rows)
    summary_rows = []
    for nom in models():
        sub = cv_folds[cv_folds["model"] == nom]
        m = sub[METRICS_CV].mean()
        s = sub[METRICS_CV].std(ddof=1)
        row = {"model": nom, "modelLabel": MODEL_LABELS[nom]}
        for met in METRICS_CV:
            row[f"{met}Mean"] = r(m[met], 6)
            row[f"{met}Std"] = r(s[met], 6)
        summary_rows.append(row)
    summary = pd.DataFrame(summary_rows).sort_values("F1-scoreMean", ascending=False).reset_index(drop=True)
    summary["rank"] = np.arange(1, len(summary) + 1)
    selected_name = str(summary.iloc[0]["model"])
    print(f"Modèle retenu par CV : {selected_name}")

    # --- Entraînement final des 5 modèles ---
    print("Entraînement final et évaluation sur le test...")
    comparison = []
    predictions = {}
    trained = {}
    cur_roc = {}
    cur_pr = {}
    confusion = {}
    for nom, estimateur in models().items():
        pipeline = build_pipeline(clone(estimateur), use_smote=True)
        pipeline.fit(X_train, y_train)
        trained[nom] = pipeline
        proba = pipeline.predict_proba(X_test)[:, 1]
        pred = (proba >= 0.5).astype(int)
        predictions[nom] = {"proba": proba, "pred": pred}
        tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
        comparison.append(
            {
                "model": nom,
                "modelLabel": MODEL_LABELS[nom],
                "accuracy": r(accuracy_score(y_test, pred), 6),
                "precision": r(precision_score(y_test, pred, zero_division=0), 6),
                "recall": r(recall_score(y_test, pred, zero_division=0), 6),
                "f1": r(f1_score(y_test, pred, zero_division=0), 6),
                "rocAuc": r(roc_auc_score(y_test, proba), 6),
                "ap": r(average_precision_score(y_test, proba), 6),
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp),
            }
        )
        fpr, tpr, _ = roc_curve(y_test, proba)
        p_curve, r_curve, _ = precision_recall_curve(y_test, proba)
        cur_roc[nom] = {"fpr": [r(v, 5) for v in fpr], "tpr": [r(v, 5) for v in tpr]}
        cur_pr[nom] = {"recall": [r(v, 5) for v in r_curve], "precision": [r(v, 5) for v in p_curve]}
        confusion[nom] = [[int(tn), int(fp)], [int(fn), int(tp)]]

    final_model = trained[selected_name]
    test_proba = predictions[selected_name]["proba"]
    test_pred = predictions[selected_name]["pred"]

    selected_metrics = {
        "accuracy": r(accuracy_score(y_test, test_pred), 6),
        "precision": r(precision_score(y_test, test_pred, zero_division=0), 6),
        "recall": r(recall_score(y_test, test_pred, zero_division=0), 6),
        "f1": r(f1_score(y_test, test_pred, zero_division=0), 6),
        "rocAuc": r(roc_auc_score(y_test, test_proba), 6),
        "ap": r(average_precision_score(y_test, test_proba), 6),
    }
    report = classification_report(y_test, test_pred, output_dict=True, zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y_test, test_pred, labels=[0, 1]).ravel()

    # --- Importance par permutation (5 répétitions, test) ---
    print("Importance par permutation...")
    imp = permutation_importance(
        final_model, X_test, y_test, n_repeats=5, scoring="average_precision", random_state=SEED, n_jobs=1
    )
    importance = [
        {"variable": FEATURE_LABELS.get(col, col), "mean": r(imp.importances_mean[i], 6), "std": r(imp.importances_std[i], 6)}
        for i, col in enumerate(X_test.columns)
    ]
    importance.sort(key=lambda x: x["mean"], reverse=True)

    # --- SHAP local : TP / FN / FP (comme dans le notebook) ---
    print("Explications SHAP locales...")
    preproc_final = final_model.named_steps["preprocess"]
    estimateur_final = final_model.named_steps["model"]
    X_train_trans = np.asarray(preproc_final.transform(X_train), dtype=float)
    X_test_trans = np.asarray(preproc_final.transform(X_test), dtype=float)
    noms_shap = list(preproc_final.get_feature_names_out())
    reel = np.asarray(y_test).astype(int)
    predit = np.asarray(test_pred).astype(int)
    cas = {
        "Panne correctement détectée (TP)": np.flatnonzero((reel == 1) & (predit == 1)),
        "Panne non détectée (FN)": np.flatnonzero((reel == 1) & (predit == 0)),
        "Fausse alerte (FP)": np.flatnonzero((reel == 0) & (predit == 1)),
    }
    indices, etiquettes = [], []
    for libelle, positions in cas.items():
        if len(positions):
            indices.append(int(positions[0]))
            etiquettes.append(libelle)
    rng = np.random.default_rng(SEED)
    positions_fond = rng.choice(len(X_train_trans), size=30, replace=False)
    fond = pd.DataFrame(X_train_trans[positions_fond], columns=noms_shap)
    exemples = pd.DataFrame(X_test_trans[indices], columns=noms_shap)

    def proba_shap(z):
        return estimateur_final.predict_proba(np.asarray(z, dtype=float))[:, 1]

    explainer = shap.Explainer(proba_shap, fond, algorithm="permutation")
    valeurs = explainer(exemples, max_evals=2 * exemples.shape[1] + 1)
    shap_rows = []
    for i, libelle in enumerate(etiquettes):
        contrib = [
            {"variable": noms_shap[j], "value": r(valeurs.values[i][j], 6)}
            for j in range(len(noms_shap))
        ]
        contrib.sort(key=lambda x: abs(x["value"]), reverse=True)
        shap_rows.append(
            {
                "case": libelle,
                "truth": int(reel[indices[i]]),
                "prediction": int(predit[indices[i]]),
                "probability": r(test_proba[indices[i]], 6),
                "contributions": contrib,
            }
        )

    # --- Table des prédictions réelles du test ---
    prediction_rows = []
    for pos, (idx, row) in enumerate(X_test.iterrows()):
        actual = int(y_test.iloc[pos])
        predicted = int(test_pred[pos])
        outcome = {(0, 0): "TN", (0, 1): "FP", (1, 0): "FN", (1, 1): "TP"}[(actual, predicted)]
        prediction_rows.append(
            {
                "id": int(df.loc[idx, "UDI"]),
                "productId": str(df.loc[idx, "Product ID"]),
                "type": str(row["Type"]),
                "air": r(row["Air temperature [K]"], 2),
                "process": r(row["Process temperature [K]"], 2),
                "speed": int(row["Rotational speed [rpm]"]),
                "torque": r(row["Torque [Nm]"], 2),
                "wear": int(row["Tool wear [min]"]),
                "delta": r(row["Delta temperature [K]"], 2),
                "power": r(row["Power proxy [W]"], 2),
                "actual": actual,
                "predicted": predicted,
                "probability": r(test_proba[pos], 6),
                "outcome": outcome,
            }
        )

    artefacts = {
        "meta": {
            "dataset": "ai4i2020.csv",
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "seed": SEED,
            "versions": {
                "pandas": pd.__version__,
                "scikit-learn": sklearn.__version__,
                "imbalanced-learn": imblearn.__version__,
                "xgboost": xgboost.__version__,
            },
            "threshold": 0.5,
        },
        "protocol": {
            "testSize": 0.2,
            "folds": N_FOLDS,
            "smote": {"k_neighbors": 3, "m_neighbors": 5},
            "models": [
                {"key": k, "label": MODEL_LABELS[k], "parameters": p}
                for k, p in {
                    "Logistic Regression": "max_iter=1500, solver LBFGS, random_state=42",
                    "SVM RBF": "C=1, kernel=rbf, gamma=scale, probability=True, random_state=42",
                    "Random Forest": "n_estimators=200, min_samples_leaf=2, n_jobs=-1, random_state=42",
                    "XGBoost": "n_estimators=200, max_depth=4, lr=0.05, subsample=0.9, colsample=0.9, random_state=42",
                    "MLP": "hidden_layer_sizes=(64,32), ReLU, Adam, max_iter=350, early_stopping, random_state=42",
                }.items()
            ],
        },
        "eda": build_eda(df),
        "split": {
            "train": {"rows": int(len(X_train)), "failures": int(y_train.sum()), "rate": r(float(y_train.mean()), 6)},
            "test": {"rows": int(len(X_test)), "failures": int(y_test.sum()), "rate": r(float(y_test.mean()), 6)},
            "afterSmote": {"rows": int(apres.sum()), "failures": int(apres.iloc[1]), "rate": 0.5},
            "equilibrage": equilibrage,
        },
        "cv": {
            "foldControl": control_folds,
            "summary": summary.to_dict(orient="records"),
            "perFold": cv_rows,
            "durations": {MODEL_LABELS[k]: r(v, 3) for k, v in cv_duree.items()},
        },
        "test": {
            "comparison": comparison,
            "confusion": {MODEL_LABELS[k]: v for k, v in confusion.items()},
            "curves": {MODEL_LABELS[k]: {"roc": cur_roc[k], "pr": cur_pr[k]} for k in models()},
        },
        "selected": {
            "model": selected_name,
            "label": MODEL_LABELS[selected_name],
            "cvF1Mean": r(float(summary.iloc[0]["F1-scoreMean"]), 6),
            "cvF1Std": r(float(summary.iloc[0]["F1-scoreStd"]), 6),
            "cvGap": r(float(summary.iloc[0]["F1-scoreMean"] - summary.iloc[1]["F1-scoreMean"]), 6),
            "metrics": selected_metrics,
            "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "classificationReport": {
                "normal": {k: r(v, 6) for k, v in report["0"].items()},
                "failure": {k: r(v, 6) for k, v in report["1"].items()},
                "macroAvg": {k: r(v, 6) for k, v in report["macro avg"].items()},
                "weightedAvg": {k: r(v, 6) for k, v in report["weighted avg"].items()},
                "accuracy": r(report["accuracy"], 6),
            },
        },
        "importance": importance,
        "shap": shap_rows,
        "predictions": prediction_rows,
    }

    (OUT / "analytics.json").write_text(json.dumps(artefacts, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    joblib.dump(final_model, OUT / "modele_retenu.joblib")
    print(f"Artifacts écrits dans {OUT} ({(OUT / 'analytics.json').stat().st_size / 1024:.0f} Ko)")


if __name__ == "__main__":
    main()
