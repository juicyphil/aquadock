import React, { useState, useEffect, useCallback } from 'react'
import type { Tank, EventOccurrence, EventCreate } from '../../types'
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
  const [events, setEvents] = useState<EventOccurrence[]>([])
  const [overdue, setOverdue] = useState<EventOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEvent, setNewEvent] = useState<EventCreate>({
    tank_id: 0,
    type: 'feed',
    title: '',
    recurrence: '',
    scheduled_date: '',
  })
  const [editingEvent, setEditingEvent] = useState<EventOccurrence | null>(null)
  const [editEventForm, setEditEventForm] = useState({ type: '', title: '', date: '', time: '', recurrence: '', note: '' })

  const dateStr = (d: Date) => d.toISOString().slice(0, 10)

  const startOfWeek = (d: Date) => {
    const r = new Date(d)
    const day = r.getDay()
    const diff = r.getDate() - day + (day === 0 ? -6 : 1)
    r.setDate(diff)
    return r
  }

  const endOfWeek = (d: Date) => {
    const r = startOfWeek(d)
    r.setDate(r.getDate() + 6)
    return r
  }

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      let dateEvents: EventOccurrence[] = []
      const overdueEvents = await api.getPlannerOverdue()

      if (mode === 'day') {
        dateEvents = await api.getPlannerDay(dateStr(currentDate))
      } else if (mode === 'week') {
        dateEvents = await api.getPlannerRange(dateStr(startOfWeek(currentDate)), dateStr(endOfWeek(currentDate)))
      } else {
        dateEvents = await api.getPlannerRange(dateStr(startOfMonth(currentDate)), dateStr(endOfMonth(currentDate)))
      }

      setEvents(dateEvents)
      setOverdue(overdueEvents)
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [currentDate, mode, toast])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate)
    if (mode === 'day') d.setDate(d.getDate() + dir)
    else if (mode === 'week') d.setDate(d.getDate() + 7 * dir)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const handleComplete = async (e: EventOccurrence) => {
    try {
      if (e.recurrence) {
        await api.completeEvent(e.id, e.occurrence_date)
      } else {
        await api.completeEvent(e.id)
      }
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

  const formatDateLabel = () => {
    if (mode === 'day') return dateStr(currentDate)
    if (mode === 'week') {
      const sw = startOfWeek(currentDate)
      const ew = endOfWeek(currentDate)
      return `${sw.toLocaleDateString()} — ${ew.toLocaleDateString()}`
    }
    return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }

  const handleDeleteEvent = async (e: EventOccurrence) => {
    if (e.recurrence) {
      const action = confirm('Delete this occurrence or the whole series?\nOK = just this one\nCancel = whole series')
      if (action) {
        await api.skipEventOccurrence(e.id, e.occurrence_date)
        toast('Occurrence skipped', 'success')
      } else {
        if (!confirm('Delete the entire recurring series?')) return
        await api.deleteEvent(e.id)
        toast('Series deleted', 'success')
      }
    } else {
      if (!confirm('Delete this event?')) return
      await api.deleteEvent(e.id)
      toast('Event deleted', 'success')
    }
    loadEvents()
  }

  const startEditEvent = (e: EventOccurrence) => {
    setEditEventForm({
      type: e.type,
      title: e.title,
      date: e.occurrence_date,
      time: e.scheduled_time || '',
      recurrence: e.recurrence || '',
      note: e.note || '',
    })
    setEditingEvent(e)
  }

  const saveEditEvent = async () => {
    if (!editingEvent) return
    try {
      await api.updateEvent(editingEvent.id, {
        type: editEventForm.type as any,
        title: editEventForm.title,
        scheduled_date: editEventForm.date,
        scheduled_time: editEventForm.time || undefined,
        recurrence: editEventForm.recurrence || undefined,
        note: editEventForm.note || undefined,
      })
      toast('Event updated', 'success')
      setEditingEvent(null)
      loadEvents()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const eventsForDate = (date: Date) =>
    events.filter(e => e.occurrence_date === dateStr(date))

  const displayDate = (e: EventOccurrence) => e.recurrence ? e.occurrence_date : e.scheduled_date

  const renderEventCard = (e: EventOccurrence, showTank = true) => (
    <div key={e.id + '-' + e.occurrence_date} className={`event-card ${e.completed ? 'completed' : ''}`}>
      <span className="event-emoji">{eventEmoji(e.type)}</span>
      <div className="event-info">
        <span className="event-title">{e.title}</span>
        {showTank && <span className="event-tank">{tankName(e.tank_id)}</span>}
        <span className="event-date">{displayDate(e)}</span>
        {e.recurrence && <span className="event-recurrence">{RECURRENCE_OPTIONS.find(r => r.value === e.recurrence)?.label}</span>}
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {!e.completed && (
          <button className="btn btn-sm btn-primary" onClick={() => handleComplete(e)}>
            {t('event.complete')}
          </button>
        )}
        {!e.completed && (
          <button className="btn btn-sm btn-secondary" onClick={() => startEditEvent(e)}>✏️</button>
        )}
        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEvent(e)}>🗑️</button>
      </div>
    </div>
  )

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="planner-view">
      <div className="planner-header">
        <div className="planner-tabs">
          <button className={`tab-btn ${mode === 'day' ? 'active' : ''}`} onClick={() => setMode('day')}>{t('planner.today')}</button>
          <button className={`tab-btn ${mode === 'week' ? 'active' : ''}`} onClick={() => setMode('week')}>{t('planner.week')}</button>
          <button className={`tab-btn ${mode === 'month' ? 'active' : ''}`} onClick={() => setMode('month')}>{t('planner.month')}</button>
        </div>
        <div className="planner-nav">
          <button className="icon-btn" onClick={() => navigate(-1)}>◀</button>
          <span className="planner-date">{formatDateLabel()}</span>
          <button className="icon-btn" onClick={() => navigate(1)}>▶</button>
          <button className="btn btn-primary" onClick={() => setShowAddEvent(true)}>+ {t('event.schedule')}</button>
        </div>
      </div>

      <div className="planner-sections">
        {overdue.length > 0 && (
          <div className="planner-section">
            <h3 className="section-title section-overdue">{t('planner.overdue')} ({overdue.length})</h3>
            <div className="event-list">
              {overdue.map(e => renderEventCard(e))}
            </div>
          </div>
        )}

        {mode === 'day' && (
          <div className="planner-section">
            <h3 className="section-title">{formatDateLabel()}</h3>
            {loading ? (
              <div className="loading">{t('common.loading')}</div>
            ) : events.length === 0 ? (
              <div className="empty-state">{t('event.no_events')}</div>
            ) : (
              <div className="event-list">
                {events.map(e => renderEventCard(e))}
              </div>
            )}
          </div>
        )}

        {mode === 'week' && (
          <div className="planner-week">
            {loading ? (
              <div className="loading">{t('common.loading')}</div>
            ) : (
              Array.from({ length: 7 }, (_, i) => {
                const day = new Date(startOfWeek(currentDate))
                day.setDate(day.getDate() + i)
                const dayEvents = eventsForDate(day)
                const isToday = isSameDay(day, new Date())
                return (
                  <div key={i} className={`planner-week-day ${isToday ? 'today' : ''}`}>
                    <div className="planner-week-day-header">
                      <span className="planner-week-day-name">{DAY_NAMES[i]}</span>
                      <span className="planner-week-day-number">{day.getDate()}</span>
                    </div>
                    <div className="planner-week-day-events">
                      {dayEvents.length === 0 ? (
                        <span className="planner-week-empty">—</span>
                      ) : (
                        dayEvents.map(e => (
                          <div key={e.id + '-' + e.occurrence_date} className={`planner-week-event ${e.completed ? 'completed' : ''}`}
                            title={`${e.title} — ${tankName(e.tank_id)}`}>
                            <span>{eventEmoji(e.type)}</span>
                            <span className="planner-week-event-title">{e.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {mode === 'month' && (
          <div>
            {loading ? (
              <div className="loading">{t('common.loading')}</div>
            ) : (
              <>
                <div className="planner-month-grid">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="planner-month-header">{d}</div>
                  ))}
                  {(() => {
                    const sm = startOfMonth(currentDate)
                    const em = endOfMonth(currentDate)
                    const startPad = (sm.getDay() + 6) % 7
                    const cells: React.ReactNode[] = []
                    for (let i = 0; i < startPad; i++) {
                      cells.push(<div key={`pad-${i}`} className="planner-month-cell planner-month-cell-empty" />)
                    }
                    for (let d = 1; d <= em.getDate(); d++) {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d)
                      const dayEvents = eventsForDate(date)
                      const isToday = isSameDay(date, new Date())
                      cells.push(
                        <div key={d} className={`planner-month-cell ${isToday ? 'today' : ''}`}>
                          <span className="planner-month-day-number">{d}</span>
                          {dayEvents.length > 0 && (
                            <div className="planner-month-events">
                              {dayEvents.slice(0, 3).map(e => (
                                <div key={e.id + '-' + e.occurrence_date} className={`planner-month-event ${e.completed ? 'completed' : ''}`}
                                  title={`${e.title} — ${tankName(e.tank_id)}`}>
                                  {eventEmoji(e.type)}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="planner-month-more">+{dayEvents.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                    return cells
                  })()}
                </div>
                <div className="planner-section" style={{ marginTop: '1rem' }}>
                  <h3 className="section-title">{t('planner.today')} ({formatDateLabel()})</h3>
                  {events.length === 0 ? (
                    <div className="empty-state">{t('event.no_events')}</div>
                  ) : (
                    <div className="event-list">
                      {events.map(e => renderEventCard(e))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
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

      {editingEvent && (
        <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Event</h3>
            <div className="form-group">
              <label>{t('event.type')}</label>
              <select value={editEventForm.type} onChange={e => setEditEventForm({ ...editEventForm, type: e.target.value })}>
                {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.emoji} {et.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('event.title')}</label>
              <input value={editEventForm.title} onChange={e => setEditEventForm({ ...editEventForm, title: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('event.date')}</label>
                <input type="date" value={editEventForm.date} onChange={e => setEditEventForm({ ...editEventForm, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('event.time')}</label>
                <input type="time" value={editEventForm.time} onChange={e => setEditEventForm({ ...editEventForm, time: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('event.recurrence')}</label>
              <select value={editEventForm.recurrence} onChange={e => setEditEventForm({ ...editEventForm, recurrence: e.target.value })}>
                {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('event.note')}</label>
              <textarea value={editEventForm.note} onChange={e => setEditEventForm({ ...editEventForm, note: e.target.value })} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={saveEditEvent}>{t('common.save')}</button>
              <button className="btn btn-text" onClick={() => setEditingEvent(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
