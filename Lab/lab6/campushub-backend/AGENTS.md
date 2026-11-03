# AGENTS.md — CampusHub Backend

Backend rules for AI coding agents. The shared TypeScript, git and verification rules
are in `../AGENTS.md` and apply here too. **Authoritative:** if a request conflicts
with a rule, stop and say so; if a rule is wrong, propose an amendment.

CampusHub is a campus resource reservation system. This package is the REST API:
TypeScript on Express 5, persisting to MongoDB through Mongoose, versioned under
`/api/v1`.

---

## Commands

Run from `campushub-backend/`.

| Command                | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm run dev`          | Dev server via `tsx watch` (`src/app.ts`)                                   |
| `npm run build`        | `tsc`: compile `src/` → `dist/`                                             |
| `npm start`            | Run the compiled build (`dist/app.js`)                                      |
| `npm run typecheck`    | `tsc --noEmit`                                                              |
| `npm run lint`         | ESLint over `src/`                                                          |
| `npm run lint:openapi` | Redocly lint of `docs/openapi.yaml`                                         |
| `npm run format`       | Prettier write                                                              |
| `npm run seed`         | Reset the DB: upsert seed resources, clear reservations (not in production) |

`.env` is loaded by Node's native `--env-file-if-exists`, so there is deliberately no
`dotenv` dependency. `dev`, `start` and `seed` exit at startup if MongoDB at
`MONGODB_URI` is unreachable. Locally: `brew services start mongodb-community`, then
`npm run seed`.

---

## Project Structure

Do not add a top-level directory under `src/` without amending this file first.

```
src/
├── app.ts         # Express assembly, DB connection, server bootstrap
├── config/        # typed env loading (the only process.env reader) + DB connection
├── scripts/       # CLI entry points (seed): import config + services only, never models
├── routes/        # path → controller wiring
├── controllers/   # HTTP request/response handling
├── middleware/    # app-level Express middleware (errorHandler.ts: 404 + error mapping)
├── services/      # business logic + domain errors
└── models/        # Mongoose schemas and their interfaces
```

Naming: `<feature>.<layer>.ts` (`reservation.service.ts`). Models are named after the
entity in PascalCase: `<Entity>.model.ts` (`Reservation.model.ts`).

---

## API Contract

`docs/openapi.yaml` (OpenAPI 3.0) is authoritative for every `/api/v1` endpoint except
`/health`. It is design-first: the spec changes before the code does.

- Paths, methods, field names and status codes match the spec exactly. Nothing goes
  in the code that the spec does not declare. Amend the spec first in the same change,
  then run `npm run lint:openapi`.
- Contract types (`Resource`, `Reservation`, `ErrorResponse`, the `as const` enums …)
  live only in `@campushub/shared` (`../shared/src/index.ts`) and mirror
  `components/schemas` field for field. Import them from `"@campushub/shared"` (bare
  specifier, no `.js`), and never redeclare one locally.
- Every error body is the spec's `ErrorResponse` (`{ code, message }`).
- A contract `id` is the document's `_id` as a 24-hex string, and references such as
  `resourceId` are `ObjectId` refs. The `_id` ⇄ `id` mapping happens only in
  services: models add no `id`, and controllers never see an `ObjectId`.

---

## Dependencies

- Runtime: `@campushub/shared` (workspace package), `express`, `mongoose` (the only MongoDB access layer: no raw driver, ORM
  or query builder).
- Dev: `typescript`, `tsx`, `@types/node`, `@types/express`, `eslint`,
  `typescript-eslint`, `prettier`, `@redocly/cli`. `ts-node` is installed only because
  the handout lists it. Its ESM loader is broken on Node 24+, so never use it in a
  script.
- Use built-ins instead of `body-parser` (`express.json()`), `axios`/`node-fetch`
  (global `fetch`), `lodash` (ES2023), `moment` (`Date`/`Intl`), and `nodemon`
  (`npm run dev`).
- No `.js`/`.mjs`/`.cjs` files under `src/`. (`eslint.config.js` is the only `.js` file.)

---

## Architectural Boundaries

| Layer          | Contains                                                            | Never contains                                                        |
| -------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `routes/`      | `Router()`, path strings, the controller reference as handler       | Handler bodies (even one-line inline handlers), validation, DB access |
| `controllers/` | Read `req`, call exactly one service, set status, send the body     | Any Mongoose call, business rules, orchestration                      |
| `services/`    | Business logic, domain validation, Mongoose model calls             | Express types, status codes, `res.*`, any knowledge of HTTP           |
| `models/`      | Schemas typed against an exported interface, indexes, schema checks | Business logic, HTTP concerns, cross-model orchestration              |

Imports flow one way, `routes → controllers → services → models`, and never skip a
layer or point upward. Shared helpers go in `src/config/` (or a new `src/utils/`,
after amending this file).

## Errors

- Services throw `DomainError` subclasses (`services/domain.errors.ts`).
  `errorHandler` maps them to 400 / 404 / 409, and maps anything else to a
  generic 500. `middleware/` is mounted by `app.ts` and may import only
  `services/domain.errors.ts` and `@campushub/shared`.
- **Controllers contain no `try/catch` and take no `next`.** Express 5 forwards
  sync throws and rejected promises to `middleware/errorHandler.ts`, the only place
  where errors become HTTP responses. A controller never swallows an error and never
  calls `process.exit()`.
- Never send a stack trace or a raw driver error in a response body.

## ESM imports

ESM (`"type": "module"`) with `module: nodenext`: **every relative import ends in
`.js`**, even though the source is `.ts`. `tsc` does not rewrite specifiers, and `tsx`
maps `.js` back to `.ts`. Dropping the extension or writing `.ts` fails at runtime
with `ERR_MODULE_NOT_FOUND`. If that error appears, the runner is misconfigured, not
the import. No `require`, `module.exports` or `__dirname` (use `import.meta.dirname`).

## Configuration

No hard-coded ports, URIs or secrets. `process.env` is read only in `src/config/`,
which validates at startup and fails fast. Every new variable goes into `.env-example`
with a comment.

---

## Verification Protocol

Run all of these; reading the code is not verification.

```bash
npm run typecheck && npm run lint && npm run lint:openapi && npm run build
npm run format                          # must leave no [warn] lines
test -f .env || cp .env-example .env
brew services start mongodb-community && npm run seed
npm run dev                             # background
curl -i http://localhost:3000/api/v1/<endpoint>
```

Paste the real status line and body of each curl call into the report; never write
a response you did not observe. Before reporting done, also confirm:

- routes and types still match `docs/openapi.yaml`
- no route holds a handler body, and no controller holds a DB call
- every relative import ends in `.js`
- no unapproved dependency, and every new env var is in `.env-example` and `.env`

If a documented command fails, treat it as a bug: find whether the new code or the
toolchain is at fault, and report the exact error. Never work around it by breaking a
rule in `src/`.
