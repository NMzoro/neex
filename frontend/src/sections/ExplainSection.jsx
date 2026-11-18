import React, { useMemo, useState } from 'react'
import { HBar } from '../components/charts'
import { MiniBadge, Panel, SectionHeader, StatRow, Tabs } from '../components/ui'
import { RED, fmt4, hexToRgba } from '../lib/chartSetup'

const cleanName = (name) => name.replace(/^num__|^cat__/, '').replace(/_[LMH]$/, '')

export default function ExplainSection({ data }) {
  const { importance, shap, predictions, selected } = data
  const [caseIndex, setCaseIndex] = useState(0)
  const current = shap[caseIndex] || shap[0]
  const failures = useMemo(() => predictions.filter((r) => r.outcome === 'FN').slice(0, 4), [predictions])
  const falseAlarms = useMemo(() => predictions.filter((r) => r.outcome === 'FP').slice(0, 4), [predictions])

  const shapData = useMemo(() => {
    const sorted = [...current.contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    return {
      labels: sorted.map((c) => cleanName(c.variable)),
      datasets: [
        {
          data: sorted.map((c) => c.value),
          backgroundColor: sorted.map((c) => (c.value >= 0 ? RED : hexToRgba(RED, 0.28))),
          borderRadius: 2,
          barPercentage: 0.68,
        },
      ],
    }
  }, [current])

  return (
    <>
      <SectionHeader
        id="explain"
        index="07 / 08"
        eyebrow="Interprétabilité"
        title="Ce qui pilote la décision"
        description="Importance par permutation sur le jeu de test (5 répétitions, graine 42) et explications SHAP locales du modèle retenu pour un vrai positif, une panne manquée et une fausse alerte."
        right={<MiniBadge tone="red">SHAP · PERMUTATION EXPLAINER</MiniBadge>}
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Panel eyebrow="Importance globale" title="Baisse moyenne de l'Average Precision">
          <HBar
            height={310}
            data={{
              labels: importance.map((i) => i.variable),
              datasets: [{ data: importance.map((i) => i.mean), backgroundColor: hexToRgba(RED, 0.78), borderRadius: 3, barPercentage: 0.65 }],
            }}
            options={{
              scales: { x: { min: -0.02, max: 0.48 }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } },
              plugins: {
                errorBars: { values: importance.map((i) => i.std), axis: 'x', color: 'rgba(17,17,17,0.45)' },
                tooltip: { callbacks: { label: (c) => ` ΔAP ${fmt4(c.parsed.x)} ± ${fmt4(importance[c.dataIndex].std)}` } },
              },
            }}
          />
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink/35">
            La vitesse domine largement, devant l'écart thermique et l'usure. La température procédé présente une contribution moyenne légèrement négative : son information est masquée par ΔT.
          </p>
        </Panel>

        <Panel eyebrow="Explication locale" title="Contributions SHAP des cas sélectionnés" accent>
          <div className="mb-3">
            <Tabs
              options={shap.map((s, i) => ({ value: i, label: s.case.split('(')[1]?.replace(')', '') || `Cas ${i + 1}` }))}
              value={caseIndex}
              onChange={setCaseIndex}
            />
          </div>
          <HBar
            height={250}
            data={shapData}
            options={{
              scales: { x: { min: -0.12, max: 0.42 }, y: { grid: { display: false }, ticks: { font: { size: 9.5 } } } },
              plugins: {
                tooltip: { callbacks: { label: (c) => ` contribution SHAP : ${fmt4(c.parsed.x)}` } },
              },
            }}
          />
          <div className="mt-3 space-y-0.5">
            <StatRow label="Cas analysé" value={current.case} mono={false} />
            <StatRow label="Vérité / prédiction" value={`${current.truth} / ${current.prediction}`} />
            <StatRow label="Probabilité de panne" value={fmt4(current.probability)} />
          </div>
        </Panel>
      </div>

      <div className="mb-10 grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Pannes manquées" title="Observations réellement manquées par le modèle" action={<MiniBadge>{predictions.filter((r) => r.outcome === 'FN').length} FN</MiniBadge>}>
          <div className="overflow-x-auto">
            <table className="data-table text-[11px]">
              <thead><tr><th>UDI</th><th>Type</th><th>Vitesse</th><th>Couple</th><th>Usure</th><th>ΔT</th><th>P(panne)</th></tr></thead>
              <tbody>
                {failures.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td><td>{r.type}</td><td className="mono">{r.speed}</td><td className="mono">{r.torque}</td>
                    <td className="mono">{r.wear}</td><td className="mono">{r.delta}</td><td className="mono text-brand-deep">{fmt4(r.probability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink/35">
            Aucune signature unique : certaines défaillances surviennent dans des conditions proches du fonctionnement normal, notamment les pannes aléatoires (RNF).
          </p>
        </Panel>

        <Panel eyebrow="Fausses alertes" title="Observations saines classées en panne" action={<MiniBadge>{predictions.filter((r) => r.outcome === 'FP').length} FP</MiniBadge>}>
          <div className="overflow-x-auto">
            <table className="data-table text-[11px]">
              <thead><tr><th>UDI</th><th>Type</th><th>Vitesse</th><th>Couple</th><th>Usure</th><th>ΔT</th><th>P(panne)</th></tr></thead>
              <tbody>
                {falseAlarms.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td><td>{r.type}</td><td className="mono">{r.speed}</td><td className="mono">{r.torque}</td>
                    <td className="mono">{r.wear}</td><td className="mono">{r.delta}</td><td className="mono text-brand-deep">{fmt4(r.probability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink/35">
            Ces conditions de charge, d'usure ou de vitesse s'écartent du régime habituel : l'alerte peut révéler un précurseur non déclaré dans l'étiquette synthétique.
          </p>
        </Panel>
      </div>
    </>
  )
}
