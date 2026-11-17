# AGENTS.md — CampusHub Client

Client rules for AI coding agents. The shared TypeScript, git and verification rules
are in `../AGENTS.md` and apply here too. **Authoritative:** if a request conflicts
with a rule, stop and say so; if a rule is wrong, propose an amendment.

A React + TypeScript SPA built with Vite. Students browse campus resources, book time
slots and manage their reservations, through the CampusHub REST API under `/api/v1`.

---

## Commands

Run from `client/`.

| Command           | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Vite dev server on `http://localhost:5173`          |
| `npm run build`   | `tsc -b` type check, then production build — exit 0 |
| `npm run lint`    | oxlint — must report 0 errors                       |
| `npm run preview` | Serve the production build                          |

The dev server proxies `/api` to `http://localhost:3000` (`vite.config.ts`), so the
backend needs no CORS. `VITE_API_BASE_URL` overrides the base URL (see `.env.example`).

---

## Project Structure

Do not add a top-level directory under `src/` without amending this file first.

```
src/
├── main.tsx          # React root
├── App.tsx           # page composition and cross-component state
├── index.css         # global reset + design tokens (CSS custom properties)
├── api/              # the only place that performs HTTP
│   ├── campushubApi.ts   # typed fetch client
│   └── errorMessages.ts  # ApiError → user-facing text
├── hooks/            # custom hooks owning async + form state
│   ├── useApiQuery.ts / useAsyncAction.ts   # generic read / mutation state
│   ├── useReservations.ts                   # list, create, cancel reservations
│   └── useBookingForm.ts                    # booking fields, validation, submit
├── components/       # UI components + co-located *.module.css
├── utils/            # pure helpers with no React or HTTP (formatting)
└── config/           # app constants (current user, env)
```

---

## API Contract

`../campushub-backend/docs/openapi.yaml` is authoritative. When it changes, update the
spec first, then `@campushub/shared` (`../shared/src/index.ts`, the only home of the
contract types), then `campushubApi.ts`. Never redeclare a contract type locally.

- Every HTTP call goes through `src/api/campushubApi.ts`, using native `fetch` only
  (no axios). No `fetch` anywhere else, and no hard-coded host: the base URL comes
  from `src/config/env.ts`.
- A non-2xx response throws `ApiError` with `status` and the spec's
  `ErrorResponse.code`. A network failure becomes `ApiError` with status `0` and code
  `NETWORK_ERROR`.

---

## Components

- Functional components only, one per file, with a PascalCase filename.
- Every component exports a `<Component>Props` interface, even for a single prop.
  Components with no props take none.

## State

- Use the React hooks or custom hooks in `src/hooks/`. **No API calls in component
  bodies or JSX**: components get data and actions from hooks, and hooks call
  `campushubApi.ts`.
- Every async workflow exposes `isLoading`/`isPending` and `error` state:
  - Clear loading flags in `finally`, so nothing stays stuck after a failure.
  - Render errors with `role="alert"`, using text from `toUserMessage()`. A 409 must
    show its specific meaning, e.g. "This resource is already reserved for the
    selected time window."
  - A read error offers Retry.
- Effect-started fetches abort on cleanup, and an abort never sets error state.
- Components stay presentational: field state, validation and submit logic live
  in a hook (see `useBookingForm`). A component over ~150 lines is a signal to
  extract one.
- Lift state only as far as the nearest common parent (`App.tsx`). Shared query
  state is owned there and passed down, so siblings call `reload` instead of
  passing refresh counters around.
- Forms validate on the client before sending and show inline field errors. This is
  for UX only; the server still validates.

## Styling

Each component has a co-located `<Component>.module.css` that uses the custom-property
tokens in `src/index.css`. No inline `style` props, CSS-in-JS or UI framework.

## Dependencies

Runtime: `@campushub/shared` (workspace package), `react` and `react-dom`. Dev: the Vite template tooling (`vite`,
`@vitejs/plugin-react`, `typescript`, `@types/*`, `oxlint`).

---

## Verification Protocol

```bash
npm run build && npm run lint                                    # static gates
cd ../campushub-backend && npm run seed && npm run dev           # backend, seeded
cd ../client && npm run dev                                      # http://localhost:5173
```

In the browser: filter resources, create a booking, try an overlapping booking (it
must show the 409 message), cancel a booking, and stop the backend to confirm errors
render instead of loading forever. Report which of these you actually ran.
