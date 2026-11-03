import { useCallback, useMemo } from 'react'
import type { CreateReservationRequest, Reservation } from '@campushub/shared'
import {
  cancelReservation,
  createReservation,
  fetchUserReservations,
} from '../api/campushubApi.ts'
import { useApiQuery } from './useApiQuery.ts'
import { useAsyncAction } from './useAsyncAction.ts'
import type { AsyncActionState } from './useAsyncAction.ts'

export interface UseUserReservationsResult {
  reservations: Reservation[]
  /** Non-cancelled reservations, soonest first. */
  activeReservations: Reservation[]
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
  const reservations = useMemo((): Reservation[] => data ?? [], [data])
  const activeReservations = useMemo(
    (): Reservation[] =>
      reservations
        .filter((reservation) => reservation.status !== 'CANCELLED')
        .toSorted((a, b) => a.startTime.localeCompare(b.startTime)),
    [reservations],
  )
  return { reservations, activeReservations, isLoading, error, reload }
}

export function useCreateReservation(): AsyncActionState<
  [CreateReservationRequest],
  Reservation
> {
  return useAsyncAction(createReservation)
}

export function useCancelReservation(): AsyncActionState<[string], Reservation> {
  return useAsyncAction(cancelReservation)
}
