import { useState } from 'react'
import type { Reservation, Resource } from '@campushub/shared'
import { useCreateReservation } from './useReservations.ts'

export interface FieldErrors {
  startTime?: string
  endTime?: string
}

export interface UseBookingFormResult {
  startTime: string
  endTime: string
  setStartTime: (value: string) => void
  setEndTime: (value: string) => void
  fieldErrors: FieldErrors
  confirmation: Reservation | null
  isPending: boolean
  error: string | null
  submit: () => Promise<void>
}

function validate(startTime: string, endTime: string, now: Date): FieldErrors {
  const errors: FieldErrors = {}
  if (!startTime) {
    errors.startTime = 'Choose a start time.'
  }
  if (!endTime) {
    errors.endTime = 'Choose an end time.'
  }
  if (errors.startTime || errors.endTime) {
    return errors
  }
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime())) {
    errors.startTime = 'Start time is not a valid date.'
  } else if (start < now) {
    errors.startTime = 'Start time cannot be in the past.'
  }
  if (Number.isNaN(end.getTime())) {
    errors.endTime = 'End time is not a valid date.'
  } else if (end <= start) {
    errors.endTime = 'End time must be later than the start time.'
  }
  return errors
}

/** Field state, client-side validation and submission for booking `resource`. */
export function useBookingForm(
  resource: Resource | null,
  userId: string,
  onBooked: (reservation: Reservation) => void,
): UseBookingFormResult {
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [confirmation, setConfirmation] = useState<Reservation | null>(null)
  const { run, isPending, error, reset } = useCreateReservation()

  async function submit(): Promise<void> {
    if (!resource || isPending) {
      return
    }
    setConfirmation(null)
    reset()
    const errors = validate(startTime, endTime, new Date())
    setFieldErrors(errors)
    if (errors.startTime || errors.endTime) {
      return
    }
    const created = await run({
      resourceId: resource.id,
      userId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    })
    if (created) {
      setConfirmation(created)
      setStartTime('')
      setEndTime('')
      onBooked(created)
    }
  }

  return {
    startTime,
    endTime,
    setStartTime,
    setEndTime,
    fieldErrors,
    confirmation,
    isPending,
    error,
    submit,
  }
}
