import type { ReactElement } from 'react'
import styles from './ErrorAlert.module.css'

export interface ErrorAlertProps {
  message: string
  onRetry?: () => void
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps): ReactElement {
  return (
    <div className={styles.alert} role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
