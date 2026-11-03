# Lab 6 — Context Optimization & Bloat Audit

Lab 6 starts from Lab 5 as merged to `main` (`chore(lab6): scaffold lab6 from lab5`).
Each part below lists what was found, what changed, and how it was checked.

## Part 1 — Token context & ignore optimization

### Context files pruned

| File                          | Before | After | What was removed or moved                                                                                                                           |
| ----------------------------- | -----: | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `campushub-backend/AGENTS.md` |    400 |   154 | "multi-tenant" text, `IBooking`/`campusId` examples, the Definition of Done that repeated the protocol, the verbose PR template, the lab4 log entry |
| `client/AGENTS.md`            |    163 |   115 | duplicated coding standards and git section                                                                                                         |
| `AGENTS.md` (new root)        |      — |    60 | rules shared by both packages, stated once: TS strictness, git, verification, "where to look"                                                       |

### Agent ignore rules

- `lab6/.ignore`, honored by ripgrep and therefore by Claude Code's Grep/Glob, excludes:
  - `node_modules/`, `package-lock.json`
  - `dist/`, `build/`, `coverage/`, `*.map`, `*.tsbuildinfo`
  - logs, `.env`
  - the historical write-ups (`lab4-steering-log.md`, `lab5-error-handling-audit.md`, `screenshots/`)
- `lab6/.claude/settings.json` adds `permissions.deny` `Read(...)` rules for the same
  paths, because `.ignore` alone does not stop the Read tool.

### Verification

| Check                                                                                                     | Result                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rg --files` in `lab6/` (`.gitignore` + `.ignore` / `.gitignore` only / no ignore)                        | 71 / 75 / 5,864 files (after the workspace install)                                                                                                                        |
| Base context per request: `claude -p 'Reply with the single word OK.' --tools ""` in `campushub-backend/` | **10,047 → 6,464 input tokens (−36%)**: lab5 vs lab6 context files                                                                                                         |
| Lightweight query: "Which files under src/ handle Express errors?"                                        | Before and after, the agent answered only with `src/` paths (`controllers/error.controller.ts`, `app.ts`, `services/domain.errors.ts`) and opened no lockfile, dist or log |
| `claude -p` asked to Read `campushub-backend/package-lock.json` from `lab6/`                              | `DENIED`: blocked by the Read deny rule                                                                                                                                    |

The multi-turn query's totals (79.4k → 109.9k incl. cache reads, over 2 vs 3 turns)
mostly measure Claude Code's cached system prompt and turn count, not the repo.
That is why the single-turn, no-tool measurement above is the one used for the
context-size comparison.

## Part 2 — Bloat & redundancy audit

| #   | Anti-pattern           | Where (lab5)                                                                                            | Finding                                                                                                                                                                                                                                                      |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Duplicate handlers     | `controllers/health.controller.ts:9`, `resource.controller.ts:12`, `reservation.controller.ts:16,28,40` | 5 identical `try { … } catch (err) { next(err) }` blocks, each around one service call. Express 5 already forwards sync throws and rejected promises, so the blocks are dead weight. The error mapper itself sat in `controllers/`, though it is middleware. |
| 2   | Repeated error parsing | client `api/`, `hooks/`                                                                                 | **Pass.** HTTP errors are parsed once (`campushubApi.ts` `toApiError`), mapped once (`errorMessages.ts` `toUserMessage`), and held once (`useApiQuery`/`useAsyncAction`). No Axios, as `AGENTS.md` requires.                                                 |
| 3   | Verbose component      | `components/BookingForm.tsx` (179 lines)                                                                | 4 `useState`s, validation, submit orchestration and rendering in one component. The start and end inputs were the same ~25-line JSX block, copied.                                                                                                           |
| 4   | Coupled refetch logic  | `components/UserReservations.tsx:24-29`, `App.tsx`                                                      | A `refreshKey` counter plus a `useRef` effect, used only so a sibling's booking could trigger a refetch.                                                                                                                                                     |
| 5   | Redundant interfaces   | `campushub-backend/src/types/reservation.ts` and `client/src/api/types.ts`                              | `RESOURCE_TYPES`, `RESERVATION_STATUSES`, `Resource`, `Reservation` and `ErrorResponse` were declared twice. The create body had already drifted to two names, `CreateReservationRequest` vs `CreateReservationDTO`.                                         |
| 6   | Duplicate constant     | `BookingForm.tsx:47`, `ReservationItem.tsx:15`                                                          | Same `Intl.DateTimeFormat` options declared twice.                                                                                                                                                                                                           |

## Part 3 — Refactors

| Fix                           | Change                                                                                                                                                                                                                           | Result                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Shared interface library (#5) | New npm workspace `lab6/{shared,campushub-backend,client}`. `@campushub/shared` builds `src/index.ts` to `.js` + `.d.ts`, both packages import from it, and both local type files are deleted. One lockfile at `lab6/`.          | Each contract type is declared once, and the create body is `CreateReservationRequest` everywhere |
| Global error handler (#1)     | `controllers/error.controller.ts` → `middleware/errorHandler.ts` (`errorHandler`, `notFound`). All controller `try/catch` blocks and `next` params removed, and the no-try/catch rule added to `AGENTS.md`.                      | Controllers go from 78 to 51 lines; every handler is a single line                                |
| Custom hooks (#3, #4)         | `hooks/useReservations.ts` (`useUserReservations` with `activeReservations`, `useCreateReservation`, `useCancelReservation`), `hooks/useBookingForm.ts`, `components/DateTimeField.tsx`. App owns the query and passes `reload`. | `BookingForm` 179 → 84 lines, `UserReservations` 84 → 68; `refreshKey` removed                    |
| Shared formatter (#6)         | `utils/formatDateTime.ts`                                                                                                                                                                                                        | One definition                                                                                    |

### Static gates

From `lab6/`, `npm install` (which builds shared), `npm run typecheck`, `npm run lint`
and `npm run build` all exit 0. In the backend, `npm run lint:openapi` reports a valid
spec and `prettier --check .` passes.

### Runtime gate — backend

Real output from `npm run dev` against a seeded DB after the middleware refactor,
with headers trimmed. Every error class still maps to the same status and body:

```
$ GET /health
HTTP/1.1 200 OK
{"status":"ok","service":"campushub-backend","environment":"development","uptimeSeconds":8.712,"timestamp":"2026-11-03T06:51:54.157Z"}

$ GET /resources?isAvailable=maybe
HTTP/1.1 400 Bad Request
{"code":"VALIDATION_ERROR","message":"isAvailable must be exactly true or false when provided."}

$ POST /reservations (valid)
HTTP/1.1 201 Created
{"id":"6ae9848a5d6fc360124c0c15","resourceId":"66f000000000000000000101","userId":"user-456","startTime":"2026-11-05T10:00:00.000Z","endTime":"2026-11-05T11:00:00.000Z","status":"CONFIRMED"}

$ POST /reservations (overlap)
HTTP/1.1 409 Conflict
{"code":"DOUBLE_BOOKING","message":"Resource is already reserved for this time slot."}

$ POST /reservations (malformed JSON)
HTTP/1.1 400 Bad Request
{"code":"VALIDATION_ERROR","message":"Request body is not valid JSON."}

$ PATCH /reservations/:id/cancel (1st)
HTTP/1.1 200 OK
{"id":"6ae9848a5d6fc360124c0c15","resourceId":"66f000000000000000000101","userId":"user-456","startTime":"2026-11-05T10:00:00.000Z","endTime":"2026-11-05T11:00:00.000Z","status":"CANCELLED"}

$ PATCH /reservations/:id/cancel (2nd)
HTTP/1.1 409 Conflict
{"code":"ALREADY_CANCELLED","message":"Reservation is already cancelled."}

$ PATCH /reservations/<unknown id>/cancel
HTTP/1.1 404 Not Found
{"code":"NOT_FOUND","message":"Reservation 0123456789abcdef01234567 does not exist."}

$ GET /nope
HTTP/1.1 404 Not Found
{"code":"NOT_FOUND","message":"Cannot GET /api/v1/nope"}
```

(`GET /resources?type=BAD` returns `200 []` by design: the contract treats an
unknown type as a filter that matches nothing.)

### Runtime gate — client

Headless Chrome (playwright-core with the system Chrome) against
`http://localhost:5173` after the hook refactor:

```
PASS  filter ROOM hides equipment
PASS  selected available resource: Study Room 302
PASS  empty submit shows inline field error
PASS  valid booking shows confirmation
PASS  My Bookings refetched via reload() and lists the new booking
PASS  overlap shows 409 message: "This resource is already reserved for the selected time window."
PASS  submit button re-enabled after 409
PASS  cancel removes the booking from My Bookings
PASS  backend down renders error: "Cannot reach the CampusHub server. Check that the backend is running."
PASS  no stuck loading indicator
PASS  read errors offer Retry
```
