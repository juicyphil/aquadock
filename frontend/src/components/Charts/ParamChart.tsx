import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { WaterParam } from '../../types'

interface Props {
  params: WaterParam[]
}

interface ChartParam {
  key: string
  label: string
  color: string
  unit: string
}

const PARAMS: ChartParam[] = [
  { key: 'ammonia', label: 'NH₃', color: '#d45b6a', unit: 'ppm' },
  { key: 'nitrite', label: 'NO₂', color: '#d4a040', unit: 'ppm' },
  { key: 'nitrate', label: 'NO₃', color: '#d48a40', unit: 'ppm' },
  { key: 'ph', label: 'pH', color: '#5b9fd4', unit: '' },
  { key: 'temperature', label: 'Temp °C', color: '#d46040', unit: '°C' },
]

export function ParamChart({ params }: Props) {
  const sorted = [...params].sort((a, b) => a.tested_at.localeCompare(b.tested_at))

  const data = sorted.map(p => ({
    date: p.tested_at.slice(5, 10),
    fullDate: p.tested_at,
    ammonia: p.ammonia,
    nitrite: p.nitrite,
    nitrate: p.nitrate,
    ph: p.ph,
    temperature: p.temperature,
  }))

  return (
    <div className="param-charts">
      {PARAMS.map(p => {
        const values = data.map(d => d[p.key as keyof typeof d]).filter(v => v != null)
        if (values.length < 2) return null

        return (
          <div key={p.key} className="param-chart-card">
            <h4 className="param-chart-title">{p.label} {p.unit && <span className="param-unit">({p.unit})</span>}</h4>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} width={40} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                />
                <Line
                  type="monotone"
                  dataKey={p.key}
                  stroke={p.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: p.color }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}
