import React from 'react'
import type { DashboardResponse, Tank } from '../../types'
import { useTranslation } from '../../i18n'

interface Props {
  dashboard: DashboardResponse | null
  onSelectTank: (t: Tank) => void
  onRefresh: () => void
}

export function DashboardView({ dashboard, onSelectTank, onRefresh }: Props) {
  const { t } = useTranslation()

  if (!dashboard) {
    return <div className="loading">{t('common.loading')}</div>
  }

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{dashboard.tanks.length}</div>
          <div className="stat-label">{t('dashboard.tanks')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard.today_count}</div>
          <div className="stat-label">{t('dashboard.today_tasks')}</div>
        </div>
        <div className="stat-card stat-warn">
          <div className="stat-value">{dashboard.overdue_count}</div>
          <div className="stat-label">{t('dashboard.overdue_tasks')}</div>
        </div>
      </div>

      <div className="tank-grid">
        {dashboard.tanks.map(tank => (
          <div key={tank.id} className="tank-card" onClick={() => onSelectTank(tank)}>
            <div className="tank-card-header">
              <span className="tank-emoji">{tank.emoji}</span>
              <span className="tank-name">{tank.name}</span>
            </div>
            <div className="tank-card-details">
              <span>{tank.liters}L</span>
              <span>{t(tank.type)}</span>
              {tank.subtype && <span>{t(tank.subtype)}</span>}
            </div>
            <div className="tank-card-stats">
              <span>🐟 {tank.inhabitant_count}</span>
              {tank.pending_events > 0 && <span className="badge badge-amber">{tank.pending_events} {t('planner.pending')}</span>}
              {tank.overdue_events > 0 && <span className="badge badge-rose">{tank.overdue_events} {t('planner.overdue')}</span>}
            </div>
            {tank.latest_params && (
              <div className="tank-card-params">
                {tank.latest_params.ammonia != null && (
                  <ParamBadge label="NH3" value={tank.latest_params.ammonia} min={0} max={0.25} />
                )}
                {tank.latest_params.nitrite != null && (
                  <ParamBadge label="NO2" value={tank.latest_params.nitrite} min={0} max={0.5} />
                )}
                {tank.latest_params.nitrate != null && (
                  <ParamBadge label="NO3" value={tank.latest_params.nitrate} min={0} max={40} />
                )}
              </div>
            )}
          </div>
        ))}
        {dashboard.tanks.length === 0 && (
          <div className="empty-state">{t('tank.no_tanks')}</div>
        )}
      </div>
    </div>
  )
}

function ParamBadge({ label, value, min, max }: { label: string; value: number; min: number; max: number }) {
  const status = value > max ? 'bad' : value > max * 0.8 ? 'warn' : 'ok'
  return (
    <span className={`param-badge param-${status}`} title={`${label}: ${value}`}>
      {label} {value}
    </span>
  )
}
