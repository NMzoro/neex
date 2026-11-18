import React, { useMemo, useState } from 'react'
import { HBar, ScatterChart, DoughnutChart, VBar } from '../components/charts'
import { Heatmap, MiniBadge, Panel, SectionHeader, StatRow, Tabs } from '../components/ui'
import { GREY_DARK, RED, RED_LIGHT, NEUTRAL, hexToRgba } from '../lib/chartSetup'

export default function DataSection({ data }) {
  const { eda, split, meta } = data
  const histNames = Object.keys(eda.histograms)
  const [histName, setHistName] = useState(histNames[3])
  const [scatterClass, setScatterClass] = useState('both')

  const hist = eda.histograms[histName]
  const histData = useMemo(
    () => ({
      labels: hist.binEdges.slice(0, -1).map((v, i) => `${Math.round(v)}`),
      datasets: [
        { label: 'Normal', data: hist.normal, backgroundColor: hexToRgba(NEUTRAL, 0.17), borderRadius: 1, stack: 'a' },
        { label: 'Défaillance', data: hist.failure, backgroundColor: RED, borderRadius: 1, stack: 'a' },
      ],
    }),
    [hist],
  )

  const boxData = useMemo(() => {
    const names = Object.keys(eda.boxStats)
    return {
      labels: names,
      datasets: [
        {
          label: 'Min – Max (hors outliers)',
          data: names.map((n) => [eda.boxStats[n].normal.min, eda.boxStats[n].normal.max]),
          backgroundColor: hexToRgba(NEUTRAL, 0.09),
          borderColor: hexToRgba(NEUTRAL, 0.2),
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.55,
        },
        {
          label: 'Q1 – Q3 (classe normale)',
          data: names.map((n) => [eda.boxStats[n].normal.q1, eda.boxStats[n].normal.q3]),
          backgroundColor: hexToRgba(RED, 0.75),
          borderColor: RED_LIGHT,
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.42,
        },
      ],
    }
  }, [eda.boxStats])

  const scatterData = useMemo(() => {
    const { speed, torque, failure } = eda.scatter
    const sets = [
      {
        label: 'Normal',
        data: speed.map((s, i) => ({ x: s, y: torque[i] })).filter((_, i) => scatterClass !== 'failure' && failure[i] === 0),
        backgroundColor: hexToRgba(NEUTRAL, 0.16),
        pointRadius: 1.5,
        pointHoverRadius: 4,
      },
      {
        label: 'Défaillance',
        data: speed.map((s, i) => ({ x: s, y: torque[i] })).filter((_, i) => scatterClass !== 'normal' && failure[i] === 1),
        backgroundColor: hexToRgba(RED, 0.85),
        pointRadius: 2.4,
        pointHoverRadius: 5,
      },
    ]
    return { datasets: sets }
  }, [eda.scatter, scatterClass])

  return (
    <>
      <SectionHeader
        id="data"
        index="02 / 08"
        eyebrow="Données réelles · analyse exploratoire"
        title="Compréhension du jeu AI4I 2020"
        description="Statistiques calculées directement sur les 10 000 observations du fichier source. Les valeurs extrêmes sont conservées : elles portent une part du signal de défaillance."
        right={<MiniBadge tone="red">{eda.rows.toLocaleString('fr-FR')} × {eda.columns} COLONNES</MiniBadge>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Observations', eda.rows.toLocaleString('fr-FR')],
          ['Variables sources', eda.columns],
          ['Valeurs manquantes', eda.missing],
          ['Doublons exacts', eda.duplicates],
          ['Divergences d’étiquette', eda.labelConsistency.mismatch],
        ].map(([label, value]) => (
          <div key={label} className="panel-flat flex items-center justify-between px-4 py-3">
            <span className="text-[11px] text-ink/45">{label}</span>
            <span className="mono text-[15px] font-semibold text-ink">{value}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Panel eyebrow="Variable cible" title="Répartition des cycles" accent>
          <DoughnutChart
            data={{
              labels: ['Normal', 'Défaillance'],
              datasets: [
                {
                  data: [eda.target.normal, eda.target.failure],
                  backgroundColor: [hexToRgba(NEUTRAL, 0.14), RED],
                  borderColor: ['rgba(17,17,17,0.12)', RED_LIGHT],
                  borderWidth: 1,
                  hoverOffset: 6,
                },
              ],
            }}
            options={{
              plugins: {
                tooltip: {
                  callbacks: { label: (c) => ` ${c.label} : ${c.parsed.toLocaleString('fr-FR')} (${((c.parsed / eda.rows) * 100).toFixed(2)} %)` },
                },
              },
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="panel-flat py-2">
              <div className="mono text-sm text-ink">{eda.target.normal.toLocaleString('fr-FR')}</div>
              <div className="text-[10px] text-ink/40">normaux</div>
            </div>
            <div className="panel-flat py-2">
              <div className="mono text-sm text-brand-deep">{eda.target.failure}</div>
              <div className="text-[10px] text-ink/40">pannes</div>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Modes de défaillance" title="Occurrences par mode physique">
          <HBar
            height={230}
            data={{
              labels: eda.modes.map((m) => `${m.code} · ${m.label}`),
              datasets: [
                {
                  data: eda.modes.map((m) => m.count),
                  backgroundColor: eda.modes.map((m) => (m.code === 'RNF' ? hexToRgba(RED, 0.42) : RED)),
                  borderRadius: 3,
                  barPercentage: 0.7,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (c) => ` ${c.parsed.x} occurrences · ${((c.parsed.x / eda.target.failure) * 100).toFixed(1)} % des pannes`,
                  },
                },
              },
            }}
          />
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink/35">
            Les parts peuvent dépasser 100 % : plusieurs modes peuvent être actifs sur un même cycle. RNF est aléatoire et irréductible.
          </p>
        </Panel>

        <Panel eyebrow="Type de produit" title="Taux de défaillance par gamme">
          <VBar
            height={230}
            data={{
              labels: eda.types.map((t) => `Type ${t.type}`),
              datasets: [
                {
                  data: eda.types.map((t) => t.rate * 100),
                  backgroundColor: [RED, hexToRgba(RED, 0.68), hexToRgba(RED, 0.35)],
                  borderRadius: 3,
                  barPercentage: 0.55,
                },
              ],
            }}
            options={{
              scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${v} %` } } },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (c) => ` ${c.parsed.y.toFixed(2)} % · ${eda.types[c.dataIndex].failures}/${eda.types[c.dataIndex].count} pannes`,
                  },
                },
              },
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {eda.types.map((t) => (
              <MiniBadge key={t.type}>{t.type} · {t.count.toLocaleString('fr-FR')}</MiniBadge>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          eyebrow="Analyse univariée"
          title="Distribution des mesures selon l'état machine"
          action={<Tabs options={histNames} value={histName} onChange={setHistName} />}
        >
          <VBar
            height={280}
            data={histData}
            options={{
              scales: {
                x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 9 } } },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Effectif', color: 'rgba(17,17,17,0.4)', font: { size: 10 } } },
              },
              plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'circle', color: 'rgba(17,17,17,0.6)' } } },
            }}
          />
          <p className="mt-2 text-[10.5px] text-ink/35">Histogramme empilé sur les valeurs réelles — abscisses en unités de la variable.</p>
        </Panel>

        <Panel eyebrow="Dispersion" title="Boîtes à moustaches · classe normale">
          <HBar
            height={280}
            data={boxData}
            options={{
              indexAxis: 'y',
              scales: { x: { beginAtZero: false }, y: { grid: { display: false }, ticks: { font: { size: 9.5 } } } },
              plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'rect', color: 'rgba(17,17,17,0.55)', font: { size: 9 } } } },
            }}
          />
          <p className="mt-2 text-[10.5px] text-ink/35">Barres grises : min–max hors outliers · barres rouges : Q1–Q3.</p>
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Panel
          eyebrow="Analyse bivariée"
          title="Couple / vitesse de rotation"
          action={<Tabs options={[{ value: 'both', label: 'Toutes' }, { value: 'failure', label: 'Pannes' }, { value: 'normal', label: 'Normal' }]} value={scatterClass} onChange={setScatterClass} />}
        >
          <ScatterChart data={scatterData} height={330} />
          <p className="mt-2 text-[10.5px] text-ink/35">
            {eda.scatter.speed.length.toLocaleString('fr-FR')} points réels. Les défaillances se concentrent aux extrémités du domaine de fonctionnement.
          </p>
        </Panel>

        <Panel eyebrow="Analyse multivariée" title="Matrice de corrélation (Pearson)">
          <Heatmap labelsX={eda.correlation.labels} labelsY={eda.correlation.labels} matrix={eda.correlation.matrix} />
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink/35">
            Températures air/procédé : +0,88 · vitesse/couple : −0,88. Ces corrélations expliquent la création de l'écart thermique et de la puissance approchée.
          </p>
        </Panel>
      </div>

      <div className="mb-10 grid gap-4 xl:grid-cols-2">
        <Panel eyebrow="Usure × type" title="Taux de défaillance par quartile d'usure">
          <div className="overflow-auto">
            <div className="min-w-[520px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${eda.wearQuartile.quartiles.length}, 1fr)` }}>
                <div />
                {eda.wearQuartile.quartiles.map((q) => (
                  <div key={q} className="pb-1 text-center mono text-[9px] text-ink/40" title={q}>{q.replace(/\s*min.*/, '').slice(0, 24)}</div>
                ))}
                {eda.wearQuartile.rates.map((row, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center text-[11px] text-ink/60">Type {eda.wearQuartile.types[i]}</div>
                    {row.map((v, j) => (
                      <div
                        key={j}
                        title={`${(v * 100).toFixed(2)} %`}
                        className="heat-cell flex h-10 items-center justify-center rounded-[4px] mono text-[10px] text-ink"
                        style={{ background: `rgba(220,2,2,${0.07 + Math.min(1, v / 0.1) * 0.85})` }}
                      >
                        {(v * 100).toFixed(1)} %
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10.5px] text-ink/35">Quartiles calculés par pd.qcut sur l'usure outil, comme dans le notebook.</p>
        </Panel>

        <Panel eyebrow="Qualité de l'étiquetage" title="Cohérence cible / modes de défaillance">
          <StatRow label="Cible = 0 · aucun mode actif" value="9 643" />
          <StatRow label="Cible = 1 · aucun mode actif" value={eda.labelConsistency.withModeZeroTargetOne} />
          <StatRow label="Cible = 0 · au moins un mode actif" value={eda.labelConsistency.withModeOneTargetZero} />
          <StatRow label="Cible = 1 · au moins un mode actif" value={eda.target.failure - eda.labelConsistency.withModeZeroTargetOne} />
          <StatRow label="Divergences totales" value={`${eda.labelConsistency.mismatch} (${(eda.labelConsistency.rate * 100).toFixed(2)} %)`} />
          <div className="mt-4 rounded-lg border border-brand/25 bg-brand/[0.07] p-3 text-[11px] leading-relaxed text-ink/60">
            La cible d'origine est conservée sans reconstruction. Les modes ne sont jamais utilisés comme prédicteurs : ils ne sont connus qu'après la défaillance et introduiraient une fuite de données.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <MiniBadge tone="dark">TRAIN {split.train.rows.toLocaleString('fr-FR')} · {split.train.failures} pannes</MiniBadge>
            <MiniBadge>TEST {split.test.rows.toLocaleString('fr-FR')} · {split.test.failures} pannes</MiniBadge>
          </div>
        </Panel>
      </div>
    </>
  )
}
