# Lab 7 — Test Suite & Coverage Report

Run from `campushub-backend/` with `npx jest --coverage` (2026-11-09, Node 26.10,
Jest 30.5, mongodb-memory-server 11.3 → MongoDB 8.2.6). No local `mongod` is needed.

## Suites

| Suite                                                | Tests | Kind                                  |
| ---------------------------------------------------- | ----: | ------------------------------------- |
| `src/services/__tests__/reservation.service.test.ts` |    44 | Unit: happy path + adversarial cases  |
| `src/services/__tests__/resource.service.test.ts`    |    15 | Unit: filters and id lookup           |
| `src/services/__tests__/seed.service.test.ts`        |     3 | Unit: seed reset, production guard    |
| `src/routes/__tests__/reservation.routes.test.ts`    |    19 | Supertest HTTP integration (`app.ts`) |

## Isolation

Services run against real Mongoose models on an in-memory MongoDB (`src/test/setup.ts`):
one server per test file, every collection emptied after each test. `jest.spyOn` is used
only where the database cannot produce a failure on demand: `ReservationModel.prototype.validate`
rejecting, `countDocuments` failing mid-request (this also checks that the per-resource
lock is released), and `ResourceModel.findById` throwing to exercise the generic 500.

## Adversarial edge cases (handout list)

| Case                                                       | Expected                                     |
| ---------------------------------------------------------- | -------------------------------------------- |
| Double booking with identical start/end                    | `ConflictError` `DOUBLE_BOOKING` / HTTP 409  |
| `endTime` before `startTime` (also equal, and 1 ms before) | `ValidationError` / HTTP 400                 |
| Well-formed but non-existent `resourceId`                  | `ValidationError` / HTTP 400                 |
| Overlap by 1 ms at either edge                             | `DOUBLE_BOOKING`; touching edges are allowed |

A mutation check confirmed the overlap tests are not vacuous: changing the overlap query's
`$lt` to `$lte` fails the touching-boundary test.

## Coverage

Thresholds (`jest.config.ts`): 80% statements, branches, functions and lines over
`src/services/**` and `src/controllers/**`. Result: **100% on all four**, so no extra
targeted pass was needed.

```
----------------------------|---------|----------|---------|---------|-------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------|---------|----------|---------|---------|-------------------
All files                   |     100 |      100 |     100 |     100 |
 controllers                |     100 |      100 |     100 |     100 |
  health.controller.ts      |     100 |      100 |     100 |     100 |
  reservation.controller.ts |     100 |      100 |     100 |     100 |
  resource.controller.ts    |     100 |      100 |     100 |     100 |
 services                   |     100 |      100 |     100 |     100 |
  domain.errors.ts          |     100 |      100 |     100 |     100 |
  health.service.ts         |     100 |      100 |     100 |     100 |
  reservation.service.ts    |     100 |      100 |     100 |     100 |
  resource.service.ts       |     100 |      100 |     100 |     100 |
  seed.service.ts           |     100 |      100 |     100 |     100 |
----------------------------|---------|----------|---------|---------|-------------------
Statements   : 100% ( 125/125 )
Branches     : 100% ( 69/69 )
Functions    : 100% ( 34/34 )
Lines        : 100% ( 122/122 )
Test Suites: 4 passed, 4 total
Tests:       81 passed, 81 total
Snapshots:   0 total
Time:        2.988 s
Ran all test suites.
```
