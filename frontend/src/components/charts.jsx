import React from 'react'
import { Bar, Doughnut, Line, Radar, Scatter } from 'react-chartjs-2'
import { baseScales, legendBottom, noLegend, tooltipStyle } from '../lib/chartSetup'

const merge = (base, extra = {}) => ({
  ...base,
  ...extra,
  scales: { ...base.scales, ...(extra.scales || {}) },
  plugins: { ...base.plugins, ...(extra.plugins || {}) },
})

export function HBar({ data, options, height = 260, plugins }) {
  return (
    <div style={{ height }}>
      <Bar
        data={data}
        plugins={plugins}
        options={merge(
          {
            indexAxis: 'y',
            scales: {
              x: { ...baseScales.x, beginAtZero: true },
              y: { ...baseScales.y, grid: { display: false } },
            },
            plugins: { legend: noLegend, tooltip: tooltipStyle },
          },
          options,
        )}
      />
    </div>
  )
}

export function VBar({ data, options, height = 260, plugins }) {
  return (
    <div style={{ height }}>
      <Bar
        data={data}
        plugins={plugins}
        options={merge(
          {
            scales: { x: baseScales.x, y: { ...baseScales.y, beginAtZero: true } },
            plugins: { legend: noLegend, tooltip: tooltipStyle },
          },
          options,
        )}
      />
    </div>
  )
}

export function LineChart({ data, options, height = 260 }) {
  return (
    <div style={{ height }}>
      <Line
        data={data}
        options={merge(
          {
            scales: { x: baseScales.x, y: baseScales.y },
            plugins: { legend: legendBottom, tooltip: tooltipStyle },
            interaction: { mode: 'nearest', intersect: false },
          },
          options,
        )}
      />
    </div>
  )
}

export function CurveChart({ data, height = 280, xLabel, yLabel }) {
  return (
    <div style={{ height }}>
      <Line
        data={data}
        options={{
          parsing: false,
          animation: false,
          scales: {
            x: { type: 'linear', title: { display: true, text: xLabel, color: 'rgba(17,17,17,0.4)', font: { size: 10 } }, grid: baseScales.x.grid, min: 0, max: 1 },
            y: { title: { display: true, text: yLabel, color: 'rgba(17,17,17,0.4)', font: { size: 10 } }, grid: baseScales.y.grid, min: 0, max: 1 },
          },
          plugins: { legend: legendBottom, tooltip: { ...tooltipStyle, callbacks: { label: (c) => `${c.dataset.label} — ${c.parsed.x.toFixed(3)} / ${c.parsed.y.toFixed(3)}` } } },
          interaction: { mode: 'nearest', intersect: false },
        }}
      />
    </div>
  )
}

export function DoughnutChart({ data, options, height = 220 }) {
  return (
    <div style={{ height }}>
      <Doughnut
        data={data}
        options={merge(
          {
            cutout: '68%',
            plugins: { legend: legendBottom, tooltip: tooltipStyle },
          },
          options,
        )}
      />
    </div>
  )
}

export function ScatterChart({ data, options, height = 320 }) {
  return (
    <div style={{ height }}>
      <Scatter
        data={data}
        options={merge(
          {
            parsing: false,
            animation: false,
            scales: {
              x: { ...baseScales.x, title: { display: true, text: 'Vitesse de rotation (rpm)', color: 'rgba(17,17,17,0.42)', font: { size: 10 } } },
              y: { ...baseScales.y, title: { display: true, text: 'Couple (Nm)', color: 'rgba(17,17,17,0.42)', font: { size: 10 } } },
            },
            plugins: { legend: legendBottom, tooltip: tooltipStyle },
          },
          options,
        )}
      />
    </div>
  )
}

export function RadarChart({ data, options, height = 300 }) {
  return (
    <div style={{ height }}>
      <Radar
        data={data}
        options={merge(
          {
            scales: {
              r: {
                min: 0,
                max: 1,
                ticks: { display: false, stepSize: 0.25 },
                pointLabels: { color: 'rgba(17,17,17,0.6)', font: { size: 10 } },
                grid: { color: 'rgba(17,17,17,0.1)' },
                angleLines: { color: 'rgba(17,17,17,0.1)' },
              },
            },
            plugins: { legend: legendBottom, tooltip: tooltipStyle },
          },
          options,
        )}
      />
    </div>
  )
}
