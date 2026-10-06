# Manual Regression Tests

The Lab 2 curl suite, updated for the Lab 3 persistence layer. Lab 3 assumes an
environment that Lab 2 did not need. Set it up before running anything below.

## 1. Environment prerequisites

Lab 2 kept data in memory and needed nothing but Node. Lab 3 adds three
assumptions:

| Assumption                            | Why                                                                                                                                                      | How                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| A MongoDB server is reachable         | `src/app.ts` awaits `connectDatabase()` before `listen`, so the server **exits at startup** without one (after Mongoose's 30 s server-selection timeout) | `brew services start mongodb-community`                   |
| `.env` has `MONGODB_URI`              | `src/config/env.config.ts` fails fast on a missing variable                                                                                              | `test -f .env \|\| cp .env-example .env`                  |
| The `resources` collection holds data | Resources are no longer hard-coded in the service, so an empty database answers `GET /resources` with `[]` and every POST with 400                       | `npm run seed` (also clears reservations for a clean run) |

Resource IDs are now MongoDB ObjectIds. Lab 2's `res-101` is rejected with 400.
The seed uses fixed IDs so the commands below can be repeated:

| ID                         | Resource        | Type      | Available |
| -------------------------- | --------------- | --------- | --------- |
| `66f000000000000000000101` | Study Room 302  | ROOM      | yes       |
| `66f000000000000000000102` | 3D Printer A    | EQUIPMENT | yes       |
| `66f000000000000000000103` | Chemistry Lab 1 | LAB       | yes       |
| `66f000000000000000000104` | Study Room 118  | ROOM      | **no**    |

```bash
brew services start mongodb-community
npm run seed
npm run dev
```

## 2. Test cases

Run them in order after a fresh `npm run seed`. Later cases depend on earlier
reservations.

```bash
B=http://localhost:3000/api/v1
R1=66f000000000000000000101
J='Content-Type: application/json'
```

| #   | Request                                                                                                                                                       | Expected                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | `curl -i $B/health`                                                                                                                                           | 200 `{"status":"ok",...}`                         |
| 2   | `curl -i $B/resources`                                                                                                                                        | 200, 4 resources                                  |
| 3   | `curl -i "$B/resources?type=ROOM"`                                                                                                                            | 200, 2 resources                                  |
| 4   | `curl -i "$B/resources?type=STUDY_ROOM"`                                                                                                                      | 200 `[]`                                          |
| 5   | `curl -i "$B/resources?type="`                                                                                                                                | 400 `VALIDATION_ERROR`                            |
| 6   | `curl -i -X POST $B/reservations -H "$J" -d '{"resourceId":"'$R1'","userId":"user-456","startTime":"2026-10-01T10:00:00Z","endTime":"2026-10-01T11:00:00Z"}'` | 201, `status: CONFIRMED`, ObjectId `id`           |
| 7   | Repeat #6                                                                                                                                                     | 409 `DOUBLE_BOOKING`                              |
| 8   | #6 with `10:30`–`11:30`                                                                                                                                       | 409 `DOUBLE_BOOKING`                              |
| 9   | #6 with `11:00`–`12:00` (back-to-back)                                                                                                                        | 201                                               |
| 10  | #6 with `resourceId` `66f000000000000000000104`                                                                                                               | 409 `RESOURCE_UNAVAILABLE`                        |
| 11  | #6 without `endTime`                                                                                                                                          | 400                                               |
| 12  | #6 with `startTime` `2026-10-03` (date only)                                                                                                                  | 400                                               |
| 13  | #6 with `2026-02-30T10:00:00Z`                                                                                                                                | 400                                               |
| 14  | #6 with `2026-10-03T10:00:00` (no zone)                                                                                                                       | 400                                               |
| 15  | #6 with `endTime` earlier than `startTime`                                                                                                                    | 400 `endTime must be later than startTime.`       |
| 16  | #6 with `resourceId` `66f0000000000000000009ff` (well-formed, unknown)                                                                                        | 400 `does not reference an existing resource`     |
| 17  | #6 with `resourceId` `res-101` (malformed)                                                                                                                    | 400 `must be a 24-character hexadecimal ObjectId` |
| 18  | #6 plus `"status":"PENDING"` or `"id":"x"`                                                                                                                    | 400 `is read-only`                                |
| 19  | `-d '{"resourceId":'` (malformed JSON)                                                                                                                        | 400 `Request body is not valid JSON.`             |
| 20  | `curl -i $B/reservations/user/user-456`                                                                                                                       | 200, reservations sorted by `startTime`           |
| 21  | `curl -i $B/reservations/user/nobody`                                                                                                                         | 200 `[]`                                          |
| 22  | `curl -i $B/nope`                                                                                                                                             | 404 `NOT_FOUND`                                   |

## 3. Behaviour that only exists with a database

- **Persistence:** stop and restart the server. #20 still returns the same
  reservations. Under Lab 2 they were lost on every restart.
- **Concurrency:** ten identical POSTs fired in parallel produce exactly one 201
  and nine 409s:

  ```bash
  for i in $(seq 1 10); do curl -s -o /dev/null -w '%{http_code}\n' -X POST $B/reservations -H "$J" \
    -d '{"resourceId":"66f000000000000000000103","userId":"user-race","startTime":"2026-11-01T10:00:00Z","endTime":"2026-11-01T11:00:00Z"}' & done | sort | uniq -c
  ```

- **Fail-fast:** `brew services stop mongodb-community`, then `npm run dev`. The
  process exits with `MongooseServerSelectionError` and never starts listening.
