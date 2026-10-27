import { useEffect, useMemo, useRef } from 'react'
import type { ReactElement } from 'react'
import type { Resource } from '../api/types.ts'
import { useUserReservations } from '../hooks/useUserReservations.ts'
import { ErrorAlert } from './ErrorAlert.tsx'
import { ReservationItem } from './ReservationItem.tsx'
import styles from './UserReservations.module.css'

export interface UserReservationsProps {
  userId: string
  resources: Resource[]
  /** Incremented by the parent after a booking so the list refetches. */
  refreshKey: number
}

export function UserReservations({
  userId,
  resources,
  refreshKey,
}: UserReservationsProps): ReactElement {
  const { reservations, isLoading, error, reload } =
    useUserReservations(userId)

  const initialRefreshKey = useRef<number>(refreshKey)
  useEffect((): void => {
    if (refreshKey !== initialRefreshKey.current) {
      reload()
    }
  }, [refreshKey, reload])

  const resourceNames = useMemo(
    (): ReadonlyMap<string, string> =>
      new Map(resources.map((resource) => [resource.id, resource.name])),
    [resources],
  )

  const active = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.status !== 'CANCELLED')
        .toSorted((a, b) => a.startTime.localeCompare(b.startTime)),
    [reservations],
  )

  function renderBody(): ReactElement {
    if (isLoading && reservations.length === 0) {
      return <p className={styles.status}>Loading your reservations…</p>
    }
    if (error) {
      return <ErrorAlert message={error} onRetry={reload} />
    }
    if (active.length === 0) {
      return <p className={styles.status}>You have no active reservations.</p>
    }
    return (
      <ul className={styles.list}>
        {active.map((reservation) => (
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
