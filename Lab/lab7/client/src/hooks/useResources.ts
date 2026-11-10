import { useCallback } from 'react'
import { fetchResources } from '../api/campushubApi.ts'
import type { Resource, ResourceType } from '@campushub/shared'
import { useApiQuery } from './useApiQuery.ts'

export interface UseResourcesResult {
  resources: Resource[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

export function useResources(type?: ResourceType): UseResourcesResult {
  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Resource[]> => fetchResources(type, signal),
    [type],
  )
  const { data, isLoading, error, reload } = useApiQuery(fetcher)
  return { resources: data ?? [], isLoading, error, reload }
}
