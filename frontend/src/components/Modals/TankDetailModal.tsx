import React, { useState, useEffect, useCallback } from 'react'
import type { Tank, Inhabitant, Event as EventType, Issue, IssueCreate, IssuePhoto, WaterParam } from '../../types'
import { EVENT_TYPES, RECURRENCE_OPTIONS } from '../../types'
import { api } from '../../api/client'
import { useTranslation } from '../../i18n'
import { useToast } from '../UI/Toast'
import { useConfirm } from '../UI/ConfirmDialog'
import { ParamChart } from '../Charts/ParamChart'
import { WaterParamDiagram } from '../Charts/WaterParamDiagram'

interface Props {
  tank: Tank
  onClose: () => void
  onUpdated: () => void
}

type Tab = 'info' | 'inhabitants' | 'events' | 'issues' | 'params'

export function TankDetailModal({ tank, onClose, onUpdated }: Props) {
  const { toast } = useToast()
  const confirm = useConfirm()
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
  const [editForm, setEditForm] = useState({ name: tank.name, emoji: tank.emoji, liters: tank.liters, filter_type: tank.filter_type, notes: tank.notes })
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null)
  const [editEventForm, setEditEventForm] = useState({ type: '', title: '', date: '', time: '', recurrence: '', note: '' })
  const [issues, setIssues] = useState<Issue[]>([])
  const [paramRanges, setParamRanges] = useState<any[]>([])
  const [showAddIssue, setShowAddIssue] = useState(false)
  const [newIssue, setNewIssue] = useState({ title: '', description: '', observed_date: new Date().toISOString().slice(0, 10) })
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null)
  const [viewingIssuePhotos, setViewingIssuePhotos] = useState<IssuePhoto[]>([])
  const [editIssueForm, setEditIssueForm] = useState({ title: '', description: '', observed_date: '' })
  const [issuePhotoFile, setIssuePhotoFile] = useState<File | null>(null)
  const [extraPhotoFile, setExtraPhotoFile] = useState<File | null>(null)
  const [extraPhotoCaption, setExtraPhotoCaption] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [inhabs, evts, prms, iss] = await Promise.all([
        api.listInhabitants(tank.id),
        api.listUpcomingEvents(tank.id, 5),
        api.listParams(tank.id),
        api.listIssues(tank.id),
      ])
      setInhabitants(inhabs)
      setEvents(evts)
      setParams(prms)
      setIssues(iss)
      const ranges = await api.listParamRanges()
      setParamRanges(ranges)
    } catch (err) {
      toast('Failed to load tank data', 'error')
    }
  }, [tank.id, toast])

  useEffect(() => {
    setSavedPhotoUrl(null)
  }, [tank.id])

  useEffect(() => { loadData() }, [loadData])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  useEffect(() => {
    if (viewingIssue) {
      api.listIssuePhotos(viewingIssue.id).then(setViewingIssuePhotos).catch(() => setViewingIssuePhotos([]))
    }
  }, [viewingIssue])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

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
    if (!(await confirm('Delete this inhabitant?'))) return
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

  const handleDeleteEvent = async (id: number) => {
    if (!(await confirm('Delete this event?'))) return
    try {
      await api.deleteEvent(id)
      toast('Event deleted', 'success')
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const startEditEvent = (e: EventType) => {
    setEditEventForm({
      type: e.type,
      title: e.title,
      date: e.scheduled_date,
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
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleAddIssue = async () => {
    if (!newIssue.title.trim()) {
      toast('Enter a title', 'error')
      return
    }
    try {
      const issue: IssueCreate = { tank_id: tank.id, title: newIssue.title, description: newIssue.description, observed_date: newIssue.observed_date }
      const created = await api.createIssue(issue)
      if (issuePhotoFile) {
        await api.uploadIssuePhoto(created.id, issuePhotoFile)
      }
      toast('Issue logged', 'success')
      setShowAddIssue(false)
      setNewIssue({ title: '', description: '', observed_date: new Date().toISOString().slice(0, 10) })
      setIssuePhotoFile(null)
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleDeleteIssue = async (id: number) => {
    if (!(await confirm('Delete this issue?'))) return
    try {
      await api.deleteIssue(id)
      toast('Issue deleted', 'success')
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const startEditIssue = (iss: Issue) => {
    setEditIssueForm({ title: iss.title, description: iss.description, observed_date: iss.observed_date })
    setIssuePhotoFile(null)
    setEditingIssue(iss)
  }

  const saveEditIssue = async () => {
    if (!editingIssue) return
    try {
      await api.updateIssue(editingIssue.id, {
        title: editIssueForm.title,
        description: editIssueForm.description,
        observed_date: editIssueForm.observed_date,
        resolved_at: editingIssue.resolved_at,
      })
      if (issuePhotoFile) {
        await api.uploadIssuePhoto(editingIssue.id, issuePhotoFile)
      }
      toast('Issue updated', 'success')
      setEditingIssue(null)
      setIssuePhotoFile(null)
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleResolveIssue = async (iss: Issue) => {
    try {
      await api.updateIssue(iss.id, { resolved_at: new Date().toISOString() })
      toast('Issue resolved', 'success')
      loadData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleLogParam = async () => {
    try {
      const data: any = { tank_id: tank.id }
      if (newParam.ammonia !== '' && newParam.ammonia != null) data.ammonia = parseFloat(newParam.ammonia)
      if (newParam.nitrite !== '' && newParam.nitrite != null) data.nitrite = parseFloat(newParam.nitrite)
      if (newParam.nitrate !== '' && newParam.nitrate != null) data.nitrate = parseFloat(newParam.nitrate)
      if (newParam.ph !== '' && newParam.ph != null) data.ph = parseFloat(newParam.ph)
      if (newParam.temperature !== '' && newParam.temperature != null) data.temperature = parseFloat(newParam.temperature)
      if (newParam.gh !== '' && newParam.gh != null) data.gh = parseFloat(newParam.gh)
      if (newParam.kh !== '' && newParam.kh != null) data.kh = parseFloat(newParam.kh)
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
      const updateData: any = { ...editForm }
      let photoURL = tank.photo_url
      if (pendingPhoto) {
        const result = await api.uploadTankPhoto(tank.id, pendingPhoto)
        photoURL = result.photo_url
      }
      updateData.photo_url = photoURL
      await api.updateTank(tank.id, updateData)
      if (photoURL) setSavedPhotoUrl(photoURL + '?t=' + Date.now())
      toast('Tank updated', 'success')
      setEditing(false)
      setPendingPhoto(null)
      setPhotoPreview(null)
      onUpdated()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleDeleteTank = async () => {
    if (!(await confirm(tr('tank.delete_confirm')))) return
    try {
      await api.deleteTank(tank.id)
      toast('Tank deleted', 'success')
      onUpdated()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const trackedParams = tank.tracked_params ? tank.tracked_params.split(',') : ['ammonia','nitrite','nitrate','ph','temperature','gh','kh']

  const eventEmoji = (type: string) => EVENT_TYPES.find(e => e.value === type)?.emoji || '📋'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-tabs">
          <button className={`tab-btn ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>{tr('tank.name')}</button>
          <button className={`tab-btn ${tab === 'inhabitants' ? 'active' : ''}`} onClick={() => setTab('inhabitants')}>{tr('tank.inhabitants')}</button>
          <button className={`tab-btn ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>{tr('nav.planner')}</button>
          <button className={`tab-btn ${tab === 'issues' ? 'active' : ''}`} onClick={() => setTab('issues')}>{tr('issue.title')}</button>
          <button className={`tab-btn ${tab === 'params' ? 'active' : ''}`} onClick={() => setTab('params')}>{tr('param.history')}</button>
        </div>

        <div className="modal-body">
          {tab === 'info' && (
            <div>
              {!editing ? (
                <div>
                  {(savedPhotoUrl ?? tank.photo_url) ? (
                    <img className="detail-photo clickable-photo" src={savedPhotoUrl ?? tank.photo_url!} alt={tank.name} onClick={() => setShowLightbox(true)} />
                  ) : (
                    <span className="detail-emoji">{tank.emoji}</span>
                  )}
                  <h2>{tank.emoji} {tank.name}</h2>
                  <div className="detail-grid">
                    <div><strong>{tr('tank.liters')}:</strong> {tank.liters}L</div>
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
                  {(photoPreview || savedPhotoUrl || tank.photo_url) && (
                    <img className="detail-photo" src={photoPreview || savedPhotoUrl || tank.photo_url!} alt={tank.name} />
                  )}
                  <div className="form-group">
                    <label>Photo</label>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} />
                  </div>
                  <div className="form-group">
                    <label>{tr('tank.name')}</label>
                    <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Emoji</label>
                    <input value={editForm.emoji} onChange={e => setEditForm({ ...editForm, emoji: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{tr('tank.liters')}</label>
                    <input type="number" value={editForm.liters} onChange={e => setEditForm({ ...editForm, liters: Number(e.target.value) })} />
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
                    <button className="btn btn-text" onClick={() => { setEditing(false); setPendingPhoto(null); setPhotoPreview(null) }}>{tr('common.cancel')}</button>
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
                        {e.recurrence && <span className="event-recurrence">{RECURRENCE_OPTIONS.find(r => r.value === e.recurrence)?.label}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {!e.completed_at && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleCompleteEvent(e.id)}>{tr('event.complete')}</button>
                        )}
                        {!e.completed_at && (
                          <button className="btn btn-sm btn-secondary" onClick={() => startEditEvent(e)}>✏️</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEvent(e.id)}>🗑️</button>
                      </div>
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
                      {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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

          {tab === 'issues' && (
            <div>
              <button className="btn btn-primary" onClick={() => setShowAddIssue(true)}>+ {tr('issue.add')}</button>
              {issues.length === 0 ? (
                <p className="empty-state">{tr('issue.no_issues')}</p>
              ) : (
                <div className="event-list">
                  {issues.map(iss => (
                    <div key={iss.id} className={`event-card ${iss.resolved_at ? 'completed' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setViewingIssue(iss)}>
                      {iss.photo_url && <img src={iss.photo_url} alt={iss.title} className="issue-thumb" />}
                      <div className="event-info">
                        <span className="event-title">{iss.title}</span>
                        <span className="event-date">{iss.observed_date}</span>
                        {iss.description && <span className="event-note">{iss.description}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        {!iss.resolved_at && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleResolveIssue(iss)}>{tr('issue.resolve')}</button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => startEditIssue(iss)}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteIssue(iss.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showAddIssue && (
                <div className="modal-inline">
                  <div className="form-row">
                    <div className="form-group">
                      <label>{tr('issue.name')}</label>
                      <input value={newIssue.title} onChange={e => setNewIssue({ ...newIssue, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>{tr('issue.date')}</label>
                      <input type="date" value={newIssue.observed_date} onChange={e => setNewIssue({ ...newIssue, observed_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{tr('issue.details')}</label>
                    <textarea value={newIssue.description} onChange={e => setNewIssue({ ...newIssue, description: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{tr('issue.photo')}</label>
                    <input type="file" accept="image/*" onChange={e => setIssuePhotoFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={handleAddIssue}>{tr('common.add')}</button>
                    <button className="btn btn-text" onClick={() => { setShowAddIssue(false); setIssuePhotoFile(null) }}>{tr('common.cancel')}</button>
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
                <>
                  <WaterParamDiagram params={params} trackedParams={trackedParams} paramRanges={paramRanges} tankSubtype={tank.subtype} />
                  <ParamChart params={params} trackedParams={trackedParams} />
                  <div className="params-table">
                    <table>
                      <thead>
                        <tr>
                          <th>{tr('param.tested_at')}</th>
                          {trackedParams.includes('ammonia') && <th>Ammonia</th>}
                          {trackedParams.includes('nitrite') && <th>Nitrite</th>}
                          {trackedParams.includes('nitrate') && <th>Nitrate</th>}
                          {trackedParams.includes('ph') && <th>pH</th>}
                          {trackedParams.includes('temperature') && <th>Temperature</th>}
                          {trackedParams.includes('gh') && <th>GH</th>}
                          {trackedParams.includes('kh') && <th>KH</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {params.map(p => (
                          <tr key={p.id}>
                            <td>{p.tested_at}</td>
                            {trackedParams.includes('ammonia') && <td>{p.ammonia ?? '—'}</td>}
                            {trackedParams.includes('nitrite') && <td>{p.nitrite ?? '—'}</td>}
                            {trackedParams.includes('nitrate') && <td>{p.nitrate ?? '—'}</td>}
                            {trackedParams.includes('ph') && <td>{p.ph ?? '—'}</td>}
                            {trackedParams.includes('temperature') && <td>{p.temperature ?? '—'}</td>}
                            {trackedParams.includes('gh') && <td>{p.gh ?? '—'}</td>}
                            {trackedParams.includes('kh') && <td>{p.kh ?? '—'}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {editingEvent && (
        <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Event</h3>
            <div className="form-group">
              <label>{tr('event.type')}</label>
              <select value={editEventForm.type} onChange={e => setEditEventForm({ ...editEventForm, type: e.target.value })}>
                {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.emoji} {et.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{tr('event.title')}</label>
              <input value={editEventForm.title} onChange={e => setEditEventForm({ ...editEventForm, title: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{tr('event.date')}</label>
                <input type="date" value={editEventForm.date} onChange={e => setEditEventForm({ ...editEventForm, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{tr('event.time')}</label>
                <input type="time" value={editEventForm.time} onChange={e => setEditEventForm({ ...editEventForm, time: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>{tr('event.recurrence')}</label>
              <select value={editEventForm.recurrence} onChange={e => setEditEventForm({ ...editEventForm, recurrence: e.target.value })}>
                {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{tr('event.note')}</label>
              <textarea value={editEventForm.note} onChange={e => setEditEventForm({ ...editEventForm, note: e.target.value })} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={saveEditEvent}>{tr('common.save')}</button>
              <button className="btn btn-text" onClick={() => setEditingEvent(null)}>{tr('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {editingIssue && (
        <div className="modal-overlay" onClick={() => setEditingIssue(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{tr('issue.edit')}</h3>
            <div className="form-group">
              <label>{tr('issue.name')}</label>
              <input value={editIssueForm.title} onChange={e => setEditIssueForm({ ...editIssueForm, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{tr('issue.date')}</label>
              <input type="date" value={editIssueForm.observed_date} onChange={e => setEditIssueForm({ ...editIssueForm, observed_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{tr('issue.details')}</label>
              <textarea value={editIssueForm.description} onChange={e => setEditIssueForm({ ...editIssueForm, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{tr('issue.photo')}</label>
              <input type="file" accept="image/*" onChange={e => setIssuePhotoFile(e.target.files?.[0] || null)} />
              {editingIssue.photo_url && <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Current: {editingIssue.photo_url.split('/').pop()}</p>}
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={saveEditIssue}>{tr('common.save')}</button>
              <button className="btn btn-text" onClick={() => { setEditingIssue(null); setIssuePhotoFile(null) }}>{tr('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showLightbox && (savedPhotoUrl ?? tank.photo_url) && (
        <div className="lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <img className="lightbox-image" src={savedPhotoUrl ?? tank.photo_url!} alt={tank.name} />
        </div>
      )}

      {showLogParam && (
        <div className="modal-overlay" onClick={() => setShowLogParam(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{tr('param.log')}</h3>
            <div className="form-row">
              {trackedParams.includes('ammonia') && <div className="form-group"><label>Ammonia</label><input type="number" step="0.01" value={newParam.ammonia} onChange={e => setNewParam({ ...newParam, ammonia: e.target.value })} /></div>}
              {trackedParams.includes('nitrite') && <div className="form-group"><label>Nitrite</label><input type="number" step="0.01" value={newParam.nitrite} onChange={e => setNewParam({ ...newParam, nitrite: e.target.value })} /></div>}
              {trackedParams.includes('nitrate') && <div className="form-group"><label>Nitrate</label><input type="number" step="0.1" value={newParam.nitrate} onChange={e => setNewParam({ ...newParam, nitrate: e.target.value })} /></div>}
            </div>
            <div className="form-row">
              {trackedParams.includes('ph') && <div className="form-group"><label>pH</label><input type="number" step="0.1" value={newParam.ph} onChange={e => setNewParam({ ...newParam, ph: e.target.value })} /></div>}
              {trackedParams.includes('temperature') && <div className="form-group"><label>Temperature</label><input type="number" step="0.1" value={newParam.temperature} onChange={e => setNewParam({ ...newParam, temperature: e.target.value })} /></div>}
            </div>
            <div className="form-row">
              {trackedParams.includes('gh') && <div className="form-group"><label>General Hardness (GH)</label><input type="number" step="0.1" value={newParam.gh} onChange={e => setNewParam({ ...newParam, gh: e.target.value })} /></div>}
              {trackedParams.includes('kh') && <div className="form-group"><label>Carbonate Hardness (KH)</label><input type="number" step="0.1" value={newParam.kh} onChange={e => setNewParam({ ...newParam, kh: e.target.value })} /></div>}
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleLogParam}>{tr('common.save')}</button>
              <button className="btn btn-text" onClick={() => setShowLogParam(false)}>{tr('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {viewingIssue && (
        <div className="modal-overlay" onClick={() => setViewingIssue(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>{viewingIssue.title}</h3>
            <div className="detail-grid">
              <div><strong>{tr('issue.date')}:</strong> {viewingIssue.observed_date}</div>
              <div><strong>{tr('issue.status')}:</strong> {viewingIssue.resolved_at ? '✅ Resolved' : '🔴 Open'}</div>
              {viewingIssue.resolved_at && <div><strong>{tr('issue.resolved_at')}:</strong> {viewingIssue.resolved_at}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {viewingIssue.photo_url && (
                <img src={viewingIssue.photo_url} alt={viewingIssue.title}
                  style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 8, background: 'var(--surface3)' }} />
              )}
              {viewingIssuePhotos.map(ph => (
                <div key={ph.id} style={{ position: 'relative' }}>
                  <img src={ph.photo_url} alt={ph.caption || ''}
                    style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 8, background: 'var(--surface3)' }} />
                  {ph.caption && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text2)', marginTop: '0.2rem' }}>{ph.caption}</span>}
                  <button className="btn btn-sm btn-danger"
                    style={{ position: 'absolute', top: 4, right: 4 }}
                    onClick={async () => {
                      if (!(await confirm('Delete this photo?'))) return
                      await api.deleteIssuePhoto(ph.id)
                      setViewingIssuePhotos(prev => prev.filter(p => p.id !== ph.id))
                    }}>🗑️</button>
                </div>
              ))}
            </div>

            {viewingIssue.description && (
              <p style={{ marginTop: '0.75rem', color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{viewingIssue.description}</p>
            )}

            <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--surface2)', borderRadius: 8 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)' }}>{tr('issue.add_photo')}</label>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', alignItems: 'center' }}>
                <input type="file" accept="image/*" onChange={e => setExtraPhotoFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8rem', flex: 1 }} />
                <input type="text" placeholder={tr('issue.photo_caption')} value={extraPhotoCaption}
                  onChange={e => setExtraPhotoCaption(e.target.value)} style={{ fontSize: '0.8rem', width: 120 }} />
                <button className="btn btn-sm btn-primary" disabled={!extraPhotoFile}
                  onClick={async () => {
                    if (!extraPhotoFile) return
                    try {
                      await api.uploadIssueExtraPhoto(viewingIssue.id, extraPhotoFile, extraPhotoCaption)
                      const photos = await api.listIssuePhotos(viewingIssue.id)
                      setViewingIssuePhotos(photos)
                      setExtraPhotoFile(null)
                      setExtraPhotoCaption('')
                      loadData()
                    } catch (err: any) { toast(err.message, 'error') }
                  }}>+</button>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '0.75rem' }}>
              {!viewingIssue.resolved_at && (
                <button className="btn btn-primary" onClick={() => { handleResolveIssue(viewingIssue); setViewingIssue(null) }}>{tr('issue.resolve')}</button>
              )}
              <button className="btn btn-secondary" onClick={() => { setEditingIssue(viewingIssue); setEditIssueForm({ title: viewingIssue.title, description: viewingIssue.description, observed_date: viewingIssue.observed_date }); setViewingIssue(null) }}>{tr('tank.edit')}</button>
              <button className="btn btn-text" onClick={() => setViewingIssue(null)}>{tr('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
