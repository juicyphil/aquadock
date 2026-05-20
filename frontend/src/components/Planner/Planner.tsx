import React, { useState, useEffect, useCallback } from 'react'
import type { Tank, Event as EventType, EventCreate } from '../../types'
import { EVENT_TYPES, RECURRENCE_OPTIONS } from '../../types'
import { api } from '../../api/client'
import { useTranslation } from '../../i18n'
import { useToast } from '../UI/Toast'

type PlannerMode = 'day' | 'week' | 'month'

interface Props {
  tanks: Tank[]
  onRefresh: () => void
}

export function PlannerView({ tanks, onRefresh }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [mode, setMode] = useState<PlannerMode>('day')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [events, setEvents] = useState<EventType[]>([])
  const [overdue, setOverdue] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [selectedTankId, setSelectedTankId] = useState<number>(0)
  const [newEvent, setNewEvent] = useState<EventCreate>({
    tank_id: 0,
    type: 'feed',
    title: '',
    recurrence: '',
    scheduled_date: '',
  })

  const dateStr = (d: Date) => d.toISOString().slice(0, 10)

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      const day = dateStr(currentDate)
      const [dayEvents, overdueEvents] = await Promise.all([
        api.getPlannerDay(day),
        api.getPlannerOverdue(),
      ])
      setEvents(dayEvents)
      setOverdue(overdueEvents)
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [currentDate, toast])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleComplete = async (id: number) => {
    try {
      await api.completeEvent(id)
      toast('Event completed!', 'success')
      loadEvents()
      onRefresh()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.tank_id) {
      toast('Select a tank', 'error')
      return
    }
    try {
      newEvent.scheduled_date = dateStr(currentDate)
      await api.createEvent(newEvent)
      toast('Event created!', 'success')
      setShowAddEvent(false)
      setNewEvent({ tank_id: 0, type: 'feed', title: '', recurrence: '', scheduled_date: '' })
      loadEvents()
      onRefresh()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const tankName = (id: number) => tanks.find(t => t.id === id)?.name || '?'

  const eventEmoji = (type: string) => EVENT_TYPES.find(e => e.value === type)?.emoji || '📋'

  const isOverdue = (e: EventType) => {
    if (e.completed_at) return false
    return e.scheduled_date < dateStr(currentDate)
  }

  return (
    <div className="planner-view">
      <div className="planner-header">
        <div className="planner-tabs">
          <button className={`tab-btn ${mode === 'day' ? 'active' : ''}`} onClick={() => setMode('day')}>{t('planner.today')}</button>
          <button className={`tab-btn ${mode === 'week' ? 'active' : ''}`} onClick={() => setMode('week')}>{t('planner.week')}</button>
          <button className={`tab-btn ${mode === 'month' ? 'active' : ''}`} onClick={() => setMode('month')}>{t('planner.month')}</button>
        </div>
        <div className="planner-nav">
          <button className="icon-btn" onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))}>◀</button>
          <span className="planner-date">{dateStr(currentDate)}</span>
          <button className="icon-btn" onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}>▶</button>
          <button className="btn btn-primary" onClick={() => setShowAddEvent(true)}>+ {t('event.schedule')}</button>
        </div>
      </div>

      <div className="planner-sections">
        {overdue.length > 0 && (
          <div className="planner-section">
            <h3 className="section-title section-overdue">{t('planner.overdue')} ({overdue.length})</h3>
            <div className="event-list">
              {overdue.map(e => (
                <div key={e.id} className={`event-card event-overdue ${e.completed_at ? 'completed' : ''}`}>
                  <span className="event-emoji">{eventEmoji(e.type)}</span>
                  <div className="event-info">
                    <span className="event-title">{e.title}</span>
                    <span className="event-tank">{tankName(e.tank_id)}</span>
                    <span className="event-date">{e.scheduled_date}</span>
                  </div>
                  {!e.completed_at && (
                    <button className="btn btn-sm btn-primary" onClick={() => handleComplete(e.id)}>
                      {t('event.complete')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="planner-section">
          <h3 className="section-title">{dateStr(currentDate) === dateStr(new Date()) ? t('planner.today') : dateStr(currentDate)}</h3>
          {loading ? (
            <div className="loading">{t('common.loading')}</div>
          ) : events.length === 0 ? (
            <div className="empty-state">{t('event.no_events')}</div>
          ) : (
            <div className="event-list">
              {events.map(e => (
                <div key={e.id} className={`event-card ${e.completed_at ? 'completed' : ''}`}>
                  <span className="event-emoji">{eventEmoji(e.type)}</span>
                  <div className="event-info">
                    <span className="event-title">{e.title}</span>
                    <span className="event-tank">{tankName(e.tank_id)}</span>
                    {e.scheduled_time && <span className="event-time">{e.scheduled_time}</span>}
                    {e.recurrence && <span className="event-recurrence">{RECURRENCE_OPTIONS.find(r => r.value === e.recurrence)?.label}</span>}
                  </div>
                  {!e.completed_at && (
                    <button className="btn btn-sm btn-primary" onClick={() => handleComplete(e.id)}>
                      {t('event.complete')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddEvent && (
        <div className="modal-overlay" onClick={() => setShowAddEvent(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{t('event.schedule')}</h3>
            <div className="form-group">
              <label>{t('nav.tanks')}</label>
              <select value={newEvent.tank_id} onChange={e => setNewEvent({ ...newEvent, tank_id: Number(e.target.value) })}>
                <option value={0}>--</option>
                {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('event.type')}</label>
              <select value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}>
                {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.emoji} {et.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('event.title')}</label>
              <input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('event.recurrence')}</label>
              <select value={newEvent.recurrence || ''} onChange={e => setNewEvent({ ...newEvent, recurrence: e.target.value })}>
                {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCreateEvent}>{t('common.save')}</button>
              <button className="btn btn-text" onClick={() => setShowAddEvent(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
