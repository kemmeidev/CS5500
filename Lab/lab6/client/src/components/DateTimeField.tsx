import type { ReactElement } from 'react'
import styles from './DateTimeField.module.css'

export interface DateTimeFieldProps {
  id: string
  label: string
  value: string
  error?: string
  disabled: boolean
  onChange: (value: string) => void
}

/** A labelled `datetime-local` input with its inline validation message. */
export function DateTimeField({
  id,
  label,
  value,
  error,
  disabled,
  onChange,
}: DateTimeFieldProps): ReactElement {
  const errorId = `${id}-error`
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        className={`${styles.input} ${error ? styles.inputInvalid : ''}`}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onChange={(event): void => onChange(event.target.value)}
      />
      {error && (
        <span id={errorId} className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  )
}
