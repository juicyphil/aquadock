import React, { useState } from 'react'
import { useAuth } from '../Auth/AuthContext'
import { useTheme } from '../../theme'
import { useTranslation } from '../../i18n'

interface HeaderProps {
  viewMode: 'dashboard' | 'planner' | 'tanks'
  setViewMode: (v: 'dashboard' | 'planner' | 'tanks') => void
  onAddTank: () => void
  onSettings: () => void
  dashboardMode?: 'detail' | 'overview'
  onSetDashboardMode?: (m: 'detail' | 'overview') => void
  totalTanks?: number
}

export function Header({ viewMode, setViewMode, onAddTank, onSettings, dashboardMode, onSetDashboardMode, totalTanks = 0 }: HeaderProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  const themes = ['light', 'dark', 'ocean', 'reef', 'pond'] as const

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title" onClick={() => setViewMode('dashboard')}>
          🐠 AquaDock
        </h1>
        <nav className="header-nav">
          <button className={`nav-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setViewMode('dashboard')}>{t('nav.dashboard')}</button>
          <button className={`nav-btn ${viewMode === 'planner' ? 'active' : ''}`}
            onClick={() => setViewMode('planner')}>{t('nav.planner')}</button>
          <button className={`nav-btn ${viewMode === 'tanks' ? 'active' : ''}`}
            onClick={() => setViewMode('tanks')}>{t('nav.tanks')}</button>
        </nav>
        {viewMode === 'dashboard' && totalTanks >= 2 && dashboardMode && onSetDashboardMode && (
          <div className="mode-toggle">
            <button
              className={`mode-toggle-btn ${dashboardMode === 'detail' ? 'active' : ''}`}
              onClick={() => onSetDashboardMode('detail')}
            >
              {t('dashboard.mode_detail')}
            </button>
            <button
              className={`mode-toggle-btn ${dashboardMode === 'overview' ? 'active' : ''}`}
              onClick={() => onSetDashboardMode('overview')}
            >
              {t('dashboard.mode_overview')}
            </button>
          </div>
        )}
      </div>
      <div className="header-right">
        <button className="icon-btn" onClick={onAddTank} title={t('nav.add_tank')}>➕</button>
        <button className="icon-btn" onClick={onSettings} title={t('nav.settings')}>⚙️</button>
        <button className="icon-btn" onClick={() => setLang(lang === 'en' ? 'de' : 'en')} title="Language">
          {lang.toUpperCase()}
        </button>
        <button className="icon-btn" onClick={() => {
          const idx = themes.indexOf(theme)
          setTheme(themes[(idx + 1) % themes.length])
        }} title={t('settings.theme')}>
          🎨
        </button>
        {user ? (
          <div className="user-menu">
            <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)}>
              👤 {user.username}
            </button>
            {menuOpen && (
              <div className="dropdown">
                <button onClick={() => { logout(); setMenuOpen(false) }}>{t('nav.logout')}</button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}
