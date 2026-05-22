import React, { createContext, useContext, useState, useCallback } from 'react'
import en from './en.json'
import de from './de.json'
import ja from './ja.json'
import nl from './nl.json'

export type Lang = 'en' | 'de' | 'ja' | 'nl'
const messages: Record<Lang, Record<string, string>> = { en, de, ja, nl }

const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  ja: '日本語',
  nl: 'Nederlands',
}

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string>) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k: string) => k,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('aquadock_lang') as Lang) || 'en'
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('aquadock_lang', l)
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string>) => {
    let msg = messages[lang]?.[key] || messages.en[key] || key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        msg = msg.replace(`{${k}}`, v)
      })
    }
    return msg
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LangContext)
}

export { LANG_LABELS }
