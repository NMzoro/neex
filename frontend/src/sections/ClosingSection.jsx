import React from 'react'
import { MiniBadge, Panel, SectionHeader } from '../components/ui'

const LIMITS = [
  ['Nature des données', 'Jeu synthétique UCI AI4I 2020 : les performances mesurent une méthode sur un jeu de référence, pas un comportement atelier.'],
  ['Étiquetage', '27 divergences entre la cible globale et les modes de défaillance sont conservées telles quelles, sans reconstruction.'],
  ['Échantillonnage', '68 pannes dans le test : un cas représente environ 1,5 point de rappel. Un seul découpage train/test est utilisé.'],
  ['Sélection', 'Écart de F1 de 0,0164 avec XGBoost en CV, inférieur à l’écart-type : les deux modèles ne sont pas nettement départagés.'],
  ['Décision', 'Seuil fixé à 0,5, probabilités non calibrées, aucune matrice de coût : le compromis FN/FP n’est pas optimisé.'],
  ['Portée', 'Classification binaire, non prédiction temporelle : aucune durée de vie restante ni date de panne n’est inférée.'],
]

export default function ClosingSection({ data }) {
  const { meta, selected, split } = data
  return (
    <>
      <SectionHeader
        id="limits"
        index="08 / 08"
        eyebrow="Discussion & limites"
        title="Lecture critique des résultats"
        description="Le prototype est reproductible et cohérent avec le protocole du mémoire. Sa transposition industrielle exige des données réelles, un seuil métier et une validation externe."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {LIMITS.map(([title, text], i) => (
          <div key={title} className="panel reveal p-5">
            <div className="mono text-[10px] text-brand-deep">0{i + 1} · {title.toUpperCase()}</div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink/50">{text}</p>
          </div>
        ))}
      </div>

      <Panel eyebrow="Pistes d'amélioration" title="Industrialisation et perspectives" className="mb-10">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Acquisition réelle', 'Capteurs, historical de maintenance et étiquettes validées sur site pour réentraîner et recalibrer le modèle.'],
            ['Optimisation', 'Recherche d’hyperparamètres, calibration des probabilités, seuil métier et validation répétée sur plusieurs jeux indépendants.'],
            ['MLOps', 'Versioning des données et des modèles, surveillance de dérive, intégration au workflow de maintenance.'],
          ].map(([title, text]) => (
            <div key={title} className="panel-flat p-4">
              <div className="text-[12px] font-semibold text-ink">{title}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink/45">{text}</p>
            </div>
          ))}
        </div>
      </Panel>

      <footer className="panel reveal px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Traçabilité de la session</div>
            <div className="text-[11.5px] text-ink/55">
              Jeu <span className="mono text-ink">{meta.dataset}</span> · {data.eda.rows.toLocaleString('fr-FR')} observations · généré le <span className="mono text-ink">{meta.generatedAt}</span> · pipeline <span className="mono text-ink">{selected.label}</span>
            </div>
            <div className="mt-1 text-[10.5px] text-ink/35">
              Versions : {Object.entries(meta.versions).map(([k, v]) => `${k} ${v}`).join(' · ')}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <MiniBadge tone="dark">TEST {split.test.rows.toLocaleString('fr-FR')} OBS.</MiniBadge>
            <MiniBadge tone="red">SEUIL {meta.threshold.toFixed(2)}</MiniBadge>
            <MiniBadge tone="dark">PROTOTYPE MÉTHODOLOGIQUE</MiniBadge>
          </div>
        </div>
      </footer>
    </>
  )
}
