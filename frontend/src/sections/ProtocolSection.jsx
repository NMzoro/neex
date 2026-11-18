import React from 'react'
import { VBar, DoughnutChart } from '../components/charts'
import { MiniBadge, Panel, SectionHeader, StatRow } from '../components/ui'
import { RED, hexToRgba } from '../lib/chartSetup'

const STEPS = [
  {
    n: '01',
    title: 'Sélection des variables',
    detail: 'Exclusion de UDI, Product ID et des cinq indicateurs de mode (TWF, HDF, PWF, OSF, RNF) pour éviter toute fuite de la cible.',
  },
  {
    n: '02',
    title: 'Variables dérivées',
    detail: 'ΔT = T_procédé − T_air et puissance approchée = τ × N × 2π / 60, sans utiliser la cible.',
  },
  {
    n: '03',
    title: 'Découpage stratifié',
    detail: '80 % train / 20 % test, stratification sur Machine failure, graine 42, avant tout ajustement.',
  },
  {
    n: '04',
    title: 'Pipeline de prétraitement',
    detail: 'Imputation médiane (numériques), imputation par modalité fréquente (Type), StandardScaler, OneHotEncoder(handle_unknown="ignore").',
  },
  {
    n: '05',
    title: 'Rééquilibrage SVMSMOTE',
    detail: 'k_neighbors=3, m_neighbors=5, intégré au pipeline et ajusté uniquement sur le train ou sur chaque fold d’apprentissage.',
  },
  {
    n: '06',
    title: 'Modélisation & évaluation',
    detail: 'Cinq algorithmes, CV stratifiée 5 folds sur le train pour la sélection, puis évaluation unique sur le test au seuil 0,5.',
  },
]

export default function ProtocolSection({ data }) {
  const { split, protocol, cv, meta, selected } = data
  const eq = split.equilibrage

  return (
    <>
      <SectionHeader
        id="protocol"
        index="03 / 08"
        eyebrow="Chaîne de traitement"
        title="Préparation sans fuite de données"
        description="Le protocole suit la démarche CRISP-DM. Chaque transformation apprenant des paramètres est ajustée sur le seul jeu d'entraînement, à l'intérieur du pipeline."
        right={<MiniBadge tone="red">GRAINE {meta.seed} · SEUIL {meta.threshold.toFixed(2)}</MiniBadge>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="panel reveal p-5">
            <div className="flex items-center gap-3">
              <span className="mono text-[11px] font-semibold text-brand-deep">{step.n}</span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>
            <h3 className="mt-4 text-[13px] font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink/45">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <Panel eyebrow="Découpage" title="Composition des jeux">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <DoughnutChart
                height={170}
                data={{
                  labels: ['Train', 'Test'],
                  datasets: [{ data: [split.train.rows, split.test.rows], backgroundColor: [RED, hexToRgba(RED, 0.3)], borderWidth: 0 }],
                }}
                options={{ cutout: '72%', plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'circle', color: 'rgba(17,17,17,0.6)' } } } }}
              />
            </div>
            <div className="space-y-2 pt-2">
              <StatRow label="Train" value={split.train.rows.toLocaleString('fr-FR')} />
              <StatRow label="Pannes train" value={`${split.train.failures} (${(split.train.rate * 100).toFixed(2)} %)`} />
              <StatRow label="Test" value={split.test.rows.toLocaleString('fr-FR')} />
              <StatRow label="Pannes test" value={`${split.test.failures} (${(split.test.rate * 100).toFixed(2)} %)`} />
            </div>
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink/35">Le test reste intact : jamais rééchantillonné, jamais utilisé pour choisir le modèle.</p>
        </Panel>

        <Panel eyebrow="SVMSMOTE" title="Train avant / après rééquilibrage" accent>
          <VBar
            height={245}
            data={{
              labels: eq.map((e) => e.label),
              datasets: [
                { label: 'Avant', data: eq.map((e) => e.before), backgroundColor: hexToRgba(RED, 0.38), borderRadius: 3, barPercentage: 0.65 },
                { label: 'Après', data: eq.map((e) => e.after), backgroundColor: RED, borderRadius: 3, barPercentage: 0.65 },
              ],
            }}
            options={{
              scales: { y: { beginAtZero: true, title: { display: true, text: 'Observations', color: 'rgba(17,17,17,0.4)', font: { size: 10 } } } },
              plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'circle', color: 'rgba(17,17,17,0.6)' } } },
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <MiniBadge tone="dark">AVANT · {split.train.rows.toLocaleString('fr-FR')}</MiniBadge>
            <MiniBadge>APRÈS · {split.afterSmote.rows.toLocaleString('fr-FR')}</MiniBadge>
          </div>
        </Panel>

        <Panel eyebrow="Espace de caractéristiques" title="Dix entrées numériques">
          <div className="space-y-1.5">
            {[
              ['7 continues', 'Air, Process, Vitesse, Couple, Usure, ΔT, Puissance'],
              ['3 indicatrices', 'One-hot du Type (L / M / H)'],
              ['8 entrées brutes', 'Avant encodage, après suppression des identifiants'],
              ['0 fuite', 'Aucun mode de défaillance dans la matrice X'],
            ].map(([label, value]) => (
              <div key={label} className="panel-flat flex items-start gap-3 p-3">
                <span className="mono w-[105px] shrink-0 text-[10.5px] text-brand-deep">{label}</span>
                <span className="text-[11px] leading-snug text-ink/55">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-ink/[0.08] bg-ink/[0.03] p-3 mono text-[10.5px] leading-relaxed text-ink/55">
            <div>ΔT = T<sub>proc</sub> − T<sub>air</sub></div>
            <div>P [W] = τ [Nm] × N [rpm] × 2π / 60</div>
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Configuration expérimentale" title="Hyperparamètres des cinq modèles" className="mb-10">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Modèle</th><th>Configuration effective</th><th>Sélection</th></tr>
            </thead>
            <tbody>
              {protocol.models.map((m) => (
                <tr key={m.key} className={selected.model === m.key ? 'row-selected' : ''}>
                  <td className="font-semibold text-ink">{m.label}</td>
                  <td className="mono text-[11px]">{m.parameters}</td>
                  <td>
                    {selected.model === m.key ? (
                      <MiniBadge tone="red">RETENU PAR CV</MiniBadge>
                    ) : (
                      <MiniBadge tone="dark">ÉVALUÉ</MiniBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[10.5px] text-ink/40">
          <MiniBadge tone="dark">CV · {cv.foldControl.length} FOLDS STRATIFIÉS</MiniBadge>
          <MiniBadge tone="dark">PAS DE RECHERCHE D'HYPERPARAMÈTRES</MiniBadge>
          <MiniBadge tone="dark">SEUIL FIXE 0,5</MiniBadge>
          <span className="ml-auto">Versions : {Object.entries(meta.versions).map(([k, v]) => `${k} ${v}`).join(' · ')}</span>
        </div>
      </Panel>
    </>
  )
}
