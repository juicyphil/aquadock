import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import { useTranslation } from '../../i18n'

interface Props {
  onClose: () => void
  onSwitch: () => void
}

export function LoginModal({ onClose, onSwitch }: Props) {
  const { login } = useAuth()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{t('auth.login_title')}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.username')}</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : t('auth.login_btn')}</button>
            <button type="button" className="btn btn-text" onClick={onSwitch}>{t('auth.no_account')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
