import { API_BASE_URL } from '../config/env.ts'
import type {
  CreateReservationRequest,
  ErrorResponse,
  Reservation,
  Resource,
} from '@campushub/shared'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON error body (e.g. a proxy error page); fall through to a generic error.
  }
  if (isErrorResponse(body)) {
    return new ApiError(response.status, body.code, body.message)
  }
  return new ApiError(
    response.status,
    'HTTP_ERROR',
    `Request failed with status ${response.status}.`,
  )
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
    })
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the CampusHub server.')
  }
  if (!response.ok) {
    throw await toApiError(response)
  }
  return (await response.json()) as T
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

/** GET /resources — optionally filtered by exact `type`. */
export function fetchResources(
  type?: string,
  signal?: AbortSignal,
): Promise<Resource[]> {
  const query = type ? `?${new URLSearchParams({ type }).toString()}` : ''
  return request<Resource[]>(`/resources${query}`, { signal })
}

/** POST /reservations — 201 with the created reservation, 409 on overlap. */
export function createReservation(
  payload: CreateReservationRequest,
): Promise<Reservation> {
  return request<Reservation>('/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** GET /reservations/user/{userId} — every reservation of the user, any status. */
export function fetchUserReservations(
  userId: string,
  signal?: AbortSignal,
): Promise<Reservation[]> {
  return request<Reservation[]>(
    `/reservations/user/${encodeURIComponent(userId)}`,
    { signal },
  )
}

/** PATCH /reservations/{id}/cancel — 409 if already cancelled. */
export function cancelReservation(reservationId: string): Promise<Reservation> {
  return request<Reservation>(
    `/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { method: 'PATCH' },
  )
}
