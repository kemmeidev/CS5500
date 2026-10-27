# AGENTS.md — CampusHub Client

Governing context file for all AI coding agents working in `client/`.

**This file is authoritative.** If a request conflicts with a rule here, stop and say
so rather than silently violating the rule. If a rule is genuinely wrong, propose an
amendment to this file as part of your response — do not work around it.

The backend lives in `../campushub-backend/` and is governed by its own `AGENTS.md`.

---

## Project Overview

The CampusHub client is a React + TypeScript single-page app built with Vite. Students
browse campus resources, book time slots, and manage their reservations. It talks only
to the CampusHub REST API under `/api/v1`.

---

## Commands

Run from `client/`.

| Command           | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Vite dev server on `http://localhost:5173`            |
| `npm run build`   | `tsc -b` type check, then production build — exit 0   |
| `npm run lint`    | oxlint over the project — must report 0 errors        |
| `npm run preview` | Serve the production build                            |

The dev server proxies `/api` to `http://localhost:3000` (`vite.config.ts`), so the
backend needs no CORS. Override the base URL with `VITE_API_BASE_URL` (see
`.env.example`).

---

## Project Structure

```
client/
├── AGENTS.md
├── .env.example
├── docs/                 # lab write-ups (error-handling audit)
└── src/
    ├── main.tsx          # React root
    ├── App.tsx           # page composition and cross-component state
    ├── index.css         # global reset + design tokens (CSS custom properties)
    ├── api/              # the only place that performs HTTP
    │   ├── types.ts          # mirrors OpenAPI components/schemas
    │   ├── campushubApi.ts   # typed fetch client
    │   └── errorMessages.ts  # ApiError → user-facing text
    ├── hooks/            # custom hooks owning async state
    ├── components/       # UI components + co-located *.module.css
    └── config/           # app constants (current user, env)
```

Do not add a new top-level directory under `src/` without amending this file first.

---

## API Contract

`../campushub-backend/docs/openapi.yaml` is the **authoritative contract**.

- `src/api/types.ts` mirrors `components/schemas` field-for-field. If the spec
  changes, update the spec first, then `types.ts`, then `campushubApi.ts`.
- Every HTTP call goes through `src/api/campushubApi.ts`. No `fetch` anywhere else.
- Non-2xx responses are thrown as `ApiError` carrying `status` and the spec's
  `ErrorResponse.code`. Network failures become `ApiError` with status `0` and code
  `NETWORK_ERROR`.
- Native `fetch` only — **no axios** or other HTTP library.

---

## Frontend Guidelines

### Component Architecture

- **Functional components only.** No class components.
- Every component declares an **exported props interface** named `<Component>Props`,
  even if it has a single prop. Components with no props take none.
- Every component and function declares an **explicit return type**
  (`ReactElement`, `void`, `Promise<T>`, …).
- One component per file, file named after the component in PascalCase.

### State Management

- Use standard React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) or
  custom hooks in `src/hooks/`.
- **No inline API calls inside JSX or component bodies.** Components get data and
  actions from hooks; hooks call `campushubApi.ts`.
- Every async workflow exposes explicit **`isLoading`/`isPending` and `error`** state:
  - Loading flags are cleared in `finally`, so a failed request can never leave a
    spinner or disabled button stuck.
  - Errors are rendered with `role="alert"` and a human-readable message from
    `toUserMessage()`. A `409 Conflict` must show its specific meaning
    (e.g. "This resource is already reserved for the selected time window."), never a
    generic failure or nothing.
  - Read errors offer a Retry action.
- Fetches started in `useEffect` are cancelled with an `AbortController` on cleanup;
  an aborted request never sets error state.
- Lift state only as far as the nearest common parent (`App.tsx`).

### Styling

- **CSS Modules**: each component has a co-located `<Component>.module.css`.
- Shared colors, spacing and radii are CSS custom properties in `src/index.css`;
  modules use the tokens instead of hard-coded values.
- No inline `style` props, no CSS-in-JS, no UI framework without approval.

### Validation

- Forms validate input client-side before dispatching a request and show inline
  field errors. Server-side validation still applies; client checks are for UX only.

---

## Coding Standards

- TypeScript `strict` mode. No `any`, `as any`, `@ts-ignore`, `@ts-expect-error`.
  Use `unknown` and narrow.
- `import type` for type-only imports (`verbatimModuleSyntax` is on).
- No floating promises: every promise is awaited or explicitly handled with `void`
  plus internal error handling.
- No `console.log` in committed code.
- No hard-coded API host; base URL comes from `src/config/env.ts`.

### Dependencies

Authorized runtime: `react`, `react-dom`. Authorized dev: the Vite template's tooling
(`vite`, `@vitejs/plugin-react`, `typescript`, `@types/*`, `oxlint`). Do not add a
dependency without stating why and getting approval.

---

## Git

Same conventions as `../campushub-backend/AGENTS.md` §4: Conventional Commits,
imperative lowercase subject under 72 characters, scope = feature or layer
(e.g. `feat(client): add booking form`). Never commit `node_modules/`, `dist/` or
`.env.local`.

---

## Verification Protocol

A component that compiles is not a component that works.

```bash
# 1. Static gates (client/)
npm run build      # must exit 0
npm run lint       # must report 0 errors

# 2. Runtime gate — backend running against a seeded DB
cd ../campushub-backend && npm run seed && npm run dev
cd ../client && npm run dev   # http://localhost:5173
```

Then exercise the UI in a browser: filter resources, create a booking, attempt an
overlapping booking (must show the 409 message), cancel a booking, and stop the
backend to confirm errors render instead of endless loading. Report which of these
you actually ran; an unrun check is a failed check.
