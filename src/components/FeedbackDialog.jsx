import { useCallback, useEffect, useRef, useState } from 'react'
import { FeedbackContext } from './feedback-context.js'
import './FeedbackDialog.css'

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const confirmButtonRef = useRef(null)
  const confirmResolverRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (dialog) {
      if (!previousFocusRef.current) previousFocusRef.current = document.activeElement
      confirmButtonRef.current?.focus()
      return
    }

    if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus()
    previousFocusRef.current = null
  }, [dialog])

  const showFeedback = useCallback((message, options = {}) => {
    setDialog({
      message,
      title: options.title || 'Aviso',
      tone: options.tone || 'info',
      onOk: options.onOk
    })
  }, [])

  const confirmFeedback = useCallback((message, options = {}) => (
    new Promise((resolve) => {
      confirmResolverRef.current = resolve
      setDialog({
        message,
        title: options.title || 'Confirmar',
        tone: 'info',
        confirmLabel: options.confirmLabel || 'OK',
        cancelLabel: options.cancelLabel || 'Cancelar',
        confirm: true
      })
    })
  ), [])

  const closeDialog = (confirmed) => {
    const currentDialog = dialog
    const resolve = confirmResolverRef.current
    confirmResolverRef.current = null
    setDialog(null)
    resolve?.(confirmed)
    if (confirmed) currentDialog?.onOk?.()
  }

  const keepFocusInDialog = (event) => {
    if (event.key !== 'Tab') return
    const buttons = event.currentTarget.querySelectorAll('button:not(:disabled)')
    const firstButton = buttons[0]
    const lastButton = buttons[buttons.length - 1]

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault()
      lastButton.focus()
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault()
      firstButton.focus()
    }
  }

  return (
    <FeedbackContext.Provider value={{ showFeedback, confirmFeedback }}>
      {children}
      {dialog && (
        <div className="feedback-overlay">
          <section
            className={`feedback-dialog feedback-dialog--${dialog.tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            aria-describedby="feedback-dialog-message"
            onKeyDown={keepFocusInDialog}
          >
            <h2 id="feedback-dialog-title">{dialog.title}</h2>
            <p id="feedback-dialog-message">{dialog.message}</p>
            <div className="feedback-dialog__actions">
              {dialog.confirm && (
                <button
                  type="button"
                  className="feedback-dialog__button feedback-dialog__button--secondary"
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelLabel}
                </button>
              )}
              <button
                ref={confirmButtonRef}
                type="button"
                className="feedback-dialog__button"
                onClick={() => closeDialog(true)}
              >
                {dialog.confirm ? dialog.confirmLabel : 'OK'}
              </button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}
