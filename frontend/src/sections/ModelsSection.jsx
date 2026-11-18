import React, { useMemo, useState } from 'react'
import { HBar, LineChart, RadarChart, VBar } from '../components/charts'
import { MiniBadge, Panel, SectionHeader } from '../components/ui'
import { RED, RED_LIGHT, NEUTRAL, fmt4, hexToRgba } from '../lib/chartSetup'

const METRIC_KEYS = [
  { key: 'F1-score', label: 'F1-score' },
  { key: 'Recall', label: 'Rappel' },
  { key: 'Precision', label: 'Précision' },
  { key: 'ROC-AUC', label: 'ROC-AUC' },
]

export default function ModelsSection({ data }) {
  const { cv, selected } = data
  const [metric, setMetric] = useState('F1-score')
  const summary = cv.summary
  const palette = useMemo(() => {
    const colors = [RED, hexToRgba(RED, 0.55), hexToRgba(NEUTRAL, 0.62), hexToRgba(NEUTRAL, 0.38), hexToRgba(NEUTRAL, 0.2)]
    return Object.fromEntries(summary.map((s, i) => [s.model, s.model === selected.model ? RED : colors[i]]))
  }, [summary, selected.model])

  const metricLabel = METRIC_KEYS.find((m) => m.key === metric)?.label
  const meanKey = `${metric}Mean`
  const stdKey = `${metric}Std`
  const ordered = [...summary].sort((a, b) => b[meanKey] - a[meanKey])

  return (
    <>
      <SectionHeader
        id="models"
        index="04 / 08"
        eyebrow="Sélection des modèles"
        title="Validation croisée stratifiée · 5 folds"
        description="Les cinq modèles sont comparés sur le seul jeu d'entraînement. SVMSMOTE est réajusté dans chaque fold ; le jeu de test n'intervient à aucune étape de la sélection."
        right={<MiniBadge tone="red">SÉLECTION · F1 MOYEN CV</MiniBadge>}
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel
          eyebrow={`Score moyen ± écart-type · ${metricLabel}`}
          title="Classement en validation croisée"
          action={
            <div className="flex flex-wrap gap-1">
              {METRIC_KEYS.map((m) => (
                <button key={m.key} type="button" onClick={() => setMetric(m.key)} className={`tab ${metric === m.key ? 'active' : ''}`}>
                  {m.label}
                </button>
              ))}
            </div>
          }
        >
          <HBar
            height={280}
            data={{
              labels: ordered.map((s) => s.modelLabel),
              datasets: [
                {
                  data: ordered.map((s) => s[meanKey]),
                  backgroundColor: ordered.map((s) => (s.model === selected.model ? RED : hexToRgba(RED, 0.34))),
                  borderRadius: 3,
                  barPercentage: 0.62,
                },
              ],
            }}
            options={{
              scales: { x: { min: 0, max: 1.08 } },
              plugins: {
                errorBars: { values: ordered.map((s) => s[stdKey]), axis: 'x', color: 'rgba(17,17,17,0.5)' },
                tooltip: {
                  callbacks: {
                    label: (c) => ` ${fmt4(c.parsed.x)} ± ${fmt4(ordered[c.dataIndex][stdKey])}`,
                  },
                },
              },
            }}
          />
          <p className="mt-2 text-[10.5px] text-ink/35">Les barres d'erreur représentent l'écart-type corrigé entre les cinq folds (ddof = 1).</p>
        </Panel>

        <Panel eyebrow="Stabilité" title="F1-score fold par fold">
          <LineChart
            height={280}
            data={{
              labels: cv.foldControl.map((f) => `Fold ${f.fold}`),
              datasets: summary.map((s) => ({
                label: s.modelLabel,
                data: cv.perFold.filter((r) => r.model === s.model).sort((a, b) => a.fold - b.fold).map((r) => r['F1-score']),
                borderColor: palette[s.model],
                backgroundColor: palette[s.model],
                borderWidth: s.model === selected.model ? 3 : 1.4,
                pointRadius: s.model === selected.model ? 4 : 2.5,
                tension: 0.25,
              })),
            }}
            options={{ scales: { y: { min: 0.2, max: 0.9 } } }}
          />
          <p className="mt-2 text-[10.5px] text-ink/35">La forêt aléatoire domine quatre folds sur cinq ; XGBoost la devance au fold 2.</p>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1.05fr_1fr]">
        <Panel eyebrow="Profil multidimensionnel" title="Compromis des quatre métriques">
          <RadarChart
            height={300}
            data={{
              labels: METRIC_KEYS.map((m) => m.label),
              datasets: summary.map((s) => ({
                label: s.modelLabel,
                data: METRIC_KEYS.map((m) => s[`${m.key}Mean`]),
                borderColor: palette[s.model],
                backgroundColor: hexToRgba(s.model === selected.model ? RED : NEUTRAL, s.model === selected.model ? 0.16 : 0.035),
                borderWidth: s.model === selected.model ? 2.5 : 1.2,
                pointRadius: s.model === selected.model ? 3 : 0,
              })),
            }}
          />
        </Panel>

        <Panel eyebrow="Tableau comparatif" title="Moyennes ± écarts-types">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Modèle</th><th>F1</th><th>Rappel</th><th>Préc.</th><th>AUC</th></tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.model} className={s.model === selected.model ? 'row-selected' : ''}>
                    <td className="mono text-brand-deep">{s.rank}</td>
                    <td className="font-medium text-ink">{s.modelLabel}</td>
                    <td className="mono">{fmt4(s['F1-scoreMean'])}<span className="text-ink/30"> ±{fmt4(s['F1-scoreStd'])}</span></td>
                    <td className="mono">{fmt4(s['RecallMean'])}</td>
                    <td className="mono">{fmt4(s['PrecisionMean'])}</td>
                    <td className="mono">{fmt4(s['ROC-AUCMean'])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg border border-brand/25 bg-brand/[0.06] p-3 text-[11px] leading-relaxed text-ink/60">
            Écart F1 entre les deux premiers : <span className="mono text-brand-deep">{fmt4(selected.cvGap)}</span>, inférieur à l'écart-type du modèle retenu ({fmt4(selected.cvF1Std)}). La différence n'est donc pas nette.
          </div>
        </Panel>

        <Panel eyebrow="Coût de calcul" title="Temps de validation croisée">
          <VBar
            height={190}
            data={{
              labels: Object.keys(cv.durations),
              datasets: [{ data: Object.values(cv.durations), backgroundColor: hexToRgba(RED, 0.5), borderRadius: 3, barPercentage: 0.55 }],
            }}
            options={{ scales: { x: { ticks: { font: { size: 9 }, maxRotation: 35, minRotation: 28 } }, y: { beginAtZero: true, title: { display: true, text: 'secondes', color: 'rgba(17,17,17,0.4)', font: { size: 10 } } } } }}
          />
          <p className="mt-2 text-[10.5px] text-ink/35">Durées mesurées pendant l'entraînement, dépendantes de la machine.</p>
          <div className="mt-4">
            <div className="eyebrow-muted mb-2">Contrôle de stratification</div>
            <div className="overflow-x-auto">
              <table className="data-table text-[11px]">
                <thead><tr><th>Fold</th><th>Train</th><th>Val.</th><th>Pannes</th><th>Taux</th></tr></thead>
                <tbody>
                  {cv.foldControl.map((f) => (
                    <tr key={f.fold}>
                      <td className="mono">{f.fold}</td><td className="mono">{f.train}</td><td className="mono">{f.validation}</td>
                      <td className="mono">{f.failures}</td><td className="mono">{f.rate.toFixed(2)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Détail par fold" title="Scores des cinq métriques pour chaque modèle" className="mb-10">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Modèle</th><th>Fold</th>{METRIC_KEYS.map((m) => <th key={m.key}>{m.label}</th>)}</tr>
            </thead>
            <tbody>
              {cv.perFold.map((r) => (
                <tr key={`${r.model}-${r.fold}`} className={r.model === selected.model ? 'row-selected' : ''}>
                  <td>{r.modelLabel}</td>
                  <td className="mono">{r.fold}</td>
                  {METRIC_KEYS.map((m) => <td key={m.key} className="mono">{fmt4(r[m.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
