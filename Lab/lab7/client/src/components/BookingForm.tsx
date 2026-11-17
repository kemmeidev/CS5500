import type { ReactElement } from 'react'
import type { Reservation, Resource } from '@campushub/shared'
import { useBookingForm } from '../hooks/useBookingForm.ts'
import { dateTimeFormat } from '../utils/formatDateTime.ts'
import buttonStyles from './Button.module.css'
import styles from './BookingForm.module.css'
import { DateTimeField } from './DateTimeField.tsx'
import { ErrorAlert } from './ErrorAlert.tsx'

export interface BookingFormProps {
  resource: Resource | null
  userId: string
  onBooked: (reservation: Reservation) => void
}

export function BookingForm({
  resource,
  userId,
  onBooked,
}: BookingFormProps): ReactElement {
  const form = useBookingForm(resource, userId, onBooked)

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

  return (
    <section className={styles.section} aria-labelledby="booking-heading">
      <h2 id="booking-heading">Book {resource.name}</h2>
      <p className={styles.resource}>{resource.location}</p>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event): void => {
          event.preventDefault()
          void form.submit()
        }}
      >
        <div className={styles.fields}>
          <DateTimeField
            id="booking-start"
            label="Start time"
            value={form.startTime}
            error={form.fieldErrors.startTime}
            disabled={form.isPending}
            onChange={form.setStartTime}
          />
          <DateTimeField
            id="booking-end"
            label="End time"
            value={form.endTime}
            error={form.fieldErrors.endTime}
            disabled={form.isPending}
            onChange={form.setEndTime}
          />
        </div>
        {form.error && <ErrorAlert message={form.error} />}
        {form.confirmation && (
          <p className={styles.success} role="status">
            Booked {resource.name} from{' '}
            {dateTimeFormat.format(new Date(form.confirmation.startTime))} to{' '}
            {dateTimeFormat.format(new Date(form.confirmation.endTime))}.
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="submit"
            className={buttonStyles.button}
            disabled={form.isPending || !resource.isAvailable}
          >
            {form.isPending ? 'Booking…' : 'Book Reservation'}
          </button>
        </div>
      </form>
    </section>
  )
}
