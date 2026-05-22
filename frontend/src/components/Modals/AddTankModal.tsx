import React, { useState } from 'react'
import type { TankCreate } from '../../types'
import { TANK_TYPES, SUBTYPES } from '../../types'
import { api } from '../../api/client'
import { useTranslation } from '../../i18n'
import { useToast } from '../UI/Toast'

interface Props {
  onClose: () => void
  onSaved: () => void
}

const PARAM_OPTIONS = [
  { key: 'ammonia', label: 'Ammonia' },
  { key: 'nitrite', label: 'Nitrite' },
  { key: 'nitrate', label: 'Nitrate' },
  { key: 'ph', label: 'pH' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'gh', label: 'General Hardness (GH)' },
  { key: 'kh', label: 'Carbonate Hardness (KH)' },
]

const ALL_PARAM_KEYS = PARAM_OPTIONS.map(p => p.key).join(',')

export function AddTankModal({ onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState<TankCreate>({
    name: '',
    emoji: '🐠',
    liters: 75,
    type: 'freshwater',
    subtype: 'community',
    setup_date: new Date().toISOString().slice(0, 10),
    filter_type: '',
    notes: '',
  })
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [trackedParams, setTrackedParams] = useState<string[]>(PARAM_OPTIONS.map(p => p.key))

  const subtypes = SUBTYPES[form.type] || []

  const toggleParam = (key: string) => {
    setTrackedParams(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.liters || !form.setup_date) {
      toast('Name, liters, and setup date required', 'error')
      return
    }
    try {
      const created = await api.createTank({ ...form, tracked_params: trackedParams.join(',') || ALL_PARAM_KEYS })
      if (pendingPhoto && created?.id) {
        await api.uploadTankPhoto(created.id, pendingPhoto)
      }
      toast('Tank created!', 'success')
      onSaved()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <h2>{t('tank.add')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>{t('tank.name')}</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Emoji</label>
              <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('tank.liters')}</label>
              <input type="number" value={form.liters} onChange={e => setForm({ ...form, liters: Number(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>{t('tank.type')}</label>
              <select value={form.type} onChange={e => {
                const newType = e.target.value
                const subs = SUBTYPES[newType] || []
                setForm({ ...form, type: newType, subtype: subs[0] || '' })
              }}>
                {TANK_TYPES.map(tp => <option key={tp} value={tp}>{t(tp)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('tank.subtype')}</label>
              <select value={form.subtype} onChange={e => setForm({ ...form, subtype: e.target.value })}>
                {subtypes.map(s => <option key={s} value={s}>{t(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('tank.setup_date')}</label>
              <input type="date" value={form.setup_date} onChange={e => setForm({ ...form, setup_date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('tank.filter_type')}</label>
              <input value={form.filter_type} onChange={e => setForm({ ...form, filter_type: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Photo</label>
            <input type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0]
              if (file) setPendingPhoto(file)
            }} />
          </div>
          <div className="form-group">
            <label>Tracked Parameters</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {PARAM_OPTIONS.map(p => (
                <label key={p.key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer',
                  background: trackedParams.includes(p.key) ? 'var(--primary)' : 'var(--surface3)',
                  color: trackedParams.includes(p.key) ? '#fff' : 'var(--text1)',
                  fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                }}>
                  <input
                    type="checkbox"
                    checked={trackedParams.includes(p.key)}
                    onChange={() => toggleParam(p.key)}
                    style={{ display: 'none' }}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>{t('tank.notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{t('tank.add')}</button>
            <button type="button" className="btn btn-text" onClick={onClose}>{t('common.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
