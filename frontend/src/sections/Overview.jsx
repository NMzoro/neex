import React from 'react'
import { KpiCard, MiniBadge, Panel, SectionHeader, StatRow } from '../components/ui'
import { fmt4, fmtPct } from '../lib/chartSetup'

const Icon = ({ path }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

const icons = {
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
  shield: <><path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  alert: <><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4M12 17h.01" /></>,
  pulse: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
}

export default function Overview({ data }) {
  const { eda, selected, meta, split, cv } = data
  const confusion = selected.confusion
  const detected = confusion.tp + confusion.fn
  const runnerUp = cv.summary[1]

  return (
    <>
      <SectionHeader
        id="overview"
        index="01 / 08"
        eyebrow="Vue d'ensemble opérationnelle"
        title="Supervision des défaillances machines"
        description="Tableau de bord construit exclusivement sur le jeu AI4I 2020 et sur les cinq modèles réentraînés selon le protocole du notebook. Aucune donnée saisie, aucune valeur simulée."
        right={
          <div className="flex flex-wrap gap-2">
            <MiniBadge tone="red">MODÈLE RETENU · {selected.label.toUpperCase()}</MiniBadge>
            <MiniBadge>SEED {meta.seed}</MiniBadge>
          </div>
        }
      />

      <div className="panel reveal relative mb-6 overflow-hidden px-6 py-7 md:px-9 md:py-9">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.55fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="live-dot" />
              <span className="eyebrow">Pipeline opérationnel · inférence automatique</span>
            </div>
            <h1 className="max-w-2xl text-[30px] font-bold leading-[1.18] tracking-tight text-ink md:text-[40px]">
              De la télémétrie brute à la <span className="text-brand-deep">décision de maintenance</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-ink/50">
              {eda.rows.toLocaleString('fr-FR')} cycles machine, {eda.columns} variables sources, huit variables explicatives après ingénierie physique. Le pipeline complet — imputation, standardisation, encodage, SVMSMOTE et {selected.label} — est chargé depuis l'artefact entraîné et sert l'ensemble des prédictions de l'interface.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip chip-red"><Icon path={icons.pulse} /> {fmtPct(eda.target.rate)} de pannes</span>
              <span className="chip"><Icon path={icons.layers} /> CV stratifiée {cv.foldControl.length} folds</span>
              <span className="chip"><Icon path={icons.shield} /> Seuil de décision {meta.threshold.toFixed(2)}</span>
            </div>
          </div>

          <div className="panel panel-accent self-stretch bg-ink/[0.04] p-5">
            <div className="eyebrow mb-4">Modèle sélectionné en validation croisée</div>
            <div className="text-[22px] font-semibold tracking-tight text-ink">{selected.label}</div>
            <p className="mt-1 text-[11px] text-ink/40">Sélection sur le train uniquement — le test n'a pas participé au choix.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="panel-flat p-3">
                <div className="mono text-[19px] font-semibold text-ink">{fmt4(selected.cvF1Mean)}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-ink/40">F1 CV ± {fmt4(selected.cvF1Std)}</div>
              </div>
              <div className="panel-flat p-3">
                <div className="mono text-[19px] font-semibold text-brand-deep">{fmt4(selected.metrics.f1)}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-ink/40">F1 sur le test</div>
              </div>
            </div>
            <div className="mt-3">
              <StatRow label="Écart F1 avec le 2ᵉ modèle (CV)" value={fmt4(selected.cvGap)} />
              <StatRow label="ROC-AUC / Average Precision" value={`${fmt4(selected.metrics.rocAuc)} / ${fmt4(selected.metrics.ap)}`} />
              <StatRow label="Observations de notation" value={split.test.rows.toLocaleString('fr-FR')} />
            </div>
            {runnerUp && (
              <p className="mt-3 text-[10.5px] leading-relaxed text-ink/35">
                Écart plus faible qu'un écart-type : {runnerUp.label} reste une alternative crédible.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Taux de défaillance"
          value={(eda.target.rate * 100).toFixed(2)}
          suffix="%"
          caption={`${eda.target.failure} pannes sur ${eda.rows.toLocaleString('fr-FR')} cycles`}
          progress={eda.target.rate * 8}
          icon={<Icon path={icons.target} />}
        />
        <KpiCard
          label="Pannes détectées"
          value={`${confusion.tp}/${detected}`}
          caption={`Rappel ${fmtPct(selected.metrics.recall)} · ${confusion.fn} défaillances manquées`}
          progress={selected.metrics.recall}
          icon={<Icon path={icons.pulse} />}
          highlight
        />
        <KpiCard
          label="F1-score (test)"
          value={fmt4(selected.metrics.f1)}
          caption={`Précision ${fmt4(selected.metrics.precision)} · seuil ${meta.threshold.toFixed(2)}`}
          progress={selected.metrics.f1}
          icon={<Icon path={icons.shield} />}
        />
        <KpiCard
          label="ROC-AUC"
          value={fmt4(selected.metrics.rocAuc)}
          caption={`AP ${fmt4(selected.metrics.ap)} sur le jeu non rééquilibré`}
          progress={selected.metrics.rocAuc}
          icon={<Icon path={icons.layers} />}
        />
        <KpiCard
          label="Fausses alertes"
          value={confusion.fp}
          caption={`${confusion.tn} machines saines correctement classées`}
          progress={confusion.fp / (confusion.fp + confusion.tn)}
          icon={<Icon path={icons.alert} />}
        />
      </div>

      <Panel eyebrow="Traçabilité" title="Chaîne de valeurs du prototype" className="mb-10">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Source', `${meta.dataset} · ${eda.rows.toLocaleString('fr-FR')} lignes`],
            ['Préparation', '8 variables · 2 grandeurs dérivées · one-hot Type'],
            ['Apprentissage', 'Train 8 000 · SVMSMOTE 15 458 · CV 5 folds'],
            ['Évaluation', `Test ${split.test.rows.toLocaleString('fr-FR')} · ${split.test.failures} pannes · seuil 0,5`],
          ].map(([label, value], i) => (
            <div key={label} className="panel-flat p-4">
              <div className="mono text-[10px] text-brand-deep">0{i + 1} · {label.toUpperCase()}</div>
              <div className="mt-2 text-[11.5px] leading-relaxed text-ink/65">{value}</div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
