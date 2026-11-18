import {
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LinearScale,
  BarController,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  ScatterController,
  Title,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  DoughnutController,
  BarController,
  LineController,
  ScatterController,
  RadarController,
  Legend,
  Title,
  Tooltip,
  Filler,
)

ChartJS.defaults.color = 'rgba(17,17,17,0.5)'
ChartJS.defaults.font.family = "'Inter', 'Segoe UI', Arial, sans-serif"
ChartJS.defaults.font.size = 11
ChartJS.defaults.maintainAspectRatio = false
ChartJS.defaults.animation.duration = 700

export const RED = '#DC0202'
export const RED_BRIGHT = '#E41B35'
export const RED_DEEP = '#990000'
export const RED_LIGHT = '#FB6962'
export const NEUTRAL = '#333333'
export const GREY = '#8b8b8b'
export const GREY_DARK = '#333333'

export const gridColor = 'rgba(17,17,17,0.09)'
export const tooltipStyle = {
  backgroundColor: '#ffffff',
  borderColor: 'rgba(220,2,2,0.35)',
  borderWidth: 1,
  titleColor: '#111111',
  bodyColor: 'rgba(17,17,17,0.82)',
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
}

export const noLegend = { display: false }
export const legendBottom = {
  display: true,
  position: 'bottom',
  labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 14, color: 'rgba(17,17,17,0.6)' },
}

export const baseScales = {
  x: { grid: { color: gridColor }, border: { display: false }, ticks: { maxRotation: 0 } },
  y: { grid: { color: gridColor }, border: { display: false } },
}

/** Dessine des barres d'erreur (moyenne ± écart-type) au-dessus des barres. */
export const errorBarPlugin = {
  id: 'errorBars',
  afterDatasetsDraw(chart, _args, options) {
    const values = options?.values
    if (!values || !chart.data.datasets.length) return
    const meta = chart.getDatasetMeta(0)
    const scale = chart.scales[options.axis || 'x']
    if (!scale) return
    const ctx = chart.ctx
    ctx.save()
    ctx.strokeStyle = options.color || 'rgba(17,17,17,0.55)'
    ctx.lineWidth = 1.2
    meta.data.forEach((element, i) => {
      const sd = Number(values[i] || 0)
      if (!sd) return
      const center = options.axis === 'y' ? element.x : element.y
      const half = Math.abs(scale.getPixelForValue(sd) - scale.getPixelForValue(0))
      const cap = 4
      if (options.axis === 'y') {
        ctx.beginPath()
        ctx.moveTo(center, element.y - half)
        ctx.lineTo(center, element.y + half)
        ctx.moveTo(center - cap, element.y - half)
        ctx.lineTo(center + cap, element.y - half)
        ctx.moveTo(center - cap, element.y + half)
        ctx.lineTo(center + cap, element.y + half)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(element.x - half, center)
        ctx.lineTo(element.x + half, center)
        ctx.moveTo(element.x - half, center - cap)
        ctx.lineTo(element.x - half, center + cap)
        ctx.moveTo(element.x + half, center - cap)
        ctx.lineTo(element.x + half, center + cap)
        ctx.stroke()
      }
    })
    ctx.restore()
  },
}

ChartJS.register(errorBarPlugin)

export function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const n = parseInt(clean, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export const fmt4 = (v) => (typeof v === 'number' ? v.toFixed(4) : '—')
export const fmtPct = (v, digits = 2) => (typeof v === 'number' ? `${(v * 100).toFixed(digits)} %` : '—')
