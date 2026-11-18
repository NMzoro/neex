import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { MiniBadge, Panel, SectionHeader, Tabs } from '../components/ui'
import { fmt4 } from '../lib/chartSetup'

const OUTCOME_LABEL = { TP: 'TP · détectée', FN: 'FN · manquée', FP: 'FP · fausse alerte', TN: 'TN · normale' }

export default function SupervisionSection({ data }) {
  const [feed, setFeed] = useState([])
  const [offset, setOffset] = useState(0)
  const [running, setRunning] = useState(true)
  const [feedError, setFeedError] = useState(null)
  const [outcome, setOutcome] = useState('ALL')
  const [page, setPage] = useState(0)
  const [table, setTable] = useState({ total: 0, rows: [] })
  const [loading, setLoading] = useState(true)
  const limit = 12

  const loadFeed = useCallback(async (next) => {
    try {
      const rows = await api.feed({ offset: next, limit: 8 })
      setFeed(rows)
      setFeedError(null)
    } catch (e) {
      setFeedError(e.message)
    }
  }, [])

  useEffect(() => {
    loadFeed(offset)
  }, [loadFeed, offset])

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setOffset((o) => o + 8), 5000)
    return () => clearInterval(timer)
  }, [running])

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.predictions({ outcome, offset: page * limit, limit })
      .then((res) => { if (alive) { setTable(res); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [outcome, page])

  const changeOutcome = (value) => { setOutcome(value); setPage(0) }
  const pages = Math.max(1, Math.ceil(table.total / limit))

  return (
    <>
      <SectionHeader
        id="supervision"
        index="06 / 08"
        eyebrow="Inférence automatique"
        title="Supervision & moteur de prédiction"
        description="Le pipeline joblib du modèle retenu calcule une probabilité de panne pour chaque observation réelle du jeu de test. Aucune donnée n'est saisie : le flux parcourt automatiquement les cycles disponibles."
        right={
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <MiniBadge tone="red">{data.selected.label.toUpperCase()} · JOBLIB</MiniBadge>
          </div>
        }
      />

      <Panel
        eyebrow="Flux de notation · rejoué depuis le jeu de test"
        title="Observations évaluées à l'instant"
        className="mb-4"
        accent
        action={
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="rounded-md border border-ink/15 px-3 py-1.5 text-[10.5px] font-semibold text-ink/70 transition hover:border-brand hover:text-ink"
          >
            {running ? '■ PAUSE DU FLUX' : '▶ REPRENDRE LE FLUX'}
          </button>
        }
      >
        {feedError ? (
          <div className="rounded-lg border border-brand/40 bg-brand/10 p-4 text-[12px] text-brand-deep">{feedError}</div>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {feed.map((row) => (
                <div key={row.id} className="panel-flat p-4 transition-all duration-300 hover:border-brand/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="mono text-[10px] text-ink/35">UDI {row.id} · {row.productId}</div>
                      <div className="mt-1 text-[12.5px] font-semibold text-ink">Type {row.type} · {row.speed} rpm</div>
                    </div>
                    <MiniBadge tone={row.alert ? 'red' : 'dark'}>{row.alert ? 'ALERTE' : 'NORMAL'}</MiniBadge>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <span className={`mono text-[22px] font-semibold ${row.alert ? 'text-brand-deep' : 'text-ink/80'}`}>
                      {(row.probability * 100).toFixed(1)}<span className="text-xs"> %</span>
                    </span>
                    <span className="text-[9.5px] uppercase tracking-wider text-ink/35">P(panne)</span>
                  </div>
                  <div className="progress-track mt-2">
                    <div className="progress-fill animate-bar" style={{ width: `${row.probability * 100}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9.5px] text-ink/35">
                    <span>τ {row.torque} Nm · ΔT {row.delta} K</span>
                    <span className={row.verifiedOutcome === 'FN' || row.verifiedOutcome === 'FP' ? 'text-brand-deep' : ''}>
                      véri. {OUTCOME_LABEL[row.verifiedOutcome]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10.5px] text-ink/35">
              Décision binaire : probabilité ≥ {data.meta.threshold.toFixed(2)}. Les étiquettes « véri. » proviennent du jeu de test réel et permettent de confronter l'inférence à l'observation historique.
            </p>
          </>
        )}
      </Panel>

      <Panel
        eyebrow="Historique complet des notations"
        title="Prédictions réelles sur les 2 000 observations du test"
        action={<Tabs value={outcome} onChange={changeOutcome} options={[{ value: 'ALL', label: 'Toutes' }, { value: 'TP', label: 'TP' }, { value: 'FN', label: 'FN' }, { value: 'FP', label: 'FP' }, { value: 'TN', label: 'TN' }]} />}
        className="mb-10"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="mono text-[10.5px] text-ink/40">{table.total.toLocaleString('fr-FR')} observation(s) · page {page + 1}/{pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded border border-ink/15 px-3 py-1 text-[10.5px] text-ink/60 disabled:opacity-25 hover:border-brand hover:text-ink">← Préc.</button>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="rounded border border-ink/15 px-3 py-1 text-[10.5px] text-ink/60 disabled:opacity-25 hover:border-brand hover:text-ink">Suiv. →</button>
          </div>
        </div>
        <div className="max-h-[560px] overflow-auto rounded-lg border border-ink/[0.07]">
          <table className="data-table">
            <thead>
              <tr>
                <th>UDI</th><th>Produit</th><th>Type</th><th>Air (K)</th><th>Proc. (K)</th><th>Vitesse</th><th>Couple</th><th>Usure</th>
                <th>ΔT</th><th>Puissance (W)</th><th>P(panne)</th><th>Réel</th><th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={13} className="py-8 text-center text-ink/40">Chargement des prédictions…</td></tr>}
              {!loading && table.rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono">{row.id}</td>
                  <td className="mono text-ink/50">{row.productId}</td>
                  <td>{row.type}</td>
                  <td className="mono">{row.air}</td>
                  <td className="mono">{row.process}</td>
                  <td className="mono">{row.speed}</td>
                  <td className="mono">{row.torque}</td>
                  <td className="mono">{row.wear}</td>
                  <td className="mono">{row.delta}</td>
                  <td className="mono">{row.power}</td>
                  <td className={`mono ${row.probability >= 0.5 ? 'text-brand-deep' : 'text-ink/65'}`}>{fmt4(row.probability)}</td>
                  <td className="mono">{row.actual === 1 ? 'Panne' : 'Normal'}</td>
                  <td><span className={`badge badge-${row.outcome.toLowerCase()}`}>{OUTCOME_LABEL[row.outcome]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
