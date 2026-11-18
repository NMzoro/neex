# AI4I Ops — tableau de bord de maintenance prédictive

Application full-stack construite à partir du rapport `Memoire_Maintenance_Predictive_MAJ.md`, du jeu de données réel `ai4i2020.csv` et du notebook `soutenance_finalise_cv.ipynb`.

> Les fichiers `.md` et `.docx` du rapport n'ont pas été modifiés.

## Principe

Aucune donnée fictive, aucune valeur figée dans le frontend. Tout est calculé :

1. `backend/train_artifacts.py` rejoue exactement le protocole du notebook sur `ai4i2020.csv` :
   - 8 variables explicatives (5 mesures + écart thermique ΔT + puissance approchée + Type) ;
   - split stratifié 80/20, graine 42 ;
   - pipeline imputation → StandardScaler → OneHotEncoder → **SVMSMOTE** (`k=3`, `m=5`, train uniquement) ;
   - validation croisée stratifiée 5 folds sur le train pour sélectionner le modèle ;
   - entraînement final des 5 modèles et évaluation unique sur le test non rééquilibré, seuil 0,5 ;
   - importance par permutation (5 répétitions), explications SHAP locales, courbes ROC/PR et 2 000 prédictions réelles.
2. Les résultats sont exportés dans `backend/artifacts/analytics.json` et le pipeline retenu dans `backend/artifacts/modele_retenu.joblib`.
3. L'API FastAPI sert ces artefacts et utilise le joblib pour les inférences du flux de supervision.
4. Le frontend React consomme exclusivement l'API via `/api/bootstrap`, puis `/api/supervision/feed` et `/api/predictions`.

Résultat reproduit à l'identique : **Forêt aléatoire**, F1 CV `0,7870 ± 0,0491`, F1 test `0,8235`, ROC-AUC `0,9741`, accuracy `0,9880`, 56 TP / 12 FN / 12 FP / 1 920 TN.

## Démarrage

### 1. Backend

```powershell
python -m pip install -r backend/requirements.txt
python backend/train_artifacts.py          # facultatif si artifacts/ existe déjà
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

L'API est alors disponible sur `http://localhost:8000/docs`. Si les artifacts sont absents, l'API déclenche automatiquement l'entraînement au démarrage.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev                                 # http://localhost:5173
```

Le serveur Vite proxifie `/api` vers `http://127.0.0.1:8000`.

### 3. Mode production (un seul serveur)

```powershell
cd frontend
npm run build
cd ..
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

L'interface est alors servie directement sur `http://localhost:8000`.

## Structure

```
ai4i2020.csv                      jeu de données source (non modifié)
backend/
  train_artifacts.py              reproduction du notebook → artifacts
  main.py                         API FastAPI + inférences joblib
  requirements.txt
  artifacts/                      généré (analytics.json + modèle joblib)
frontend/
  src/App.jsx                     coque applicative + navigation
  src/api.js                      couche d'appel API
  src/components/                 composants UI et wrappers Chart.js
  src/hooks/useReveal.js          animations d'entrée
  src/lib/chartSetup.js           thème Chart.js + plugin barres d'erreur
  src/sections/                   huit sections fonctionnelles
  dist/                           build de production (généré)
```

## Endpoints principaux

| Route | Contenu |
|---|---|
| `GET /api/health` | état de l'API, modèle chargé, versions |
| `GET /api/bootstrap` | l'ensemble des données réelles en une requête |
| `GET /api/eda` | statistiques, histogrammes, corrélations, nuage couple/vitesse |
| `GET /api/cv` | scores par fold, moyennes/écarts-types, contrôle de stratification |
| `GET /api/test` | métriques, matrices et courbes des cinq modèles |
| `GET /api/importance` | importance par permutation |
| `GET /api/explanations` | cas SHAP TP / FN / FP |
| `GET /api/predictions` | 2 000 prédictions réelles, filtrables et paginées |
| `GET /api/supervision/feed` | inférence joblib sur une fenêtre d'observations du test |

Aucune route ne prend de valeur saisie : le flux de supervision parcourt automatiquement les observations existantes du jeu de test.
