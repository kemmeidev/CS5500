import { useState } from 'react'
import type { ReactElement } from 'react'
import type { Resource } from '@campushub/shared'
import styles from './App.module.css'
import { BookingForm } from './components/BookingForm.tsx'
import { ResourceList } from './components/ResourceList.tsx'
import { UserReservations } from './components/UserReservations.tsx'
import { CURRENT_USER_ID } from './config/currentUser.ts'
import { useUserReservations } from './hooks/useReservations.ts'
import { useResources } from './hooks/useResources.ts'

function App(): ReactElement {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  )
  // Unfiltered list so My Bookings can name every reserved resource.
  const { resources: allResources } = useResources()
  const reservationsQuery = useUserReservations(CURRENT_USER_ID)

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>CampusHub</h1>
        <p className={styles.tagline}>
          Reserve study rooms, equipment and labs across campus.
        </p>
      </header>
      <main className={styles.main}>
        <ResourceList
          selectedResourceId={selectedResource?.id ?? null}
          onSelect={setSelectedResource}
        />
        <BookingForm
          key={selectedResource?.id ?? 'none'}
          resource={selectedResource}
          userId={CURRENT_USER_ID}
          onBooked={reservationsQuery.reload}
        />
        <UserReservations
          userId={CURRENT_USER_ID}
          resources={allResources}
          query={reservationsQuery}
        />
      </main>
    </>
  )
}

export default App
