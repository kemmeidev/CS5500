# Lab 4 Prompt Steering Log

How the incidents were produced: after the Lab 4 scaffold commit, a separate AI coding
agent (Claude Code subagent, isolated git worktree, its own database
`campushub_baseline` on port 3100) was given a deliberately thin, handout-style
prompt. Its output was checked against the static gates and the 38-case curl suite
in `docs/manual-tests.md`. Each failure was then corrected with a remediation
prompt. Incident 3 is a failure of the primary agent (the one that wrote the
committed code), caught by the same verification protocol.

The committed implementation is the primary agent's. After the remediation in
Incident 2, the baseline agent's server returned output identical to the committed
code on all 38 cases, apart from ObjectIds and timestamps. Its worktree was then
discarded.

Baseline prompt used for Incidents 1 and 2 (environment notes trimmed):

> In Lab/lab4/campushub-backend (an Express + Mongoose TypeScript API), add these
> endpoints:
>
> - GET /api/v1/resources should accept query parameters to filter by type (ROOM,
>   EQUIPMENT, LAB) and isAvailable.
> - GET /api/v1/reservations/user/{userId} should list all bookings for a student.
> - Add PATCH /api/v1/reservations/{id}/cancel that sets the reservation status to
>   CANCELLED.

---

### Incident 1: Agent started from the wrong commit and had no code to edit

- **Initial Agent Output:** The agent's isolated worktree was created from
  `origin/main` (`d98a95b`), not from the local `lab4` branch. On `origin/main`,
  `Lab/lab4` was a 1-byte placeholder file created on GitHub ("Create lab4", PR #2),
  so the backend directory did not exist. The agent stopped without editing
  anything. That was correct, but it also reported that the main-checkout copy of
  `Lab/lab4/campushub-backend` "isn't in git". That was false: the copy had been
  committed as `3bfa2c4` on `lab4`. The agent inferred it from its own branch
  alone. Nine minutes produced no output.
- **Root Cause:** Missing repository context. The prompt named a directory but not
  the commit it lived on, and the worktree tooling bases new worktrees on the
  remote's default branch. The run also exposed a second, related problem:
  `origin/main` had moved (PR #1 merged `lab3`, and PR #2 added the placeholder
  file). The local `lab4` branch had been cut from the old `lab3`, so its
  `Lab/lab4/` directory would have collided with the placeholder file in a PR.
- **Remediation Prompt:** The scaffold commit was rebuilt on top of `origin/main`,
  replacing the placeholder file with the directory (new commit `45f1aa0`). The
  agent was re-launched with this line prepended to the same prompt:

  > First, in your worktree run `git checkout --detach 45f1aa0` — that commit
  > contains Lab/lab4/campushub-backend.

- **Resolution:** The re-launched agent found the backend and implemented the
  endpoints. `git log` in its worktree showed `45f1aa0`, and `git status` listed
  only its edits to the eight expected files.

### Incident 2: "List all bookings" silently kept as active-only

- **Initial Agent Output:** The agent added the `isAvailable` filter, `NotFoundError`
  → 404, and an atomic PATCH `/cancel`, and the static gates passed. But it left
  `GET /reservations/user/{userId}` exactly as in Lab 3:
  `ReservationModel.find({ userId, status: { $ne: "CANCELLED" } })`. It reported the
  endpoint as satisfied because it "came over from Lab 3 already working". It also
  extended the spec text to say a cancelled reservation "no longer appears in a
  user's active reservations". Observed effect: after PATCH `/cancel` returned
  `200 ... "status":"CANCELLED"`, the user's list no longer contained that
  reservation, so it was missing exactly the booking that had just changed state.
  It did not add the Lab 4 cases to `docs/manual-tests.md`.
- **Root Cause:** The agent anchored on existing code instead of the new
  requirement. The thin prompt did not flag that "all bookings" changes Lab 3's
  `listActiveReservationsForUser` contract, and the existing function name, spec
  summary ("all active reservations") and passing tests all pointed toward keeping
  it. A second risk existed: the same `status: { $ne: "CANCELLED" }` clause also
  appears in the overlap query, where it must stay. A careless "remove the CANCELLED
  filter" fix would have made cancelled slots un-rebookable.
- **Remediation Prompt:**

  > Correction: GET /reservations/user/{userId} must list ALL of a student's
  > bookings, CANCELLED included — "all bookings" is the requirement, and the
  > existing active-only filter does not satisfy it.
  >
  > Make these changes in your worktree (Lab/lab4/campushub-backend), following
  > AGENTS.md:
  >
  > 1. docs/openapi.yaml first (design-first): rename operationId
  >    listActiveReservationsForUser -> listReservationsForUser; change
  >    summary/description/200 text to "every reservation of the user in any status,
  >    including CANCELLED, ordered by startTime"; bump info.version to 1.2.0.
  > 2. src/services/reservation.service.ts: rename the function to
  >    listReservationsForUser and query `{ userId }` only — remove the
  >    `status: { $ne: "CANCELLED" }` clause. Do NOT touch the overlap query in
  >    insertIfFree: that one must keep ignoring CANCELLED so a cancelled slot can be
  >    rebooked.
  > 3. Update the import/call in src/controllers/reservation.controller.ts.
  > 4. Fix the stale comment in src/services/reservation.service.ts / the spec that
  >    says a cancelled reservation "no longer appears in a user's active
  >    reservations".
  > 5. docs/manual-tests.md: add the Lab 4 cases (isAvailable
  >    true/false/combined/invalid; cancel 200, re-cancel 409, unknown 404,
  >    malformed 400; rebook freed slot 201; user list shows CANCELLED).
  >
  > Acceptance criteria — run them and paste the real output, don't predict it:
  >
  > - typecheck, lint, lint:openapi, format (no [warn]), build exit 0.
  > - npm run seed, npm run dev on PORT=3100 (DB campushub_baseline), then: POST a
  >   reservation, PATCH it /cancel (200 CANCELLED), then GET
  >   /api/v1/reservations/user/<that user> must return it WITH
  >   "status":"CANCELLED"; re-POST the same slot must be 201.
  >
  > Stop the server when done. Don't commit.

- **Resolution:** The agent changed only the user-list query and left the overlap
  query intact. Its pasted acceptance output showed the cancelled reservation in the
  user list with `"status":"CANCELLED"` and the re-POST of the freed slot as
  `201 Created`. Independent check: the agent's server was re-seeded and the full
  38-case suite (`docs/manual-tests.md` cases 1–38) was run against it on port 3100.
  ObjectIds and timestamps were normalized, and its output was then diffed with the
  committed implementation on port 3000: **identical on all 38 cases**.

### Incident 3: Hallucinated database timeout in the manual test doc

- **Initial Agent Output:** While documenting the new 500 test, the primary agent
  wrote that after MongoDB is stopped, `GET /resources` returns 500 "after
  Mongoose's command buffering times out (about 10 s)". It wrote this before running
  the test.
- **Root Cause:** The agent recalled Mongoose's 10 s `bufferTimeoutMS` default.
  That timeout applies only to commands issued before a connection exists. Here the
  connection had been established and then lost, so the driver's 30 s
  `serverSelectionTimeoutMS` governs. The claim came from memory, not observation,
  which AGENTS.md's Verification Protocol forbids ("never write a response body you
  did not observe").
- **Remediation Prompt:** Self-correction under the existing rule, re-applied as an
  explicit instruction before the doc was committed:

  > Do not state a timing or response you have not observed. Stop mongod with the
  > server running, time the request with `time curl -si -m 40 $B/resources`, and
  > write the measured value.

- **Resolution:** The measured run printed `HTTP/1.1 500 Internal Server Error` and
  `{"code":"INTERNAL_ERROR","message":"Internal Server Error"}` after **30.03 s**,
  and PATCH `/cancel` behaved the same. `docs/manual-tests.md` now says "Mongoose's
  30 s server-selection timeout (observed: 30.03 s)". The body carries no driver
  detail, which confirms the Express error middleware still hides
  `MongooseServerSelectionError`.
