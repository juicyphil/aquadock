import React, { useState, useEffect } from 'react'
import type { ParamRange } from '../../types'
import { api } from '../../api/client'
import { useTheme } from '../../theme'
import { useTranslation, LANG_LABELS, type Lang } from '../../i18n'
import { useToast } from '../UI/Toast'
import { useAuth } from '../Auth/AuthContext'

interface Props {
  onClose: () => void
  dashboardMode: 'detail' | 'overview'
  onDashboardModeChange: (m: 'detail' | 'overview') => void
}

type Tab = 'profile' | 'params' | 'theme' | 'dashboard'

export function SettingsModal({ onClose, dashboardMode, onDashboardModeChange }: Props) {
  const { t, lang, setLang } = useTranslation()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')
  const [ranges, setRanges] = useState<ParamRange[]>([])
  const [rangesLoading, setRangesLoading] = useState(true)
  const [editedRanges, setEditedRanges] = useState<Record<string, ParamRange>>({})

  const themes = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'ocean', label: 'Ocean' },
    { id: 'reef', label: 'Reef' },
    { id: 'pond', label: 'Pond' },
  ] as const

  useEffect(() => {
    setRangesLoading(true)
    api.listParamRanges().then(setRanges).catch(() => toast('Failed to load param ranges', 'error')).finally(() => setRangesLoading(false))
  }, [toast])

  const handleRangeChange = (subtype: string, field: keyof ParamRange, value: string) => {
    const num = value === '' ? null : parseFloat(value)
    setEditedRanges(prev => ({
      ...prev,
      [subtype]: { ...(prev[subtype] || ranges.find(r => r.tank_subtype === subtype) || prev[subtype] || { tank_subtype: subtype }), [field]: num },
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
          <button className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>{t('settings.dashboard')}</button>
          <button className={`tab-btn ${tab === 'params' ? 'active' : ''}`} onClick={() => setTab('params')}>{t('settings.params')}</button>
          <button className={`tab-btn ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>{t('settings.theme')}</button>
        </div>

        <div className="modal-body">
          {tab === 'profile' && (
            <div>
              <p><strong>{t('settings.username')}:</strong> {user?.username}</p>
              <p><strong>{t('settings.email')}:</strong> {user?.email}</p>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>{t('nav.language')}</label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                    <button key={l} className={`btn btn-sm ${lang === l ? 'btn-primary' : 'btn-text'}`}
                      onClick={() => setLang(l)}>
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-danger" onClick={() => { logout(); onClose() }}>{t('nav.logout')}</button>
              </div>
            </div>
          )}

          {tab === 'dashboard' && (
            <div>
              <p style={{ marginBottom: '1rem', color: 'var(--text2)' }}>
                Choose your default dashboard view:
              </p>
              <div className="mode-toggle" style={{ display: 'inline-flex' }}>
                <button
                  className={`mode-toggle-btn ${dashboardMode === 'detail' ? 'active' : ''}`}
                  onClick={() => onDashboardModeChange('detail')}
                >
                  {t('dashboard.mode_detail')}
                </button>
                <button
                  className={`mode-toggle-btn ${dashboardMode === 'overview' ? 'active' : ''}`}
                  onClick={() => onDashboardModeChange('overview')}
                >
                  {t('dashboard.mode_overview')}
                </button>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text3)' }}>
                {dashboardMode === 'detail'
                  ? 'Shows a detailed view of one tank at a time with tabs for inhabitants, events, and water parameters. Use the tank selector to switch between tanks.'
                  : 'Shows an overview of all tanks as cards with summary stats. Click a card to view details in a modal.'}
              </p>
            </div>
          )}

          {tab === 'params' && (
            <div>
              {rangesLoading ? (
                <div className="loading">{t('common.loading')}</div>
              ) : (
                <>
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
              </>
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
