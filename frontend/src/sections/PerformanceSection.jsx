import React from 'react'
import { CurveChart, HBar, VBar } from '../components/charts'
import { MiniBadge, Panel, SectionHeader, StatRow } from '../components/ui'
import { RED, NEUTRAL, fmt4, fmtPct, hexToRgba } from '../lib/chartSetup'

const COLORS = [RED, hexToRgba(RED, 0.55), hexToRgba(NEUTRAL, 0.62), hexToRgba(NEUTRAL, 0.38), hexToRgba(NEUTRAL, 0.2)]

export default function PerformanceSection({ data }) {
  const { test, selected, cv, split } = data
  const rows = test.comparison
  const colorFor = (label) => COLORS[rows.findIndex((r) => r.modelLabel === label)] || NEUTRAL
  const selectedRow = rows.find((r) => r.modelLabel === selected.label)
  const cm = selected.confusion
  const total = cm.tp + cm.fn + cm.fp + cm.tn

  const cvTestData = {
    labels: cv.summary.map((s) => s.modelLabel),
    datasets: [
      {
        label: 'F1 · validation croisée (train)',
        data: cv.summary.map((s) => s['F1-scoreMean']),
        backgroundColor: hexToRgba(RED, 0.4),
        borderRadius: 3,
      },
      {
        label: 'F1 · test',
        data: cv.summary.map((s) => rows.find((r) => r.modelLabel === s.modelLabel)?.f1 ?? 0),
        backgroundColor: RED,
        borderRadius: 3,
      },
    ],
  }

  const rocData = {
    datasets: rows.map((r) => ({
      label: `${r.modelLabel} (${fmt4(r.rocAuc)})`,
      data: test.curves[r.modelLabel].roc.fpr.map((x, i) => ({ x, y: test.curves[r.modelLabel].roc.tpr[i] })),
      borderColor: colorFor(r.modelLabel),
      backgroundColor: colorFor(r.modelLabel),
      borderWidth: r.modelLabel === selected.label ? 2.6 : 1.3,
      pointRadius: 0,
      tension: 0,
    })),
  }

  const prData = {
    datasets: rows.map((r) => ({
      label: `${r.modelLabel} (${fmt4(r.ap)})`,
      data: test.curves[r.modelLabel].pr.recall.map((x, i) => ({ x, y: test.curves[r.modelLabel].pr.precision[i] })),
      borderColor: colorFor(r.modelLabel),
      backgroundColor: colorFor(r.modelLabel),
      borderWidth: r.modelLabel === selected.label ? 2.6 : 1.3,
      pointRadius: 0,
      tension: 0,
    })),
  }

  return (
    <>
      <SectionHeader
        id="performance"
        index="05 / 08"
        eyebrow="Évaluation finale"
        title="Performances sur le jeu de test"
        description={`Les cinq modèles ont été entraînés sur le train rééquilibré puis évalués une seule fois sur ${split.test.rows.toLocaleString('fr-FR')} observations non rééquilibrées, dont ${split.test.failures} pannes. Seuil de décision : 0,5.`}
        right={<MiniBadge tone="red">MODÈLE RETENU · {selected.label.toUpperCase()}</MiniBadge>}
      />

      <Panel eyebrow="Comparaison des cinq modèles" title="Métriques calculées sur le test" className="mb-4">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Modèle</th><th>Accuracy</th><th>Précision</th><th>Rappel</th><th>F1</th><th>ROC-AUC</th><th>AP</th>
                <th>TP</th><th>FN</th><th>FP</th><th>TN</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model} className={r.modelLabel === selected.label ? 'row-selected' : ''}>
                  <td className="font-medium text-ink">{r.modelLabel}</td>
                  <td className="mono">{fmt4(r.accuracy)}</td>
                  <td className="mono">{fmt4(r.precision)}</td>
                  <td className="mono">{fmt4(r.recall)}</td>
                  <td className={`mono ${r.modelLabel === selected.label ? 'text-brand-deep' : ''}`}>{fmt4(r.f1)}</td>
                  <td className="mono">{fmt4(r.rocAuc)}</td>
                  <td className="mono">{fmt4(r.ap)}</td>
                  <td className="mono">{r.tp}</td><td className="mono">{r.fn}</td>
                  <td className="mono">{r.fp}</td><td className="mono">{r.tn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10.5px] text-ink/35">
          Meilleure AP : XGBoost — meilleur rappel : SVM RBF — meilleur F1, précision et ROC-AUC : forêt aléatoire. L'accuracy seule est trompeuse sur une classe à 3,4 %.
        </p>
      </Panel>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.05fr_1.3fr]">
        <Panel eyebrow="Cohérence CV ↔ test" title="F1 moyen et F1 final">
          <VBar
            height={285}
            data={cvTestData}
            options={{
              scales: { y: { beginAtZero: true, max: 1 }, x: { ticks: { font: { size: 9 }, maxRotation: 30, minRotation: 24 } } },
              plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'circle', color: 'rgba(17,17,17,0.6)', font: { size: 9.5 } } } },
            }}
          />
          <div className="mt-3 space-y-0.5">
            {cv.summary.map((s) => {
              const r = rows.find((x) => x.modelLabel === s.modelLabel)
              const gap = r.f1 - s['F1-scoreMean']
              return <StatRow key={s.model} label={s.modelLabel} value={`${gap >= 0 ? '+' : ''}${gap.toFixed(4)}`} />
            })}
          </div>
          <p className="mt-2 text-[10.5px] text-ink/35">Écart test − CV : tous dans l'écart-type de la CV, sauf la régression logistique.</p>
        </Panel>

        <Panel eyebrow="Courbes de discrimination" title="ROC et précision–rappel · cinq modèles">
          <div className="grid gap-3 lg:grid-cols-2">
            <CurveChart data={rocData} height={260} xLabel="Taux de faux positifs" yLabel="Taux de vrais positifs" />
            <CurveChart data={prData} height={260} xLabel="Rappel" yLabel="Précision" />
          </div>
          <p className="mt-2 text-[10.5px] text-ink/35">Courbes calculées sur les probabilités brutes des modèles, seuil non appliqué. Ligne diagonale de référence et prévalence implicite {fmtPct(split.test.rate)}.</p>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1.15fr_1fr]">
        <Panel eyebrow="Modèle retenu" title="Matrice de confusion" accent>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-1.5 text-center">
            <div />
            <div className="pb-1 text-[10px] uppercase tracking-wider text-ink/40">Prédit normal</div>
            <div className="pb-1 text-[10px] uppercase tracking-wider text-ink/40">Prédit panne</div>
            <div className="flex items-center justify-end pr-3 text-[10px] uppercase tracking-wider text-ink/40">Réel normal</div>
            <div className="panel-flat py-6">
              <div className="mono text-[25px] font-semibold text-ink">{cm.tn.toLocaleString('fr-FR')}</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-wider text-ink/35">TN</div>
            </div>
            <div className="rounded-lg border border-brand/35 bg-brand/10 py-6">
              <div className="mono text-[25px] font-semibold text-brand-deep">{cm.fp}</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-wider text-ink/45">FP · fausse alerte</div>
            </div>
            <div className="flex items-center justify-end pr-3 text-[10px] uppercase tracking-wider text-ink/40">Réel panne</div>
            <div className="rounded-lg border border-brand/35 bg-brand/[0.14] py-6">
              <div className="mono text-[25px] font-semibold text-brand-deep">{cm.fn}</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-wider text-ink/45">FN · panne manquée</div>
            </div>
            <div className="panel-flat py-6">
              <div className="mono text-[25px] font-semibold text-ink">{cm.tp}</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-wider text-ink/35">TP</div>
            </div>
          </div>
          <div className="mt-5 space-y-0.5">
            <StatRow label="Total évalué" value={total.toLocaleString('fr-FR')} />
            <StatRow label="Pannes détectées" value={`${cm.tp} / ${cm.tp + cm.fn}`} />
            <StatRow label="Alertes émises" value={`${cm.tp + cm.fp} (${cm.fp} injustifiées)`} />
          </div>
        </Panel>

        <Panel eyebrow="Indicateurs finaux" title="Performance du modèle sélectionné">
          <HBar
            height={250}
            data={{
              labels: ['Accuracy', 'Précision', 'Rappel', 'F1-score', 'ROC-AUC', 'Average Precision'],
              datasets: [{ data: Object.values(selected.metrics), backgroundColor: hexToRgba(RED, 0.78), borderRadius: 3, barPercentage: 0.6 }],
            }}
            options={{ scales: { x: { min: 0, max: 1 } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${fmt4(c.parsed.x)}` } } } }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <MiniBadge tone="red">F1 {fmt4(selectedRow?.f1 ?? selected.metrics.f1)}</MiniBadge>
            <MiniBadge>AP {fmt4(selected.metrics.ap)}</MiniBadge>
            <MiniBadge tone="dark">CV {fmt4(selected.cvF1Mean)} ± {fmt4(selected.cvF1Std)}</MiniBadge>
          </div>
        </Panel>

        <Panel eyebrow="Rapport de classification" title="Par classe · seuil 0,5">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Classe</th><th>Préc.</th><th>Rappel</th><th>F1</th><th>Support</th></tr></thead>
              <tbody>
                {[
                  ['Normal', selected.classificationReport.normal],
                  ['Défaillance', selected.classificationReport.failure],
                  ['Macro moy.', selected.classificationReport.macroAvg],
                  ['Pondérée', selected.classificationReport.weightedAvg],
                ].map(([label, r]) => (
                  <tr key={label}>
                    <td className="text-ink">{label}</td>
                    <td className="mono">{fmt4(r.precision)}</td>
                    <td className="mono">{fmt4(r.recall)}</td>
                    <td className="mono">{fmt4(r['f1-score'])}</td>
                    <td className="mono">{Math.round(r.support)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg border border-brand/25 bg-brand/[0.06] p-3 text-[11px] leading-relaxed text-ink/60">
            Bilan métier : <span className="mono text-ink">{cm.tp}</span> pannes détectées, <span className="mono text-brand-deep">{cm.fn}</span> manquées et <span className="mono text-brand-deep">{cm.fp}</span> fausses alertes sur {split.test.failures} défaillances réelles.
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Répartition des erreurs" title="Matrices de confusion des cinq modèles" className="mb-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {rows.map((r) => {
            const m = test.confusion[r.modelLabel]
            return (
              <div key={r.model} className={`panel-flat p-4 ${r.modelLabel === selected.label ? 'border-brand/40' : ''}`}>
                <div className="truncate text-[11px] font-semibold text-ink">{r.modelLabel}</div>
                <div className="mt-3 grid grid-cols-2 gap-1 text-center">
                  <div className="rounded bg-ink/[0.04] py-3"><div className="mono text-lg text-ink/80">{m[0][0]}</div><div className="text-[9px] text-ink/35">TN</div></div>
                  <div className="rounded bg-brand/10 py-3"><div className="mono text-lg text-brand-deep">{m[0][1]}</div><div className="text-[9px] text-ink/35">FP</div></div>
                  <div className="rounded bg-brand/[0.14] py-3"><div className="mono text-lg text-brand-deep">{m[1][0]}</div><div className="text-[9px] text-ink/35">FN</div></div>
                  <div className="rounded bg-ink/[0.04] py-3"><div className="mono text-lg text-ink/80">{m[1][1]}</div><div className="text-[9px] text-ink/35">TP</div></div>
                </div>
                <div className="mt-3 mono text-[10px] text-ink/40">F1 {fmt4(r.f1)} · FP {r.fp}</div>
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}
