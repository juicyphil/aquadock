import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './theme'
import { LangProvider } from './i18n'
import { AuthProvider } from './components/Auth/AuthContext'
import { ToastProvider } from './components/UI/Toast'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  </React.StrictMode>
)
