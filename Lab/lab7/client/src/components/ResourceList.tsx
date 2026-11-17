import { useState } from 'react'
import type { ReactElement } from 'react'
import { RESOURCE_TYPES } from '@campushub/shared'
import type { Resource, ResourceType } from '@campushub/shared'
import { useResources } from '../hooks/useResources.ts'
import { ErrorAlert } from './ErrorAlert.tsx'
import styles from './ResourceList.module.css'

export interface ResourceListProps {
  selectedResourceId: string | null
  onSelect: (resource: Resource) => void
}

const TYPE_LABELS: Readonly<Record<ResourceType, string>> = {
  ROOM: 'Study Rooms',
  EQUIPMENT: 'Equipment',
  LAB: 'Labs',
}

export function ResourceList({
  selectedResourceId,
  onSelect,
}: ResourceListProps): ReactElement {
  const [typeFilter, setTypeFilter] = useState<ResourceType | undefined>(
    undefined,
  )
  const { resources, isLoading, error, reload } = useResources(typeFilter)

  function renderBody(): ReactElement {
    if (isLoading) {
      return <p className={styles.status}>Loading resources…</p>
    }
    if (error) {
      return <ErrorAlert message={error} onRetry={reload} />
    }
    if (resources.length === 0) {
      return <p className={styles.status}>No resources match this filter.</p>
    }
    return (
      <ul className={styles.grid}>
        {resources.map((resource) => (
          <li key={resource.id}>
            <button
              type="button"
              className={`${styles.card} ${
                resource.id === selectedResourceId ? styles.selected : ''
              }`}
              disabled={!resource.isAvailable}
              aria-pressed={resource.id === selectedResourceId}
              onClick={(): void => onSelect(resource)}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.name}>{resource.name}</h3>
                <span className={styles.badge}>{resource.type}</span>
              </div>
              <p className={styles.location}>{resource.location}</p>
              <p
                className={
                  resource.isAvailable ? styles.available : styles.unavailable
                }
              >
                {resource.isAvailable ? 'Available' : 'Unavailable'}
              </p>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="resources-heading">
      <h2 id="resources-heading">Campus Resources</h2>
      <div className={styles.filters} role="group" aria-label="Filter by type">
        <button
          type="button"
          className={styles.filter}
          aria-pressed={typeFilter === undefined}
          onClick={(): void => setTypeFilter(undefined)}
        >
          All
        </button>
        {RESOURCE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={styles.filter}
            aria-pressed={typeFilter === type}
            onClick={(): void => setTypeFilter(type)}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      {renderBody()}
    </section>
  )
}
