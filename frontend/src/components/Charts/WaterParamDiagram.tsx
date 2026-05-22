import React from 'react'
import type { WaterParam, ParamRange } from '../../types'
import { useTranslation } from '../../i18n'

interface Props {
  params: WaterParam[]
  trackedParams: string[]
  paramRanges: ParamRange[]
  tankSubtype: string
}

interface ParamConfig {
  key: string
  label: string
  emoji: string
  unit: string
}

const ALL_PARAMS: ParamConfig[] = [
  { key: 'ammonia', label: 'Ammonia (NH₃)', emoji: '☠️', unit: 'ppm' },
  { key: 'nitrite', label: 'Nitrite (NO₂)', emoji: '⚠️', unit: 'ppm' },
  { key: 'nitrate', label: 'Nitrate (NO₃)', emoji: '🌿', unit: 'ppm' },
  { key: 'ph', label: 'pH', emoji: '🧪', unit: '' },
  { key: 'temperature', label: 'Temp', emoji: '🌡️', unit: '°C' },
  { key: 'gh', label: 'GH', emoji: '💎', unit: 'dGH' },
  { key: 'kh', label: 'KH', emoji: '🛡️', unit: 'dKH' },
]

function paramStatus(value: number, min: number | null, max: number | null): 'ok' | 'warn' | 'bad' {
  if (min != null && max != null) {
    if (value < min || value > max) return 'bad'
    if (value < min * 1.2 || value > max * 0.8) return 'warn'
    return 'ok'
  }
  if (max != null) {
    if (value > max) return 'bad'
    if (value > max * 0.8) return 'warn'
    return 'ok'
  }
  if (min != null) {
    if (value < min) return 'bad'
    if (value < min * 1.2) return 'warn'
    return 'ok'
  }
  return 'ok'
}

export function WaterParamDiagram({ params, trackedParams, paramRanges, tankSubtype }: Props) {
  const { t } = useTranslation()
  const latest = params.length > 0 ? params[0] : null
  const range = paramRanges.find(r => r.tank_subtype === tankSubtype)

  const visible = trackedParams
    ? ALL_PARAMS.filter(p => trackedParams.includes(p.key))
    : ALL_PARAMS

  const getLatest = (key: string): number | null => {
    if (!latest) return null
    return latest[key as keyof WaterParam] as number | null
  }

  const getRange = (key: string): { min: number | null; max: number | null } => {
    if (!range) return { min: null, max: null }
    const minKey = `${key}_min` as keyof ParamRange
    const maxKey = `${key}_max` as keyof ParamRange
    return {
      min: range[minKey] as number | null,
      max: range[maxKey] as number | null,
    }
  }

  return (
    <div className="water-diagram">
      <div className="diagram-section">
        <h4 className="diagram-section-title">{t('diagram.nitrogen_cycle')}</h4>
        <svg className="diagram-cycle-svg" viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrowOk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="var(--green)" />
            </marker>
            <marker id="arrowWarn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="var(--amber)" />
            </marker>
          </defs>

          <rect x="10" y="25" width="120" height="60" rx="10" fill="var(--rose)" opacity="0.15" stroke="var(--rose)" strokeWidth="2" />
          <text x="70" y="58" textAnchor="middle" fill="var(--rose)" fontSize="13" fontWeight="700">Ammonia</text>
          <text x="70" y="73" textAnchor="middle" fill="var(--rose)" fontSize="10">NH₃ / NH₄⁺</text>

          <line x1="135" y1="55" x2="195" y2="55" stroke="var(--green)" strokeWidth="2" markerEnd="url(#arrowOk)" />
          <text x="165" y="48" textAnchor="middle" fill="var(--text3)" fontSize="9">Nitrosomonas</text>

          <rect x="200" y="25" width="120" height="60" rx="10" fill="var(--amber)" opacity="0.15" stroke="var(--amber)" strokeWidth="2" />
          <text x="260" y="58" textAnchor="middle" fill="var(--amber)" fontSize="13" fontWeight="700">Nitrite</text>
          <text x="260" y="73" textAnchor="middle" fill="var(--amber)" fontSize="10">NO₂⁻</text>

          <line x1="325" y1="55" x2="385" y2="55" stroke="var(--green)" strokeWidth="2" markerEnd="url(#arrowOk)" />
          <text x="355" y="48" textAnchor="middle" fill="var(--text3)" fontSize="9">Nitrobacter</text>

          <rect x="390" y="25" width="120" height="60" rx="10" fill="var(--green)" opacity="0.15" stroke="var(--green)" strokeWidth="2" />
          <text x="450" y="58" textAnchor="middle" fill="var(--green)" fontSize="13" fontWeight="700">Nitrate</text>
          <text x="450" y="73" textAnchor="middle" fill="var(--green)" fontSize="10">NO₃⁻</text>

          <line x1="515" y1="55" x2="555" y2="55" stroke="var(--text3)" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="555" y1="55" x2="555" y2="105" stroke="var(--text3)" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="555" y1="105" x2="40" y2="105" stroke="var(--text3)" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="40" y1="105" x2="40" y2="90" stroke="var(--text3)" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowWarn)" />
          <text x="300" y="118" textAnchor="middle" fill="var(--text3)" fontSize="9">Water Changes → Remove Nitrate</text>
        </svg>
      </div>

      {latest && (
        <div className="diagram-section">
          <h4 className="diagram-section-title">{t('diagram.param_status')}</h4>
          <div className="diagram-gauges">
            {visible.map(p => {
              const value = getLatest(p.key)
              const { min, max } = getRange(p.key)
              const status = value != null ? paramStatus(value, min, max) : 'ok'
              const barMin = min ?? 0
              const barMax = max ?? (value ?? 1) * 2
              const barRange = barMax - barMin || 1
              const safeLeft = ((min ?? barMin) - barMin) / barRange * 100
              const safeWidth = ((max ?? barMax) - (min ?? barMin)) / barRange * 100
              const markerPos = value != null ? ((value - barMin) / barRange) * 100 : 0

              return (
                <div key={p.key} className="diagram-gauge-card">
                  <div className="diagram-gauge-header">
                    <span>{p.emoji}</span>
                    <span className="diagram-gauge-name">{p.label}</span>
                    {value != null ? (
                      <span className={`diagram-gauge-value param-${status}`}>
                        {value} {p.unit}
                      </span>
                    ) : (
                      <span className="diagram-gauge-value" style={{ color: 'var(--text3)' }}>—</span>
                    )}
                  </div>
                  <div className="gauge-bar-track">
                    <div className="gauge-bar-bg">
                      <div className="gauge-bar-safe" style={{ left: `${safeLeft}%`, width: `${safeWidth}%` }} />
                    </div>
                    {value != null && (
                      <div
                        className={`gauge-marker gauge-marker-${status}`}
                        style={{ left: `${markerPos}%` }}
                      />
                    )}
                  </div>
                  <div className="gauge-labels">
                    <span>{min ?? '—'}</span>
                    <span>{max ?? '—'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
