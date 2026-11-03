# Lab 5 — State Management & Error Handling Audit

Full-stack test of the CampusHub client against the real backend. The goal was to
confirm that every async workflow surfaces an explicit error, and that no loading
indicator or disabled button gets stuck. The worst case tested was a 409 double booking.

## Setup

```bash
brew services start mongodb-community
cd campushub-backend && npm run seed && npm run dev   # :3000
cd client && npm run dev                              # :5173, proxies /api → :3000
```

The tests ran in headless Chrome, driven by Playwright against `http://localhost:5173`.
The signed-in student is the fixed `user-456` (`src/config/currentUser.ts`).

## How error state is wired

| Layer                           | Responsibility                                                                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/campushubApi.ts`           | Every non-2xx response becomes an `ApiError(status, code, message)`, where `code` is taken from the spec's `ErrorResponse`. A failed `fetch` becomes `ApiError(0, NETWORK_ERROR)`. Aborts are re-thrown untouched.                                                           |
| `api/errorMessages.ts`          | `toUserMessage()` maps codes to UI text. `DOUBLE_BOOKING` maps to "This resource is already reserved for the selected time window." `RESOURCE_UNAVAILABLE`, `ALREADY_CANCELLED` and network/gateway failures each get their own message. 400/404 errors show the server's message. |
| `hooks/useApiQuery.ts`          | Read workflows return `isLoading`, `error` and `reload`. Loading is cleared in `finally`, an `AbortController` cancels the request on unmount or when the filter changes, and aborts never set an error.                                                                    |
| `hooks/useAsyncAction.ts`       | Mutations return `isPending` and `error`. `isPending` is cleared in `finally`, so a rejected request always re-enables the button.                                                                                                                                         |
| `components/ErrorAlert.tsx`     | One `role="alert"` banner, with a Retry button for reads.                                                                                                                                                                                                                  |

## Test results (observed)

| #   | Scenario                                                                                                                | HTTP              | UI result                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Book Study Room 302, Dec 2 2026 10:00–11:00                                                                             | 201               | Success notice. The booking appears in My Bookings.                                                                  |
| 2   | **Double book** the same room, 10:30–11:30 (overlaps #1)                                                                | **409** `DOUBLE_BOOKING` | Alert: **"This resource is already reserved for the selected time window."** The button goes back to "Book Reservation" and is enabled. |
| 3   | Submit with empty times / end before start / start in the past                                                          | (no request)      | Inline field errors are shown and no request is dispatched.                                                          |
| 4   | Booking request fails at the network level (connection refused)                                                         | —                 | Alert: "Cannot reach the CampusHub server…". The button is re-enabled.                                               |
| 5   | Click Cancel Reservation                                                                                                | 200               | The row is removed and the list refetches ("You have no active reservations.").                                      |
| 6   | **Stale cancel**: the reservation was cancelled elsewhere first, then Cancel was clicked in the UI                      | **409** `ALREADY_CANCELLED` | An alert on that row: "This reservation was already cancelled." The button is re-enabled.                    |
| 7   | Backend stopped, page reloaded                                                                                          | 502 (Vite proxy)  | Both the resource list and My Bookings show an alert with **Retry**. No loading text remains.                        |
| 8   | Retry after the backend comes back                                                                                      | 200               | The resource cards load.                                                                                             |
| 9   | Type filter: Study Rooms / Equipment / Labs / All                                                                       | 200               | Requests `?type=ROOM` / `EQUIPMENT` / `LAB` / none. The cards match. Study Room 118 (`isAvailable: false`) can't be selected. |

Screenshots: [double booking](screenshots/double-book.png),
[backend down](screenshots/backend-down.png), [stale cancel](screenshots/stale-cancel.png).

Raw backend response for #2, sent through the proxy with curl:

```
HTTP/1.1 409 Conflict
{"code":"DOUBLE_BOOKING","message":"Resource is already reserved for this time slot."}
```

## Steering incidents

### 1. Backend outage showed a generic message

- **Observed:** In test #7, the first run showed "Something went wrong. Please try
  again." The client had treated only a failed `fetch` (status 0) as "server
  unreachable". In development, though, the Vite proxy answers **502 Bad Gateway**
  when the backend is down, so the request never fails at the network level.
- **Why it matters:** The UI did not hang, but it gave no hint about the actual
  problem.
- **Fix:** `toUserMessage()` now treats 502/503/504 the same as `NETWORK_ERROR`.
  After re-running, the alert reads "Cannot reach the CampusHub server. Check that
  the backend is running."

### 2. Checking for omitted error handling up front

The context file (`client/AGENTS.md`) requires explicit `isLoading`/`error` state,
`finally`-based reset and a specific 409 message for every async workflow. This was
in place before any component was written, so the components were generated against
those rules. Tests #2, #4 and #6 confirm that no workflow leaves a stuck spinner or
fails silently.

## Known limitation

After a stale cancel (#6), the row stays visible with its error until the next
refresh. This is deliberate: the student sees why the click had no effect. The next
booking or a reload removes the row.
