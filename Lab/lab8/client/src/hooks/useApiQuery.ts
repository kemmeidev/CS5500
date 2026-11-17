import { useCallback, useEffect, useState } from 'react'
import { isAbortError } from '../api/campushubApi.ts'
import { toUserMessage } from '../api/errorMessages.ts'

export interface ApiQueryState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  reload: () => void
}

/**
 * Runs `fetcher` on mount and whenever it changes identity or `reload` is called.
 * `fetcher` must be memoized (useCallback) by the caller.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
): ApiQueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState<number>(0)

  useEffect((): (() => void) => {
    const controller = new AbortController()

    async function load(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetcher(controller.signal)
        setData(result)
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return
        }
        setError(toUserMessage(err))
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return (): void => controller.abort()
  }, [fetcher, reloadCount])

  const reload = useCallback((): void => {
    setReloadCount((count) => count + 1)
  }, [])

  return { data, isLoading, error, reload }
}
