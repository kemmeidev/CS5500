# AGENTS.md — CampusHub (Lab 7 root)

Rules shared by every package in `lab7/`. Each package adds its own rules:
`campushub-backend/AGENTS.md` (Express + Mongoose API) and `client/AGENTS.md`
(React + Vite SPA). **These files are authoritative.** If a request conflicts with a
rule, stop and say so; if a rule is wrong, propose an amendment instead of working
around it.

## Layout

```
lab7/                    # npm workspace root: run `npm install` here, once
├── shared/              # @campushub/shared: API contract types + enums, built to dist/
├── campushub-backend/   # REST API under /api/v1 — contract: docs/openapi.yaml
└── client/              # SPA that calls the API through the Vite /api proxy
```

Root scripts run every workspace: `npm run build`, `npm run typecheck`,
`npm run lint`. `npm install` builds `shared/` (postinstall). After editing
`shared/src/`, run `npm run build -w @campushub/shared` before the other packages
will see the change.

## Where to look

Work from source: `*/src/**`, the package configs, and
`campushub-backend/docs/openapi.yaml`. Do not open or search build output
(`dist/`, `build/`, `coverage/`, `*.map`, `*.tsbuildinfo`), `node_modules/`,
lockfiles, logs, `.env`, or the earlier labs' write-ups (`.ignore` lists all of them).
They cost tokens and say nothing about the current code.

## TypeScript rules (all packages)

- `strict` mode. No `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, or an
  `eslint-disable` for a typing rule. Use `unknown` and narrow it.
- Every function declares explicit parameter and return types (`Promise<T>` for async).
- `import type` for type-only imports (`verbatimModuleSyntax` is on).
- No floating promises: await or return them, or `void` a call that handles its own errors.
- No `console.log` in committed code; `console.warn`/`console.error` only.
- No dead code, commented-out blocks, or placeholder `TODO`s. Comment only the
  reasoning that isn't obvious from the code.
- No new dependency without stating why and getting approval.

## Git

Conventional Commits, imperative mood, lowercase subject under 72 characters, no
trailing period. The scope is the feature or package touched, e.g.
`feat(client): add booking form`, `refactor(backend): extract error middleware`.

PR descriptions have two short parts: **What** (the change and the layers it touches)
and **Why / rules applied** (which AGENTS.md rules shaped it, and any rule that was
bent). Do not claim a check passed unless you ran it.

Never commit `.env`, `node_modules/` or build output, and never `git add -f` past
`.gitignore`.

## Verification

Static checks are not enough: a change is done only once it has been run. Each
package's AGENTS.md lists its gates. Report which checks you ran, and paste the real
output of runtime checks. A check you did not run counts as failed.
