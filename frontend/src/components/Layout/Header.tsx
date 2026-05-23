import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../Auth/AuthContext'
import { useTheme } from '../../theme'
import { useTranslation } from '../../i18n'

const THEMES = [
  { id: 'light', emoji: '☀️', label: 'Light' },
  { id: 'dark', emoji: '🌙', label: 'Dark' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean' },
  { id: 'reef', emoji: '🪸', label: 'Reef' },
  { id: 'pond', emoji: '🪷', label: 'Pond' },
] as const

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
  const [themeOpen, setThemeOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (themeOpen && themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, themeOpen])

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
        <div className="user-menu" ref={themeRef}>
          <button className="icon-btn" onClick={() => setThemeOpen(!themeOpen)} title={t('settings.theme')}>
            🎨
          </button>
          {themeOpen && (
            <div className="dropdown theme-dropdown">
              {THEMES.map(th => (
                <button
                  key={th.id}
                  className={theme === th.id ? 'active' : ''}
                  onClick={() => { setTheme(th.id); setThemeOpen(false) }}
                >
                  {th.emoji} {th.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
