import React from 'react'
import type { Tank } from '../../types'
import { useTranslation } from '../../i18n'

interface Props {
  tanks: Tank[]
  loading: boolean
  onSelectTank: (t: Tank) => void
  onAddTank: () => void
  onRefresh: () => void
}

export function TankListView({ tanks, loading, onSelectTank, onAddTank }: Props) {
  const { t } = useTranslation()

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>
  }

  return (
    <div className="tank-list-view">
      <div className="view-header">
        <h2>{t('nav.tanks')}</h2>
        <button className="btn btn-primary" onClick={onAddTank}>{t('tank.add')}</button>
      </div>
      <div className="tank-grid">
        {tanks.map(tank => (
          <div key={tank.id} className="tank-card" onClick={() => onSelectTank(tank)}>
            <div className="tank-card-header">
              {tank.photo_url ? (
                <img className="card-photo" src={tank.photo_url} alt={tank.name} />
              ) : (
                <span className="tank-emoji">{tank.emoji}</span>
              )}
              <span className="tank-name">{tank.name}</span>
            </div>
            <div className="tank-card-details">
              <span>{tank.liters}L</span>
              <span>{t(tank.type)}</span>
              {tank.subtype && <span>{t(tank.subtype)}</span>}
            </div>
          </div>
        ))}
        {tanks.length === 0 && (
          <div className="empty-state">
            <p>{t('tank.no_tanks')}</p>
            <button className="btn btn-primary" onClick={onAddTank}>{t('tank.add')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
