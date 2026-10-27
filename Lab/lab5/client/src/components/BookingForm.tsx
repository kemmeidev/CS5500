import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { createReservation } from '../api/campushubApi.ts'
import type { Reservation, Resource } from '../api/types.ts'
import { useAsyncAction } from '../hooks/useAsyncAction.ts'
import buttonStyles from './Button.module.css'
import styles from './BookingForm.module.css'
import { ErrorAlert } from './ErrorAlert.tsx'

export interface BookingFormProps {
  resource: Resource | null
  userId: string
  onBooked: (reservation: Reservation) => void
}

interface FieldErrors {
  startTime?: string
  endTime?: string
}

function validate(startTime: string, endTime: string, now: Date): FieldErrors {
  const errors: FieldErrors = {}
  if (!startTime) {
    errors.startTime = 'Choose a start time.'
  }
  if (!endTime) {
    errors.endTime = 'Choose an end time.'
  }
  if (errors.startTime || errors.endTime) {
    return errors
  }
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime())) {
    errors.startTime = 'Start time is not a valid date.'
  } else if (start < now) {
    errors.startTime = 'Start time cannot be in the past.'
  }
  if (Number.isNaN(end.getTime())) {
    errors.endTime = 'End time is not a valid date.'
  } else if (end <= start) {
    errors.endTime = 'End time must be later than the start time.'
  }
  return errors
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function BookingForm({
  resource,
  userId,
  onBooked,
}: BookingFormProps): ReactElement {
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [confirmation, setConfirmation] = useState<Reservation | null>(null)
  const { run, isPending, error, reset } = useAsyncAction(createReservation)

  if (!resource) {
    return (
      <section className={styles.section} aria-labelledby="booking-heading">
        <h2 id="booking-heading">Book a Resource</h2>
        <p className={styles.placeholder}>
          Select an available resource above to book a time slot.
        </p>
      </section>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!resource || isPending) {
      return
    }
    setConfirmation(null)
    reset()
    const errors = validate(startTime, endTime, new Date())
    setFieldErrors(errors)
    if (errors.startTime || errors.endTime) {
      return
    }
    const created = await run({
      resourceId: resource.id,
      userId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    })
    if (created) {
      setConfirmation(created)
      setStartTime('')
      setEndTime('')
      onBooked(created)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="booking-heading">
      <h2 id="booking-heading">Book {resource.name}</h2>
      <p className={styles.resource}>{resource.location}</p>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event): void => void handleSubmit(event)}
      >
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="booking-start">
              Start time
            </label>
            <input
              id="booking-start"
              type="datetime-local"
              className={`${styles.input} ${
                fieldErrors.startTime ? styles.inputInvalid : ''
              }`}
              value={startTime}
              aria-invalid={Boolean(fieldErrors.startTime)}
              aria-describedby={
                fieldErrors.startTime ? 'booking-start-error' : undefined
              }
              disabled={isPending}
              onChange={(event): void => setStartTime(event.target.value)}
            />
            {fieldErrors.startTime && (
              <span id="booking-start-error" className={styles.fieldError}>
                {fieldErrors.startTime}
              </span>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="booking-end">
              End time
            </label>
            <input
              id="booking-end"
              type="datetime-local"
              className={`${styles.input} ${
                fieldErrors.endTime ? styles.inputInvalid : ''
              }`}
              value={endTime}
              aria-invalid={Boolean(fieldErrors.endTime)}
              aria-describedby={
                fieldErrors.endTime ? 'booking-end-error' : undefined
              }
              disabled={isPending}
              onChange={(event): void => setEndTime(event.target.value)}
            />
            {fieldErrors.endTime && (
              <span id="booking-end-error" className={styles.fieldError}>
                {fieldErrors.endTime}
              </span>
            )}
          </div>
        </div>
        {error && <ErrorAlert message={error} />}
        {confirmation && (
          <p className={styles.success} role="status">
            Booked {resource.name} from{' '}
            {dateTimeFormat.format(new Date(confirmation.startTime))} to{' '}
            {dateTimeFormat.format(new Date(confirmation.endTime))}.
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="submit"
            className={buttonStyles.button}
            disabled={isPending || !resource.isAvailable}
          >
            {isPending ? 'Booking…' : 'Book Reservation'}
          </button>
        </div>
      </form>
    </section>
  )
}
