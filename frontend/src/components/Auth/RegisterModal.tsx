import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import { useTranslation } from '../../i18n'

interface Props {
  onClose: () => void
  onSwitch: () => void
}

export function RegisterModal({ onClose, onSwitch }: Props) {
  const { register } = useAuth()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(username, email, password)
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{t('auth.register_title')}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.username')}</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{t('auth.register_btn')}</button>
            <button type="button" className="btn btn-text" onClick={onSwitch}>{t('auth.has_account')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
