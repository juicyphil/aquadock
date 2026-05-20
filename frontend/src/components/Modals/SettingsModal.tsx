import React, { useState, useEffect } from 'react'
import type { ParamRange } from '../../types'
import { api } from '../../api/client'
import { useTheme } from '../../theme'
import { useTranslation } from '../../i18n'
import { useToast } from '../UI/Toast'
import { useAuth } from '../Auth/AuthContext'

interface Props {
  onClose: () => void
}

type Tab = 'profile' | 'params' | 'theme'

export function SettingsModal({ onClose }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')
  const [ranges, setRanges] = useState<ParamRange[]>([])
  const [editedRanges, setEditedRanges] = useState<Record<string, ParamRange>>({})

  const themes = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'ocean', label: 'Ocean' },
    { id: 'reef', label: 'Reef' },
    { id: 'pond', label: 'Pond' },
  ] as const

  useEffect(() => {
    api.listParamRanges().then(setRanges).catch(() => {})
  }, [])

  const handleRangeChange = (subtype: string, field: keyof ParamRange, value: string) => {
    const num = value === '' ? null : parseFloat(value)
    setEditedRanges(prev => ({
      ...prev,
      [subtype]: { ...(prev[subtype] || ranges.find(r => r.tank_subtype === subtype)!), [field]: num },
    }))
  }

  const saveRanges = async () => {
    try {
      for (const r of Object.values(editedRanges)) {
        await api.updateParamRange(r)
      }
      toast('Parameter ranges saved!', 'success')
      setEditedRanges({})
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <h2>{t('settings.title')}</h2>
        <div className="modal-tabs">
          <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>{t('settings.profile')}</button>
          <button className={`tab-btn ${tab === 'params' ? 'active' : ''}`} onClick={() => setTab('params')}>{t('settings.params')}</button>
          <button className={`tab-btn ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>{t('settings.theme')}</button>
        </div>

        <div className="modal-body">
          {tab === 'profile' && (
            <div>
              <p><strong>{t('settings.username')}:</strong> {user?.username}</p>
              <p><strong>{t('settings.email')}:</strong> {user?.email}</p>
              <button className="btn btn-danger" onClick={() => { logout(); onClose() }}>{t('nav.logout')}</button>
            </div>
          )}

          {tab === 'params' && (
            <div>
              <div className="param-ranges-table">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>NH3 min</th><th>NH3 max</th>
                      <th>NO2 min</th><th>NO2 max</th>
                      <th>NO3 min</th><th>NO3 max</th>
                      <th>pH min</th><th>pH max</th>
                      <th>Temp min</th><th>Temp max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranges.map(r => {
                      const edited = editedRanges[r.tank_subtype] || r
                      return (
                        <tr key={r.id}>
                          <td>{t(r.tank_subtype)}</td>
                          <td><input type="number" step="0.1" value={edited.ammonia_min ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'ammonia_min', e.target.value)} /></td>
                          <td><input type="number" step="0.1" value={edited.ammonia_max ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'ammonia_max', e.target.value)} /></td>
                          <td><input type="number" step="0.1" value={edited.nitrite_min ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'nitrite_min', e.target.value)} /></td>
                          <td><input type="number" step="0.1" value={edited.nitrite_max ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'nitrite_max', e.target.value)} /></td>
                          <td><input type="number" step="1" value={edited.nitrate_min ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'nitrate_min', e.target.value)} /></td>
                          <td><input type="number" step="1" value={edited.nitrate_max ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'nitrate_max', e.target.value)} /></td>
                          <td><input type="number" step="0.1" value={edited.ph_min ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'ph_min', e.target.value)} /></td>
                          <td><input type="number" step="0.1" value={edited.ph_max ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'ph_max', e.target.value)} /></td>
                          <td><input type="number" step="0.1" value={edited.temp_min ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'temp_min', e.target.value)} /></td>
                          <td><input type="number" step="0.1" value={edited.temp_max ?? ''} onChange={e => handleRangeChange(r.tank_subtype, 'temp_max', e.target.value)} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {Object.keys(editedRanges).length > 0 && (
                <button className="btn btn-primary" onClick={saveRanges}>{t('common.save')}</button>
              )}
            </div>
          )}

          {tab === 'theme' && (
            <div className="theme-grid">
              {themes.map(th => (
                <div key={th.id} className={`theme-card ${theme === th.id ? 'active' : ''}`} onClick={() => setTheme(th.id)}>
                  <div className={`theme-preview theme-preview-${th.id}`} />
                  <span>{th.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-text" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  )
}
