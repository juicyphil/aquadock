import React, { useState } from 'react'
import type { TankCreate, InhabitantCreate } from '../../types'
import { TANK_TYPES, SUBTYPES, EVENT_TYPES, RECURRENCE_OPTIONS } from '../../types'
import { api } from '../../api/client'
import { useTranslation } from '../../i18n'
import { useToast } from '../UI/Toast'

const DEFAULT_EVENTS = [
  { type: 'feed', key: 'onboarding.events_feed', recurrence: '1d', checked: true },
  { type: 'water_change', key: 'onboarding.events_water', recurrence: '7d', checked: true },
  { type: 'test_water', key: 'onboarding.events_test', recurrence: '7d', checked: true },
  { type: 'clean_filter', key: 'onboarding.events_filter', recurrence: '14d', checked: false },
]

interface Props {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [tank, setTank] = useState<TankCreate>({
    name: '', emoji: '🐠', liters: 75, type: 'freshwater', subtype: 'community',
    setup_date: new Date().toISOString().slice(0, 10), filter_type: '', notes: '',
  })
  const [inhabitants, setInhabitants] = useState<InhabitantCreate[]>([])
  const [newInhab, setNewInhab] = useState({ name: '', species: '', count: 1, emoji: '🐟' })
  const [selectedEvents, setSelectedEvents] = useState(DEFAULT_EVENTS)

  const subtypes = SUBTYPES[tank.type] || []

  const addInhabitant = () => {
    if (!newInhab.species.trim()) return
    setInhabitants([...inhabitants, { ...newInhab, tank_id: 0 }])
    setNewInhab({ name: '', species: '', count: 1, emoji: '🐟' })
  }

  const toggleEvent = (idx: number) => {
    const updated = [...selectedEvents]
    updated[idx] = { ...updated[idx], checked: !updated[idx].checked }
    setSelectedEvents(updated)
  }

  const finish = async () => {
    setBusy(true)
    try {
      if (tank.name.trim()) {
        const created = await api.createTank({ ...tank, tracked_params: 'ammonia,nitrite,nitrate,ph,temperature,gh,kh' })
        const id = created.id
        for (const inh of inhabitants) {
          await api.createInhabitant({ ...inh, tank_id: id })
        }
        for (const ev of selectedEvents) {
          if (!ev.checked) continue
          await api.createEvent({
            tank_id: id, type: ev.type as any, title: t(ev.key),
            scheduled_date: new Date().toISOString().slice(0, 10),
            recurrence: ev.recurrence,
          })
        }
      }
      localStorage.setItem('aquadock_onboarded', 'true')
      onComplete()
    } catch (err: any) {
      toast(err?.message || 'Something went wrong', 'error')
      setBusy(false)
    }
  }

  const steps = [
    <div key="welcome" className="onboarding-step">
      <div style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '1rem' }}>🐠</div>
      <h2 style={{ textAlign: 'center' }}>{t('onboarding.welcome_title')}</h2>
      <p style={{ color: 'var(--text2)', textAlign: 'center', lineHeight: 1.6 }}>{t('onboarding.welcome_desc')}</p>
    </div>,

    <div key="tank" className="onboarding-step">
      <h2>{t('onboarding.step_tank')}</h2>
      <div className="form-row">
        <div className="form-group">
          <label>{t('tank.name')}</label>
          <input value={tank.name} onChange={e => setTank({ ...tank, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Emoji</label>
          <input value={tank.emoji} onChange={e => setTank({ ...tank, emoji: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t('tank.liters')}</label>
          <input type="number" value={tank.liters} onChange={e => setTank({ ...tank, liters: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label>{t('tank.type')}</label>
          <select value={tank.type} onChange={e => {
            const nt = e.target.value
            const subs = SUBTYPES[nt] || []
            setTank({ ...tank, type: nt, subtype: subs[0] || '' })
          }}>
            {TANK_TYPES.map(tp => <option key={tp} value={tp}>{t(tp)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t('tank.subtype')}</label>
          <select value={tank.subtype} onChange={e => setTank({ ...tank, subtype: e.target.value })}>
            {subtypes.map(s => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t('tank.setup_date')}</label>
          <input type="date" value={tank.setup_date} onChange={e => setTank({ ...tank, setup_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('tank.filter_type')}</label>
          <input value={tank.filter_type} onChange={e => setTank({ ...tank, filter_type: e.target.value })} />
        </div>
      </div>
    </div>,

    <div key="inhab" className="onboarding-step">
      <h2>{t('onboarding.step_inhabitants')}</h2>
      <p style={{ color: 'var(--text2)', marginBottom: '1rem' }}>{t('onboarding.inhabitants_hint')}</p>
      {inhabitants.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {inhabitants.map((inh, i) => (
            <div key={i} style={{ padding: '0.3rem 0', color: 'var(--text2)', fontSize: '0.9rem' }}>
              {inh.emoji} {inh.species} x{inh.count}
            </div>
          ))}
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label>{t('inhabitant.species')}</label>
          <input value={newInhab.species} onChange={e => setNewInhab({ ...newInhab, species: e.target.value })} placeholder="e.g. Neon Tetra" />
        </div>
        <div className="form-group">
          <label>{t('inhabitant.name')}</label>
          <input value={newInhab.name} onChange={e => setNewInhab({ ...newInhab, name: e.target.value })} placeholder={t('common.skip')} />
        </div>
        <div className="form-group">
          <label>{t('inhabitant.count')}</label>
          <input type="number" min={1} value={newInhab.count} onChange={e => setNewInhab({ ...newInhab, count: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label>Emoji</label>
          <input value={newInhab.emoji} onChange={e => setNewInhab({ ...newInhab, emoji: e.target.value })} />
        </div>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={addInhabitant} disabled={!newInhab.species.trim()}>
        + {t('common.add')}
      </button>
    </div>,

    <div key="events" className="onboarding-step">
      <h2>{t('onboarding.step_events')}</h2>
      <p style={{ color: 'var(--text2)', marginBottom: '1rem' }}>{t('onboarding.events_hint')}</p>
      {selectedEvents.map((ev, i) => (
        <label key={ev.type} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 0.8rem', borderRadius: 8, cursor: 'pointer',
          background: 'var(--surface2)', marginBottom: '0.4rem',
        }}>
          <input type="checkbox" checked={ev.checked} onChange={() => toggleEvent(i)} />
          <span>{EVENT_TYPES.find(e => e.value === ev.type)?.emoji}</span>
          <span style={{ flex: 1 }}>{t(ev.key)}</span>
          <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>
            {RECURRENCE_OPTIONS.find(r => r.value === ev.recurrence)?.label}
          </span>
        </label>
      ))}
    </div>,

    <div key="done" className="onboarding-step">
      <div style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '1rem' }}>🎉</div>
      <h2 style={{ textAlign: 'center' }}>{t('onboarding.done_title')}</h2>
      {tank.name.trim() ? (
        <p style={{ color: 'var(--text2)', textAlign: 'center', lineHeight: 1.6 }}>
          {t('onboarding.done_desc', { name: tank.name })}
          {inhabitants.length > 0 && ` ${t('onboarding.with')} ${inhabitants.length} ${t('inhabitant.plural_name')}`}
          {selectedEvents.some(e => e.checked) && ` ${t('onboarding.with')} ${selectedEvents.filter(e => e.checked).length} ${t('onboarding.tasks')}`}.
        </p>
      ) : (
        <p style={{ color: 'var(--text2)', textAlign: 'center' }}>You can add a tank anytime from the menu.</p>
      )}
    </div>,
  ]

  const nextStep = () => {
    if (step === 1 && !tank.name.trim()) {
      setStep(steps.length - 1)
    } else {
      setStep(step + 1)
    }
  }

  const skipTank = () => setStep(steps.length - 1)

  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
      <div className="modal modal-lg" style={{ maxWidth: 520 }}>
        <div className="onboarding-progress" style={{
          display: 'flex', gap: '0.3rem', marginBottom: '0.25rem', justifyContent: 'center',
        }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === step ? 'var(--primary)' : i < step ? 'var(--green)' : 'var(--surface3)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        <div className="modal-body" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {steps[step]}
        </div>

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          {step > 0 && step < steps.length - 1 && (
            <button className="btn btn-text" onClick={() => setStep(step - 1)} disabled={busy}>
              {t('common.back')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < steps.length - 1 ? (
            <>
              {step === 1 && (
                <button className="btn btn-text" onClick={skipTank} style={{ marginRight: '0.5rem' }}>
                  {t('common.skip')}
                </button>
              )}
              <button className="btn btn-primary" onClick={nextStep}>
                {t('common.continue')}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={busy}>
              {busy ? '...' : t('onboarding.finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
