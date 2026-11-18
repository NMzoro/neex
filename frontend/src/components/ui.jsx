import React from 'react'

export function Panel({ title, eyebrow, action, children, className = '', bodyClass = '', accent = false }) {
  return (
    <section className={`panel reveal ${accent ? 'panel-accent' : ''} ${className}`}>
      {(title || eyebrow || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/[0.07] px-5 py-4">
          <div>
            {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
            {title && <h3 className="text-[13.5px] font-semibold tracking-wide text-ink">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      <div className={`p-5 ${bodyClass}`}>{children}</div>
    </section>
  )
}

export function SectionHeader({ id, index, eyebrow, title, description, right }) {
  return (
    <div id={id} className="mb-6 scroll-mt-24 reveal">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="mono text-[11px] font-semibold text-brand-deep">{index}</span>
            <span className="h-px w-9 bg-brand/60" />
            <span className="eyebrow">{eyebrow}</span>
          </div>
          <h2 className="section-title">{title}</h2>
          {description && <p className="section-desc">{description}</p>}
        </div>
        {right}
      </div>
    </div>
  )
}

export function KpiCard({ label, value, suffix, caption, icon, highlight = false, progress }) {
  return (
    <div className={`panel reveal p-5 ${highlight ? 'panel-accent' : ''}`}>
      <div className="flex items-start justify-between">
        <span className="stat-label mt-0">{label}</span>
        {icon && <span className="text-brand-deep/80">{icon}</span>}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={`stat-value ${highlight ? 'text-brand-deep' : ''}`}>{value}</span>
        {suffix && <span className="mono text-xs text-ink/40">{suffix}</span>}
      </div>
      {progress != null && (
        <div className="progress-track mt-4">
          <div className="progress-fill animate-bar" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>
      )}
      {caption && <p className="mt-3 text-[11px] leading-relaxed text-ink/40">{caption}</p>}
    </div>
  )
}

export function Tabs({ options, value, onChange, size = 'sm' }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-ink/[0.08] bg-ink/[0.035] p-1">
      {options.map((opt) => {
        const key = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        return (
          <button key={key} type="button" onClick={() => onChange(key)} className={`tab ${value === key ? 'active' : ''}`}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function StatRow({ label, value, mono = true }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink/[0.06] py-2.5 last:border-0">
      <span className="text-[11.5px] text-ink/45">{label}</span>
      <span className={`${mono ? 'mono' : ''} text-[12px] font-medium text-ink/90`}>{value}</span>
    </div>
  )
}

export function TableScroll({ children, className = '' }) {
  return <div className={`max-h-[520px] overflow-auto rounded-lg border border-ink/[0.07] ${className}`}>{children}</div>
}

export function Heatmap({ labelsX, labelsY, matrix, format = (v) => v.toFixed(2), color = 'red' }) {
  const flat = matrix.flat().filter((v) => Number.isFinite(v))
  const max = Math.max(...flat.map(Math.abs), 0.0001)
  const intensity = (v) => Math.min(1, Math.abs(v) / max)
  const bg = (v) => {
    const a = 0.07 + intensity(v) * 0.8
    return v >= 0 ? `rgba(220,2,2,${a})` : `rgba(17,17,17,${a * 0.42})`
  }
  return (
    <div className="overflow-auto">
      <div className="min-w-[560px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `130px repeat(${labelsX.length}, minmax(42px, 1fr))` }}>
          <div />
          {labelsX.map((x) => (
            <div key={x} className="pb-1 text-center text-[9px] leading-tight text-ink/40">{x}</div>
          ))}
          {labelsY.map((y, row) => (
            <React.Fragment key={y}>
              <div className="flex items-center pr-2 text-right text-[9.5px] leading-tight text-ink/55">{y}</div>
              {matrix[row].map((v, col) => (
                <div
                  key={`${row}-${col}`}
                  title={`${labelsY[row]} × ${labelsX[col]} : ${format(v)}`}
                  className="heat-cell flex h-9 items-center justify-center rounded-[4px] mono text-[9px] text-ink"
                  style={{ background: bg(v), outlineColor: 'transparent' }}
                >
                  {format(v)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LegendRed({ children }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-ink/45">
      <span className="h-2 w-2 rounded-full bg-brand" />
      {children}
    </div>
  )
}

export function MiniBadge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-ink/15 bg-ink/5 text-ink/60',
    red: 'border-brand/40 bg-brand/15 text-brand-deep',
    dark: 'border-ink/10 bg-ink/[0.04] text-ink/45',
  }
  return <span className={`mono rounded border px-2 py-0.5 text-[10px] ${tones[tone]}`}>{children}</span>
}
