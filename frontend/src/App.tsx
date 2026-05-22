import React, { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Layout/Header'
import { useAuth } from './components/Auth/AuthContext'
import { LoginModal } from './components/Auth/LoginModal'
import { RegisterModal } from './components/Auth/RegisterModal'
import { DashboardView } from './components/Dashboard/Dashboard'
import { TankListView } from './components/Tanks/TankList'
import { PlannerView } from './components/Planner/Planner'
import { AddTankModal } from './components/Modals/AddTankModal'
import { TankDetailModal } from './components/Modals/TankDetailModal'
import { SettingsModal } from './components/Modals/SettingsModal'
import { useToast } from './components/UI/Toast'
import { api } from './api/client'
import type { Tank, Event, WaterParam, DashboardResponse } from './types'
import './App.css'

type ViewMode = 'dashboard' | 'planner' | 'tanks'

function loadMode(): 'detail' | 'overview' {
  const saved = localStorage.getItem('aquadock_dashboard_mode')
  if (saved === 'detail' || saved === 'overview') return saved
  return 'detail'
}

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [tanks, setTanks] = useState<Tank[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [params, setParams] = useState<WaterParam[]>([])
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null)
  const [showAddTank, setShowAddTank] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashboardMode, setDashboardMode] = useState<'detail' | 'overview'>(loadMode)
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null)

  const selectedTankForDashboard = dashboard?.tanks.find(t => t.id === selectedTankId) ?? dashboard?.tanks[0] ?? null

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [tanksData, dashData] = await Promise.all([
        api.listTanks(),
        api.getDashboard(),
      ])
      setTanks(tanksData)
      setDashboard(dashData)
    } catch (err: any) {
      toast(err.message || 'Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const reloadTanks = useCallback(async () => {
    try {
      const tanksData = await api.listTanks()
      setTanks(tanksData)
      const dashData = await api.getDashboard()
      setDashboard(dashData)
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }, [toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    loadData()
  }, [user, authLoading, loadData])

  useEffect(() => {
    if (dashboard && dashboard.tanks.length > 0 && selectedTankId === null) {
      setSelectedTankId(dashboard.tanks[0].id)
    }
  }, [dashboard, selectedTankId])

  const handleDashboardModeChange = (mode: 'detail' | 'overview') => {
    setDashboardMode(mode)
    localStorage.setItem('aquadock_dashboard_mode', mode)
  }

  const handleDeleteDashboardTank = useCallback(async () => {
    if (!selectedTankForDashboard) return
    if (!confirm('Delete this tank?')) return
    try {
      await api.deleteTank(selectedTankForDashboard.id)
      toast('Tank deleted', 'success')
      setSelectedTankId(null)
      reloadTanks()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }, [selectedTankForDashboard, toast, reloadTanks])

  if (authLoading) {
    return <div className="loading-screen">{'Loading...'}</div>
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-hero">
          <h1>🐠 AquaDock</h1>
          <p>Aquarium Management & Planner</p>
          <div className="auth-buttons">
            <button className="btn btn-primary" onClick={() => setShowLogin(true)}>Login</button>
            <button className="btn btn-secondary" onClick={() => setShowRegister(true)}>Register</button>
          </div>
        </div>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSwitch={() => { setShowLogin(false); setShowRegister(true) }} />}
        {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSwitch={() => { setShowRegister(false); setShowLogin(true) }} />}
      </div>
    )
  }

  return (
    <div className="app">
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        onAddTank={() => setShowAddTank(true)}
        onSettings={() => setShowSettings(true)}
        dashboardMode={dashboardMode}
        onSetDashboardMode={handleDashboardModeChange}
        totalTanks={dashboard?.tanks.length ?? 0}
      />
      <main className="main-content">
        {viewMode === 'dashboard' && (
          <DashboardView
            dashboard={dashboard}
            dashboardMode={dashboardMode}
            selectedTankId={selectedTankId}
            onSelectTankId={setSelectedTankId}
            onRefresh={loadData}
            onDelete={handleDeleteDashboardTank}
          />
        )}
        {viewMode === 'planner' && (
          <PlannerView
            tanks={tanks}
            onRefresh={loadData}
          />
        )}
        {viewMode === 'tanks' && (
          <TankListView
            tanks={tanks}
            loading={loading}
            onSelectTank={(t) => setSelectedTank(t)}
            onAddTank={() => setShowAddTank(true)}
            onRefresh={reloadTanks}
          />
        )}
      </main>

      {showAddTank && (
        <AddTankModal
          onClose={() => setShowAddTank(false)}
          onSaved={() => { setShowAddTank(false); reloadTanks() }}
        />
      )}

      {selectedTank && (
        <TankDetailModal
          tank={selectedTank}
          onClose={() => setSelectedTank(null)}
          onUpdated={() => { setSelectedTank(null); reloadTanks() }}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          dashboardMode={dashboardMode}
          onDashboardModeChange={handleDashboardModeChange}
        />
      )}
    </div>
  )
}
