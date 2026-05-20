import React, { useState, useEffect, useCallback } from 'react'
import type { Tank, Inhabitant, Event as EventType, WaterParam } from '../../types'
import { EVENT_TYPES } from '../../types'
import { api } from '../../api/client'
import { useTranslation } from '../../i18n'
import { useToast } from '../UI/Toast'

interface Props {
  tank: Tank
  onClose: () => void
  onUpdated: () => void
}

type Tab = 'info' | 'inhabitants' | 'events' | 'params'

export function TankDetailModal({ tank, onClose, onUpdated }: Props) {
  const { toast } = useToast()
  const { t: tr } = useTranslation()
  const [tab, setTab] = useState<Tab>('info')
  const [inhabitants, setInhabitants] = useState<Inhabitant[]>([])
  const [events, setEvents] = useState<EventType[]>([])
  const [params, setParams] = useState<WaterParam[]>([])
  const [showAddInhab, setShowAddInhab] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showLogParam, setShowLogParam] = useState(false)
  const [newInhab, setNewInhab] = useState({ name: '', species: '', count: 1, emoji: '🐟', added_date: new Date().toISOString().slice(0, 10), notes: '' })
  const [newEv, setNewEv] = useState({ type: 'feed' as const, title: '', scheduled_date: new Date().toISOString().slice(0, 10), recurrence: '', note: '' })
  const [newParam, setNewParam] = useState({ ammonia: '', nitrite: '', nitrate: '', ph: '', temperature: '', gh: '', kh: '', notes: '' })
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: tank.name, emoji: tank.emoji, gallons: tank.gallons, filter_type: tank.filter_type, notes: tank.notes })

  const loadData = useCallback(async () => {
    try {
      const [inhabs, evts, prms] = await Promise.all([
        api.listInhabitants(tank.id),
        api.listEventsByTank(tank.id),
        api.listParams(tank.id),
      ])
      setInhabitants(inhabs)
      setEvents(evts)
      setParams(prms)
    } catch {}
  }, [tank.id])

  useEffect(() => { loadData() }, [loadData])

  const handleAddInhabitant = async () => {
    try {
      await api.createInhabitant({ tank_id: tank.id, ...newInhab, count: newInhab.count })
      toast('Inhabitant added', 'success')
      setShowAddInhab(false)
      setNewInhab({ name: '', species: '', count: 1, emoji: '🐟', added_date: new Date().toISOString().slice(0, 10), notes: '' })
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleDeleteInhabitant = async (id: number) => {
    try {
      await api.deleteInhabitant(id)
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleAddEvent = async () => {
    try {
      await api.createEvent({ tank_id: tank.id, ...newEv })
      toast('Event added', 'success')
      setShowAddEvent(false)
      setNewEv({ type: 'feed', title: '', scheduled_date: new Date().toISOString().slice(0, 10), recurrence: '', note: '' })
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleCompleteEvent = async (id: number) => {
    try {
      await api.completeEvent(id)
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleLogParam = async () => {
    try {
      const data: any = { tank_id: tank.id }
      if (newParam.ammonia) data.ammonia = parseFloat(newParam.ammonia)
      if (newParam.nitrite) data.nitrite = parseFloat(newParam.nitrite)
      if (newParam.nitrate) data.nitrate = parseFloat(newParam.nitrate)
      if (newParam.ph) data.ph = parseFloat(newParam.ph)
      if (newParam.temperature) data.temperature = parseFloat(newParam.temperature)
      if (newParam.gh) data.gh = parseFloat(newParam.gh)
      if (newParam.kh) data.kh = parseFloat(newParam.kh)
      data.notes = newParam.notes
      await api.createParam(data)
      toast('Water test logged', 'success')
      setShowLogParam(false)
      setNewParam({ ammonia: '', nitrite: '', nitrate: '', ph: '', temperature: '', gh: '', kh: '', notes: '' })
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleSaveEdit = async () => {
    try {
      await api.updateTank(tank.id, editForm)
      toast('Tank updated', 'success')
      setEditing(false)
      onUpdated()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleDeleteTank = async () => {
    if (!confirm(tr('tank.delete_confirm'))) return
    try {
      await api.deleteTank(tank.id)
      toast('Tank deleted', 'success')
      onUpdated()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const eventEmoji = (type: string) => EVENT_TYPES.find(e => e.value === type)?.emoji || '📋'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-tabs">
          <button className={`tab-btn ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>{tr('tank.name')}</button>
          <button className={`tab-btn ${tab === 'inhabitants' ? 'active' : ''}`} onClick={() => setTab('inhabitants')}>{tr('tank.inhabitants')}</button>
          <button className={`tab-btn ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>{tr('nav.planner')}</button>
          <button className={`tab-btn ${tab === 'params' ? 'active' : ''}`} onClick={() => setTab('params')}>{tr('param.history')}</button>
        </div>

        <div className="modal-body">
          {tab === 'info' && (
            <div>
              {!editing ? (
                <div>
                  <h2>{tank.emoji} {tank.name}</h2>
                  <div className="detail-grid">
                    <div><strong>{tr('tank.gallons')}:</strong> {tank.gallons}gal</div>
                    <div><strong>{tr('tank.type')}:</strong> {tr(tank.type)}</div>
                    <div><strong>{tr('tank.subtype')}:</strong> {tr(tank.subtype)}</div>
                    <div><strong>{tr('tank.setup_date')}:</strong> {tank.setup_date}</div>
                    <div><strong>{tr('tank.filter_type')}:</strong> {tank.filter_type || '—'}</div>
                    <div><strong>{tr('tank.notes')}:</strong> {tank.notes || '—'}</div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={() => setEditing(true)}>{tr('tank.edit')}</button>
                    <button className="btn btn-danger" onClick={handleDeleteTank}>{tr('tank.delete')}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2>{tr('tank.edit')}</h2>
                  <div className="form-group">
                    <label>{tr('tank.name')}</label>
                    <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Emoji</label>
                    <input value={editForm.emoji} onChange={e => setEditForm({ ...editForm, emoji: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{tr('tank.gallons')}</label>
                    <input type="number" value={editForm.gallons} onChange={e => setEditForm({ ...editForm, gallons: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label>{tr('tank.filter_type')}</label>
                    <input value={editForm.filter_type} onChange={e => setEditForm({ ...editForm, filter_type: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{tr('tank.notes')}</label>
                    <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={handleSaveEdit}>{tr('common.save')}</button>
                    <button className="btn btn-text" onClick={() => setEditing(false)}>{tr('common.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'inhabitants' && (
            <div>
              <button className="btn btn-primary" onClick={() => setShowAddInhab(true)}>+ {tr('inhabitant.add')}</button>
              {inhabitants.length === 0 ? (
                <p className="empty-state">{tr('inhabitant.no_inhabitants')}</p>
              ) : (
                <div className="inhabitant-list">
                  {inhabitants.map(inhab => (
                    <div key={inhab.id} className="inhabitant-card">
                      <span className="inhab-emoji">{inhab.emoji}</span>
                      <div className="inhab-info">
                        <span className="inhab-name">{inhab.name || tr('inhabitant.name')}</span>
                        <span className="inhab-species">{inhab.species}</span>
                        <span className="inhab-count">x{inhab.count}</span>
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteInhabitant(inhab.id)}>{tr('common.delete')}</button>
                    </div>
                  ))}
                </div>
              )}
              {showAddInhab && (
                <div className="modal-inline">
                  <div className="form-row">
                    <div className="form-group">
                      <label>{tr('inhabitant.name')}</label>
                      <input value={newInhab.name} onChange={e => setNewInhab({ ...newInhab, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>{tr('inhabitant.species')}</label>
                      <input value={newInhab.species} onChange={e => setNewInhab({ ...newInhab, species: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{tr('inhabitant.count')}</label>
                      <input type="number" value={newInhab.count} onChange={e => setNewInhab({ ...newInhab, count: Number(e.target.value) })} />
                    </div>
                    <div className="form-group">
                      <label>Emoji</label>
                      <input value={newInhab.emoji} onChange={e => setNewInhab({ ...newInhab, emoji: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={handleAddInhabitant}>{tr('common.add')}</button>
                    <button className="btn btn-text" onClick={() => setShowAddInhab(false)}>{tr('common.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'events' && (
            <div>
              <button className="btn btn-primary" onClick={() => setShowAddEvent(true)}>+ {tr('event.schedule')}</button>
              {events.length === 0 ? (
                <p className="empty-state">{tr('event.no_events')}</p>
              ) : (
                <div className="event-list">
                  {events.map(e => (
                    <div key={e.id} className={`event-card ${e.completed_at ? 'completed' : ''}`}>
                      <span className="event-emoji">{eventEmoji(e.type)}</span>
                      <div className="event-info">
                        <span className="event-title">{e.title}</span>
                        <span className="event-date">{e.scheduled_date}</span>
                        {e.recurrence && <span className="event-recurrence">{e.recurrence}</span>}
                      </div>
                      {!e.completed_at && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleCompleteEvent(e.id)}>{tr('event.complete')}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showAddEvent && (
                <div className="modal-inline">
                  <div className="form-row">
                    <div className="form-group">
                      <label>{tr('event.type')}</label>
                      <select value={newEv.type} onChange={e => setNewEv({ ...newEv, type: e.target.value as any })}>
                        {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.emoji} {et.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{tr('event.title')}</label>
                      <input value={newEv.title} onChange={e => setNewEv({ ...newEv, title: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{tr('event.date')}</label>
                      <input type="date" value={newEv.scheduled_date} onChange={e => setNewEv({ ...newEv, scheduled_date: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>{tr('event.recurrence')}</label>
                      <select value={newEv.recurrence} onChange={e => setNewEv({ ...newEv, recurrence: e.target.value })}>
                        <option value="">None</option>
                        <option value="1d">Every Day</option>
                        <option value="2d">Every 2 Days</option>
                        <option value="7d">Weekly</option>
                        <option value="14d">Every 2 Weeks</option>
                        <option value="30d">Monthly</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={handleAddEvent}>{tr('common.add')}</button>
                    <button className="btn btn-text" onClick={() => setShowAddEvent(false)}>{tr('common.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'params' && (
            <div>
              <button className="btn btn-primary" onClick={() => setShowLogParam(true)}>+ {tr('param.log')}</button>
              {params.length === 0 ? (
                <p className="empty-state">{tr('param.no_data')}</p>
              ) : (
                <div className="params-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{tr('param.tested_at')}</th>
                        <th>NH3</th>
                        <th>NO2</th>
                        <th>NO3</th>
                        <th>pH</th>
                        <th>Temp</th>
                        <th>GH</th>
                        <th>KH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.map(p => (
                        <tr key={p.id}>
                          <td>{p.tested_at}</td>
                          <td>{p.ammonia ?? '—'}</td>
                          <td>{p.nitrite ?? '—'}</td>
                          <td>{p.nitrate ?? '—'}</td>
                          <td>{p.ph ?? '—'}</td>
                          <td>{p.temperature ?? '—'}</td>
                          <td>{p.gh ?? '—'}</td>
                          <td>{p.kh ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {showLogParam && (
                <div className="modal-inline">
                  <div className="form-row">
                    <div className="form-group"><label>NH3</label><input type="number" step="0.01" value={newParam.ammonia} onChange={e => setNewParam({ ...newParam, ammonia: e.target.value })} /></div>
                    <div className="form-group"><label>NO2</label><input type="number" step="0.01" value={newParam.nitrite} onChange={e => setNewParam({ ...newParam, nitrite: e.target.value })} /></div>
                    <div className="form-group"><label>NO3</label><input type="number" step="0.1" value={newParam.nitrate} onChange={e => setNewParam({ ...newParam, nitrate: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>pH</label><input type="number" step="0.1" value={newParam.ph} onChange={e => setNewParam({ ...newParam, ph: e.target.value })} /></div>
                    <div className="form-group"><label>{tr('param.temperature')}</label><input type="number" step="0.1" value={newParam.temperature} onChange={e => setNewParam({ ...newParam, temperature: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>GH</label><input type="number" step="0.1" value={newParam.gh} onChange={e => setNewParam({ ...newParam, gh: e.target.value })} /></div>
                    <div className="form-group"><label>KH</label><input type="number" step="0.1" value={newParam.kh} onChange={e => setNewParam({ ...newParam, kh: e.target.value })} /></div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={handleLogParam}>{tr('common.save')}</button>
                    <button className="btn btn-text" onClick={() => setShowLogParam(false)}>{tr('common.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
