# AGENTS.md — CampusHub Backend

Governing context file for all AI coding agents working in this repository.

**This file is authoritative.** If a request conflicts with a rule here, stop and say
so rather than silently violating the rule. If a rule is genuinely wrong, propose an
amendment to this file as part of your response — do not work around it.

---

## Project Overview

CampusHub is a **multi-tenant campus resource management system**. This repository is
the backend service only: a TypeScript REST API built on Express, persisting to
MongoDB through Mongoose. All routes are versioned under `/api/v1`.

---

## Commands

Run these from the repository root. **You are required to actually run these — see
the Verification Protocol below. Reading the code is not verification.**

| Command                | Purpose                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the dev server via `tsx watch` (`src/app.ts`)                                   |
| `npm run build`        | Compile `src/` → `dist/` with `tsc`                                                   |
| `npm start`            | Run the compiled build (`dist/app.js`)                                                |
| `npm run typecheck`    | `tsc --noEmit` — must exit 0                                                          |
| `npm run lint`         | ESLint over `src/` — must exit 0                                                      |
| `npm run lint:openapi` | Redocly lint of `docs/openapi.yaml` — must exit 0                                     |
| `npm run format`       | Prettier write over the repo — must leave no `[warn]`                                 |
| `npm run seed`         | Reset the database: upsert seed resources, clear reservations (refuses in production) |

`dev` and `start` load `.env` through Node's native `--env-file-if-exists`. There is
deliberately no `dotenv` dependency; do not add one.

### Database prerequisite

`dev`, `start`, and `seed` connect to MongoDB at `MONGODB_URI` and **exit at startup
if it is unreachable**. Locally, MongoDB Community runs as a Homebrew service:

```bash
brew services start mongodb-community   # once per boot
npm run seed                            # known state before any manual test run
```

---

## Project Structure

Place every new file in its designated directory. Do not invent new top-level
directories under `src/` without amending this file first.

```
campushub-backend/
├── AGENTS.md
├── .env-example         # committed template
├── .env                 # git-ignored, never commit
├── eslint.config.js
├── tsconfig.json
├── dist/                # build output, git-ignored
├── docs/
│   ├── openapi.yaml     # authoritative API contract (see "API Contract" below)
│   ├── manual-tests.md  # environment setup + curl regression suite
│   └── lab4-steering-log.md  # Lab 4 agent failure/remediation incidents
└── src/
    ├── app.ts           # Express app assembly, DB connection, server bootstrap
    ├── config/          # typed environment/config loading and the DB connection
    ├── scripts/         # CLI entry points (e.g. seed); import config + services only
    ├── types/           # contract-level API interfaces mirroring docs/openapi.yaml
    ├── routes/          # path definitions and middleware wiring
    ├── controllers/     # HTTP request/response handling
    ├── services/        # business logic
    └── models/          # Mongoose schemas and their interfaces
```

`src/types/` is a leaf: it holds only type declarations and `as const` value lists,
imports nothing from other `src/` layers, and may be imported by any layer.

Naming convention: `<feature>.<layer>.ts` — e.g. `health.routes.ts`,
`booking.controller.ts`, `booking.service.ts`. **Models are the exception:** they are
named after their entity in PascalCase, `<Entity>.model.ts` — e.g. `Resource.model.ts`,
`Reservation.model.ts` (required by the Lab 3 handout).

`src/scripts/` files are process entry points, not a request layer: they may import
`src/config/` and services, and never import models directly.

---

## API Contract

`docs/openapi.yaml` (OpenAPI 3.0) is the **authoritative contract** for every endpoint
under `/api/v1` other than `/health`. Design-first: the spec changes before the code does.

- Route paths, HTTP methods, request/response field names, and status codes must match
  the spec exactly. Do not add an endpoint, field, or status code that the spec does not
  declare. If one is needed, amend `docs/openapi.yaml` first in the same change.
- `src/types/` interfaces mirror `components/schemas` field-for-field.
- Every error response body is the spec's `ErrorResponse` (`{ code, message }`).
- A contract `id` is the document's MongoDB `_id` rendered as a 24-hex string; a
  contract reference such as `resourceId` is an `ObjectId` `ref` in the model. The
  `_id` ⇄ `id` mapping happens only in services — models do not add an `id` field, and
  controllers never see an `ObjectId`.
- `npm run lint:openapi` must exit 0 after any spec change.

---

## 1. Tech Stack & Libraries

### Authorized — runtime dependencies

Only these may appear in `dependencies`:

- **TypeScript** — the only source language
- **Express** — HTTP framework
- **Mongoose** — the only permitted MongoDB access layer

### Authorized — development dependencies

- `typescript`, `tsx`, `@types/node`, `@types/express`
- `eslint`, `typescript-eslint`, `prettier`
- `@redocly/cli` — OpenAPI linter behind `npm run lint:openapi`
- `ts-node` — **installed but not used.** It is present only because the course
  handout lists it. Its ESM loader is broken on Node 24+, so `tsx` is the dev runner.
  Never reintroduce `ts-node` into a script.

### Strictly forbidden

- **Raw JavaScript.** No `.js`, `.jsx`, `.mjs`, or `.cjs` file may be created under
  `src/`. All source is `.ts`. (`eslint.config.js` at the root is the sole exception,
  because ESLint requires it.)
- **Any dependency not listed above.** Specifically rejected, with the required
  alternative:
  | Do not use                                            | Use instead                           |
  | ----------------------------------------------------- | ------------------------------------- |
  | `body-parser`                                         | `express.json()` — built into Express |
  | `axios`, `node-fetch`, `request`                      | the global `fetch` in Node 18+        |
  | `lodash`, `underscore`                                | native ES2023 array/object methods    |
  | `moment`                                              | native `Date` / `Intl`                |
  | `mongodb` driver directly, Prisma, TypeORM, Sequelize | Mongoose                              |
  | `nodemon`                                             | `npm run dev`                         |
- **Any ORM, query builder, or raw driver call that bypasses Mongoose.**

### Adding a dependency

Do not run `npm install <pkg>` for an unlisted package on your own initiative.
Instead: state what you need, why no authorized package covers it, and propose the
edit to this section. Wait for approval.

---

## 2. Architectural Boundaries

A strict layered separation of concerns. Every layer has exactly one job.

| Layer          | Must contain                                                                                                                        | Must **never** contain                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `routes/`      | `express.Router()` instances, path strings, middleware wiring, and the controller reference passed as a handler                     | Handler function bodies, validation logic, business rules, any DB access                                            |
| `controllers/` | Reading `req`, calling exactly one service, shaping the response body, setting HTTP status codes, forwarding errors via `next(err)` | **Any database query or Mongoose call whatsoever.** Business rules, calculations, or orchestration logic            |
| `services/`    | All business logic, orchestration, validation of domain rules, and Mongoose model calls                                             | Express types (`Request`, `Response`, `NextFunction`), HTTP status codes, `res.*` calls, knowledge that HTTP exists |
| `models/`      | Mongoose schemas, their exported TypeScript interfaces, indexes, and schema-level validators                                        | Business logic, HTTP concerns, cross-model orchestration                                                            |

### Dependency direction

Imports flow one way only:

```
routes → controllers → services → models
```

- **Never skip a layer.** A route must not import a service or a model. A controller
  must not import a model.
- **Never import upward.** A service must not import a controller; a model must not
  import a service.
- Shared helpers belong in `src/config/` or a new `src/utils/` (which requires
  amending this file first).

### Route files: the shape to follow

```ts
// src/routes/health.routes.ts
import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";

const router: Router = Router();

router.get("/health", getHealth); // wiring only — no logic in this file

export default router;
```

Inline handlers such as `router.get("/health", (req, res) => { ... })` are a
violation, even for a one-line response.

---

## 3. Coding Standards & Safety

### Explicit typing is mandatory

- Every function — including every controller, service, and middleware — declares
  **explicit parameter types and an explicit return type**. No relying on inference
  at a module boundary.
- Every Mongoose schema has a corresponding **exported `interface`**, and the schema
  is typed against it:
  ```ts
  export interface IBooking {
    campusId: string;
    resourceId: string;
    startsAt: Date;
  }

  const bookingSchema = new Schema<IBooking>({/* ... */});
  ```
- Async functions are typed as `Promise<T>`, never bare.
- Prefer `interface` for object shapes; use `type` for unions and aliases.

### `any` is banned

- No `any`, no implicit `any`, no `as any`.
- No `@ts-ignore`, no `@ts-expect-error`, no `eslint-disable` for a typing rule.
- When a type is genuinely unknown, use `unknown` and narrow it with a type guard.
- Casting to silence the compiler is not a fix. If types do not line up, the model or
  interface is wrong — fix that instead.

### Async error handling

- **No unhandled promises.** Every promise is `await`ed, returned, or explicitly
  `.catch()`ed. A floating promise is a build failure (`no-floating-promises`).
- Every `await` on a request path is inside `try/catch`, or wrapped by a shared async
  handler utility.
- Controllers forward errors with `next(err)` — they never swallow an error and never
  call `process.exit()`.
- Errors surface through a single Express error-handling middleware. Never leak stack
  traces or raw driver errors in a response body.
- `res.status(...)` is set deliberately on every path: `200`/`201` success,
  `400` validation, `401`/`403` auth, `404` missing, `500` unexpected.

### ESM import rules — read this carefully

This project is ESM (`"type": "module"`) with `module: nodenext`. Therefore:

- **Every relative import must include the `.js` extension**, even though the source
  file is `.ts`. This looks wrong and is not — `tsc` does not rewrite specifiers, so
  the extension must match the _emitted_ file, and `tsx` resolves `.js` back to the
  `.ts` source at dev time. Do not "correct" this to `.ts` or drop the extension;
  both break at runtime with `ERR_MODULE_NOT_FOUND`:
  ```ts
  import { getHealth } from "../controllers/health.controller.js"; // correct
  import { getHealth } from "../controllers/health.controller"; // WRONG — fails at runtime
  ```
- Use `import type { ... }` for type-only imports (`verbatimModuleSyntax` is on).
- No `require()`, no `module.exports`, no `__dirname` — use `import.meta.dirname`.

### Configuration and secrets

- No hard-coded ports, URIs, credentials, or API keys anywhere in `src/`.
- All `process.env` access happens in **one** typed module under `src/config/`, which
  validates required variables at startup and fails fast if any are missing. No other
  file reads `process.env`.
- Every new variable must be added to `.env-example` with a comment in the same
  change.

### General

- No `console.log` in committed code; use `console.warn`/`console.error`, or a logger
  once one is authorized.
- No dead code, no commented-out blocks, no placeholder `TODO` implementations that
  silently return empty values.
- Do not add explanatory comments for self-evident code. Comment only non-obvious
  reasoning.

---

## 4. Git & Commit Formatting

### Commit messages

Conventional Commits, imperative mood, lowercase subject, no trailing period:

```
feat(health): add GET /api/v1/health endpoint
fix(booking): reject overlapping reservations
chore(config): add MONGODB_URI to env template
docs(agents): tighten controller DB-access rule
refactor(services): extract availability check
```

Scope is the feature or layer touched. Keep the subject under 72 characters.

### PR and diff descriptions

Every PR or multi-file change must include a **concise** description with two parts:

1. **What was built** — the change in a few sentences, plus the endpoints, models, or
   layers affected.
2. **Why / which context rules applied** — name the AGENTS.md rules that shaped the
   implementation, and any decision this file forced.

Template:

```markdown
### What

Added the `/api/v1/health` health-check endpoint: `health.routes.ts` wires the path,
`health.controller.ts` returns status and uptime, `health.service.ts` builds the
payload.

### Why / context rules applied

- §2 Architectural Boundaries: status payload lives in the service, not the
  controller, and the route file contains wiring only.
- §3 Explicit typing: `IHealthStatus` interface added for the response shape.
- §1 Tech Stack: used `express.json()` rather than adding `body-parser`.
```

State honestly if a rule was bent and why. Do not claim compliance you have not
verified.

### Never commit

- `.env` or any real secret
- `dist/` or other build output
- `node_modules/`

These are covered by `.gitignore`; do not use `git add -f` to override it.

---

## Verification Protocol

**Static checks are not sufficient. Code that compiles is not code that runs.** Any
task that adds or changes an endpoint is incomplete until you have started the server
and received a real HTTP response.

Run these in order. Do not skip a step because the code "looks correct."

```bash
# 1. Static gates
npm run typecheck                  # must exit 0
npm run lint                       # must exit 0
npm run format                     # must leave no [warn] lines

# 2. Runtime gate — required for any endpoint change
test -f .env || cp .env-example .env    # .env is git-ignored and machine-local
brew services start mongodb-community   # MongoDB must be reachable at MONGODB_URI
npm run seed                            # reset to the seed data
npm run dev                             # leave running in the background

# 3. Hit the actual endpoint and read the actual response
curl -i http://localhost:3000/api/v1/<your-endpoint>

# 4. Compile path must work too, not just the dev loader
npm run build                      # must exit 0 and emit into dist/
```

In your final report you **must paste the real terminal output** of step 3 —
the status line and response body. Do not paraphrase it, do not predict it, and
never write a response body you did not observe. If you did not run the server, say
so in plain words instead of implying success.

### When a documented command fails

A failure in `npm run dev`, `build`, `lint`, or `typecheck` is a first-class bug, not
an obstacle to route around. Specifically:

- **Never** work around a broken toolchain by changing `src/` in a way that violates
  a rule in this file. If the `.js` import rule appears to break the dev server, the
  runner is misconfigured — the rule is correct.
- Diagnose which layer failed: your new code, or the pre-existing toolchain
  (`package.json` scripts, `tsconfig.json`, `eslint.config.js`).
- If the toolchain is at fault, stop and report the exact error text plus a proposed
  fix. Do not silently skip the verification step and report success.
- `ERR_MODULE_NOT_FOUND` on a relative import almost always means the runner, not the
  import. See the ESM import rules in §3.

## Definition of Done

Before reporting any code task as complete, confirm every line below. If any fails,
fix it and re-check — never report completion with a known failure.

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run lint:openapi` exits 0, and routes/types match `docs/openapi.yaml`
- [ ] `npm run format` leaves no `[warn]` lines
- [ ] `npm run build` exits 0
- [ ] **Server started via `npm run dev` and the endpoint returned a real response,
      whose output is pasted in the report**
- [ ] No `any`, `as any`, `@ts-ignore`, or `@ts-expect-error` introduced
- [ ] Every new function has explicit parameter and return types
- [ ] Every file is in its correct layer, and no layer was skipped or imported upward
- [ ] No route file contains an inline handler body
- [ ] No controller contains a database query
- [ ] All relative imports carry the `.js` extension
- [ ] No new dependency was added without approval
- [ ] New env vars added to `.env-example` **and** to the local `.env`

State explicitly which checks you ran and which you did not. An unrun check is a
failed check — report it as such rather than assuming it passes.
