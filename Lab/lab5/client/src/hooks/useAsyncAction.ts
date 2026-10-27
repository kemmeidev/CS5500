import { useCallback, useState } from 'react'
import { toUserMessage } from '../api/errorMessages.ts'

export interface AsyncActionState<A extends unknown[], R> {
  /** Resolves with the result, or `null` if the action failed (see `error`). */
  run: (...args: A) => Promise<R | null>
  isPending: boolean
  error: string | null
  reset: () => void
}

/** Wraps a mutating API call with explicit pending and error state. */
export function useAsyncAction<A extends unknown[], R>(
  action: (...args: A) => Promise<R>,
): AsyncActionState<A, R> {
  const [isPending, setIsPending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (...args: A): Promise<R | null> => {
      setIsPending(true)
      setError(null)
      try {
        return await action(...args)
      } catch (err: unknown) {
        setError(toUserMessage(err))
        return null
      } finally {
        setIsPending(false)
      }
    },
    [action],
  )

  const reset = useCallback((): void => setError(null), [])

  return { run, isPending, error, reset }
}
