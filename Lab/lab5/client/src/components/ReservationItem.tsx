import type { ReactElement } from 'react'
import { cancelReservation } from '../api/campushubApi.ts'
import type { Reservation } from '../api/types.ts'
import { useAsyncAction } from '../hooks/useAsyncAction.ts'
import buttonStyles from './Button.module.css'
import { ErrorAlert } from './ErrorAlert.tsx'
import styles from './UserReservations.module.css'

export interface ReservationItemProps {
  reservation: Reservation
  resourceName: string
  onCancelled: () => void
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ReservationItem({
  reservation,
  resourceName,
  onCancelled,
}: ReservationItemProps): ReactElement {
  const { run, isPending, error } = useAsyncAction(cancelReservation)

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
