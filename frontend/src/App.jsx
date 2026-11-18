import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { useReveal } from './hooks/useReveal'
import { MiniBadge } from './components/ui'
import Overview from './sections/Overview'
import DataSection from './sections/DataSection'
import ProtocolSection from './sections/ProtocolSection'
import ModelsSection from './sections/ModelsSection'
import PerformanceSection from './sections/PerformanceSection'
import SupervisionSection from './sections/SupervisionSection'
import ExplainSection from './sections/ExplainSection'
import ClosingSection from './sections/ClosingSection'

const NAV = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'data', label: 'Données & EDA' },
  { id: 'protocol', label: 'Prétraitement' },
  { id: 'models', label: 'Modèles & CV' },
  { id: 'performance', label: 'Performance test' },
  { id: 'supervision', label: 'Supervision' },
  { id: 'explain', label: 'Explicabilité' },
  { id: 'limits', label: 'Limites' },
]

const ICONS = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  data: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-5 3 3 5-7" /></>,
  protocol: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" fill="#111" /><circle cx="15" cy="12" r="2" fill="#111" /><circle cx="11" cy="18" r="2" fill="#111" /></>,
  models: <><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2.5" /></>,
  performance: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  supervision: <><path d="M3 12h3l2-6 4 12 3-8 2 4h4" /></>,
  explain: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  limits: <><path d="M12 4 3 20h18L12 4Z" /><path d="M12 10v4M12 17h.01" /></>,
}

function NavIcon({ id }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[id]}
    </svg>
  )
}

function Sidebar({ active, onNavigate, open, onClose, data }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-ink/[0.08] bg-white transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative border-b border-ink/[0.08] px-3 py-5">
          <img src="/logo.png" alt="Logo AI4I Ops" className="block h-auto w-full object-contain" />
          <button type="button" onClick={onClose} aria-label="Fermer le menu" className="absolute right-2 top-2 text-black lg:hidden">✕</button>
        </div>

        <div className="px-3 py-5">
          <div className="eyebrow-muted mb-3 px-2 text-black">Navigation</div>
          <nav className="space-y-0.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
              >
                <NavIcon id={item.id} />
                <span>{item.label}</span>
                {active === item.id && <span className="ml-auto h-1 w-1 rounded-full bg-brand" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="panel-flat p-4">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="mono text-[9.5px] uppercase tracking-wider text-black">Système actif</span>
            </div>
            <div className="mt-3 text-[11px] leading-snug text-black">{data?.selected?.label || 'Chargement du modèle…'}</div>
            <div className="mt-1 mono text-[9.5px] text-black">
              {data ? `${data.predictions.length.toLocaleString('fr-FR')} prédictions chargées` : '—'}
            </div>
          </div>
          <div className="mt-3 px-1 text-[9px] leading-relaxed text-black">
            Prototype méthodologique · données synthétiques UCI AI4I 2020
          </div>
        </div>
      </aside>
    </>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [active, setActive] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [reload, setReload] = useState(0)

  useReveal([data])

  useEffect(() => {
    let alive = true
    api.bootstrap()
      .then((res) => { if (alive) { setData(res); setError(null) } })
      .catch((e) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [reload])

  const navigate = useCallback((id) => {
    setMenuOpen(false)
    setActive(id)
    const el = document.getElementById(id)
    if (el) {
      if (window.__lenis) window.__lenis.scrollTo(el, { offset: -20, duration: 1.2 })
      else el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    if (!data) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-15% 0px -60% 0px', threshold: [0, 0.15, 0.4] },
    )
    NAV.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [data])

  return (
    <div className="app-shell">
      <Sidebar active={active} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} data={data} />

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-ink/[0.08] bg-white/90 px-5 backdrop-blur-xl md:px-8">
          <button type="button" onClick={() => setMenuOpen(true)} className="text-ink/60 lg:hidden" aria-label="Ouvrir le menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div className="min-w-0">
            <div className="eyebrow-muted">Console / <span className="text-ink/70">{NAV.find((n) => n.id === active)?.label}</span></div>
            <div className="mt-1 truncate text-[12.5px] font-semibold text-ink">Supervision intelligente · maintenance prédictive</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {data && <MiniBadge tone="dark">{data.eda.rows.toLocaleString('fr-FR')} CYCLES</MiniBadge>}
            {data && <MiniBadge tone="red">{data.selected.label.toUpperCase()}</MiniBadge>}
            <div className="hidden items-center gap-2 rounded-full border border-ink/10 bg-ink/[0.03] px-3 py-1.5 sm:flex">
              <span className="live-dot" />
              <span className="mono text-[9.5px] uppercase tracking-wider text-ink/55">API connectée</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1560px] px-5 py-8 md:px-8 md:py-10">
          {error && (
            <div className="panel panel-accent p-8">
              <div className="eyebrow">Connexion à l'API</div>
              <h2 className="mt-3 text-xl font-semibold text-ink">Impossible de charger les données réelles</h2>
              <p className="mt-2 text-[13px] text-ink/50">{error}</p>
              <p className="mt-2 text-[11px] text-ink/35">Vérifiez que le backend est démarré sur le port 8000 et que les artifacts ont été générés.</p>
              <button type="button" onClick={() => setReload((v) => v + 1)} className="mt-5 rounded-lg border border-brand/50 bg-brand/15 px-4 py-2 text-[12px] font-semibold text-brand-deep hover:bg-brand/25">
                Réessayer
              </button>
            </div>
          )}

          {!data && !error && (
            <div className="space-y-4">
              <div className="h-56 animate-pulse rounded-xl border border-ink/[0.06] bg-ink/[0.025]" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl border border-ink/[0.06] bg-ink/[0.025]" />)}
              </div>
              <div className="h-96 animate-pulse rounded-xl border border-ink/[0.06] bg-ink/[0.025]" />
              <p className="text-center mono text-[11px] text-ink/35">Connexion aux modèles entraînés…</p>
            </div>
          )}

          {data && (
            <>
              <Overview data={data} />
              <DataSection data={data} />
              <ProtocolSection data={data} />
              <ModelsSection data={data} />
              <PerformanceSection data={data} />
              <SupervisionSection data={data} />
              <ExplainSection data={data} />
              <ClosingSection data={data} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
