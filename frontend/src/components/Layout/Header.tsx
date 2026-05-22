import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../Auth/AuthContext'
import { useTheme } from '../../theme'
import { useTranslation } from '../../i18n'

const THEMES = ['light', 'dark', 'ocean', 'reef', 'pond'] as const

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
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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
        <button className="icon-btn" onClick={() => {
          const idx = THEMES.indexOf(theme)
          setTheme(THEMES[(idx + 1) % THEMES.length])
        }} title={t('settings.theme')}>
          🎨
        </button>
          {user ? (
          <div className="user-menu" ref={menuRef}>
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
