import type { ReactElement } from 'react'
import type { Reservation } from '@campushub/shared'
import { useCancelReservation } from '../hooks/useReservations.ts'
import { dateTimeFormat } from '../utils/formatDateTime.ts'
import buttonStyles from './Button.module.css'
import { ErrorAlert } from './ErrorAlert.tsx'
import styles from './UserReservations.module.css'

export interface ReservationItemProps {
  reservation: Reservation
  resourceName: string
  onCancelled: () => void
}

export function ReservationItem({
  reservation,
  resourceName,
  onCancelled,
}: ReservationItemProps): ReactElement {
  const { run, isPending, error } = useCancelReservation()

  async function handleCancel(): Promise<void> {
    const cancelled = await run(reservation.id)
    if (cancelled) {
      onCancelled()
    }
  }

  return (
    <li className={styles.item}>
      <div className={styles.row}>
        <div className={styles.details}>
          <h3 className={styles.name}>{resourceName}</h3>
          <p className={styles.time}>
            {dateTimeFormat.formatRange(
              new Date(reservation.startTime),
              new Date(reservation.endTime),
            )}
          </p>
          <p className={styles.time}>Status: {reservation.status}</p>
        </div>
        <button
          type="button"
          className={`${buttonStyles.button} ${buttonStyles.secondary}`}
          disabled={isPending}
          onClick={(): void => void handleCancel()}
        >
          {isPending ? 'Cancelling…' : 'Cancel Reservation'}
        </button>
      </div>
      {error && <ErrorAlert message={error} />}
    </li>
  )
}
