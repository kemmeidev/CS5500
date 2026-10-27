import { useCallback } from 'react'
import { fetchUserReservations } from '../api/campushubApi.ts'
import type { Reservation } from '../api/types.ts'
import { useApiQuery } from './useApiQuery.ts'

export interface UseUserReservationsResult {
  reservations: Reservation[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

export function useUserReservations(userId: string): UseUserReservationsResult {
  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Reservation[]> =>
      fetchUserReservations(userId, signal),
    [userId],
  )
  const { data, isLoading, error, reload } = useApiQuery(fetcher)
  return { reservations: data ?? [], isLoading, error, reload }
}
