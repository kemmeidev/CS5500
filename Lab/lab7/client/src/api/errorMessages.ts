import { ApiError } from './campushubApi.ts'

const MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  DOUBLE_BOOKING:
    'This resource is already reserved for the selected time window.',
  RESOURCE_UNAVAILABLE: 'This resource is not available for reservation.',
  ALREADY_CANCELLED: 'This reservation was already cancelled.',
  NETWORK_ERROR:
    'Cannot reach the CampusHub server. Check that the backend is running.',
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

// The Vite dev proxy (or any gateway) answers 502/503/504 when the backend is down,
// so these mean "unreachable" just like a failed fetch.
const GATEWAY_STATUSES: ReadonlySet<number> = new Set([502, 503, 504])

export function toUserMessage(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return FALLBACK_MESSAGE
  }
  const known = MESSAGES_BY_CODE[err.code]
  if (known) {
    return known
  }
  if (GATEWAY_STATUSES.has(err.status)) {
    return MESSAGES_BY_CODE.NETWORK_ERROR
  }
  if (err.status === 400 || err.status === 404) {
    return err.message
  }
  if (err.status === 409) {
    return `Conflict: ${err.message}`
  }
  return FALLBACK_MESSAGE
}
