import React, { createContext, useContext, useState, useCallback } from 'react'

interface ConfirmContextType {
  confirm: (msg: string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType>({ confirm: async () => false })

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback((msg: string): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ message: msg, resolve })
    })
  }, [])

  const handleClose = (result: boolean) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={() => handleClose(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message">{state.message}</p>
            <div className="confirm-actions">
              <button className="btn btn-text" onClick={() => handleClose(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleClose(true)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext).confirm
}
