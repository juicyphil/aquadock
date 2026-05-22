import React from 'react'
import type { DashboardResponse, Tank } from '../../types'
import { useTranslation } from '../../i18n'
import { TankDetailView } from './TankDetailView'

interface Props {
  dashboard: DashboardResponse | null
  dashboardMode: 'detail' | 'overview'
  selectedTankId: number | null
  onSelectTankId: (id: number) => void
  onRefresh: () => void
  onDelete: () => void
}

function ParamBadge({ label, value, min, max }: { label: string; value: number; min: number; max: number }) {
  const status = value > max ? 'bad' : value > max * 0.8 ? 'warn' : 'ok'
  return (
    <span className={`param-badge param-${status}`} title={`${label}: ${value}`}>
      {label} {value}
    </span>
  )
}

export function DashboardView({ dashboard, dashboardMode, selectedTankId, onSelectTankId, onRefresh, onDelete }: Props) {
  const { t } = useTranslation()

  if (!dashboard) {
    return <div className="loading">{t('common.loading')}</div>
  }

  const tank = dashboard.tanks.find(t => t.id === selectedTankId) ?? dashboard.tanks[0] ?? null

  if (dashboard.tanks.length === 0) {
    return (
      <div className="dashboard">
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-value">0</div>
            <div className="stat-label">{t('dashboard.tanks')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">0</div>
            <div className="stat-label">{t('dashboard.today_tasks')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">0</div>
            <div className="stat-label">{t('dashboard.overdue_tasks')}</div>
          </div>
        </div>
        <div className="empty-state">{t('tank.no_tanks')}</div>
      </div>
    )
  }

  if (!tank) {
    return <div className="loading">{t('common.loading')}</div>
  }

  // Overview mode: stat cards + tank grid (original dashboard)
  if (dashboardMode === 'overview') {
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
          {dashboard.tanks.map(dt => (
            <div key={dt.id} className="tank-card" onClick={() => onSelectTankId(dt.id)}>
              <div className="tank-card-header">
                {dt.photo_url ? (
                  <img className="card-photo" src={dt.photo_url} alt={dt.name} />
                ) : (
                  <span className="tank-emoji">{dt.emoji}</span>
                )}
                <span className="tank-name">{dt.name}</span>
              </div>
              <div className="tank-card-details">
                <span>{dt.liters}L</span>
                <span>{t(dt.type)}</span>
                {dt.subtype && <span>{t(dt.subtype)}</span>}
              </div>
              <div className="tank-card-stats">
                <span>🐟 {dt.inhabitant_count}</span>
                {dt.pending_events > 0 && <span className="badge badge-amber">{dt.pending_events} {t('planner.pending')}</span>}
                {dt.overdue_events > 0 && <span className="badge badge-rose">{dt.overdue_events} {t('planner.overdue')}</span>}
              </div>
              {dt.latest_params && (
                <div className="tank-card-params">
                  {dt.latest_params.ammonia != null && (
                    <ParamBadge label="Ammonia" value={dt.latest_params.ammonia} min={0} max={0.25} />
                  )}
                  {dt.latest_params.nitrite != null && (
                    <ParamBadge label="Nitrite" value={dt.latest_params.nitrite} min={0} max={0.5} />
                  )}
                  {dt.latest_params.nitrate != null && (
                    <ParamBadge label="Nitrate" value={dt.latest_params.nitrate} min={0} max={40} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Detail mode: tank selector pills + TankDetailView
  return (
    <div>
      {dashboard.tanks.length > 1 && (
        <div className="tank-selector">
          {dashboard.tanks.map(t => (
            <button
              key={t.id}
              className={`tank-selector-pill ${t.id === tank.id ? 'active' : ''}`}
              onClick={() => onSelectTankId(t.id)}
            >
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
      )}
      <TankDetailView tank={tank} onUpdated={onRefresh} onDelete={onDelete} />
    </div>
  )
}
