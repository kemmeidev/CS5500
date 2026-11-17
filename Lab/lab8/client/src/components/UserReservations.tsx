import { useMemo } from 'react'
import type { ReactElement } from 'react'
import type { Resource } from '@campushub/shared'
import type { UseUserReservationsResult } from '../hooks/useReservations.ts'
import { ErrorAlert } from './ErrorAlert.tsx'
import { ReservationItem } from './ReservationItem.tsx'
import styles from './UserReservations.module.css'

export interface UserReservationsProps {
  userId: string
  resources: Resource[]
  /** Owned by the parent so a new booking can trigger `reload` directly. */
  query: UseUserReservationsResult
}

export function UserReservations({
  userId,
  resources,
  query,
}: UserReservationsProps): ReactElement {
  const { reservations, activeReservations, isLoading, error, reload } = query

  const resourceNames = useMemo(
    (): ReadonlyMap<string, string> =>
      new Map(resources.map((resource) => [resource.id, resource.name])),
    [resources],
  )

  function renderBody(): ReactElement {
    if (isLoading && reservations.length === 0) {
      return <p className={styles.status}>Loading your reservations…</p>
    }
    if (error) {
      return <ErrorAlert message={error} onRetry={reload} />
    }
    if (activeReservations.length === 0) {
      return <p className={styles.status}>You have no active reservations.</p>
    }
    return (
      <ul className={styles.list}>
        {activeReservations.map((reservation) => (
          <ReservationItem
            key={reservation.id}
            reservation={reservation}
            resourceName={
              resourceNames.get(reservation.resourceId) ??
              `Resource ${reservation.resourceId}`
            }
            onCancelled={reload}
          />
        ))}
      </ul>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="bookings-heading">
      <div className={styles.header}>
        <h2 id="bookings-heading">My Bookings</h2>
        <span className={styles.user}>
          {isLoading && reservations.length > 0 ? 'Refreshing… ' : ''}
          Signed in as {userId}
        </span>
      </div>
      {renderBody()}
    </section>
  )
}
