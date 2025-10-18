<!-- .github/copilot-instructions.md - guidance for AI coding agents -->

This repository is a small Next.js app (App Router) that stores workouts in MongoDB via API routes under `app/api/hello/workouts/route.ts`.

Keep instructions concise and actionable. Only change files when you can verify the change aligns with the project's patterns.

Key context (read before editing):

- Framework: Next.js 15 App Router (files under `app/`), React 19, TypeScript.
- Server APIs: Route handlers live in `app/api/*/route.ts` and use the Web Fetch-style Request/Response. Example: `GET` and `POST` in `app/api/hello/workouts/route.ts`.
- DB: MongoDB client is created in `lib/mongodb.ts` and exported as a connected promise. Code expects `process.env.MONGODB_URI` to be defined.

Project conventions and patterns:

- Client components: pages under `app/` default to server components unless they include `'use client'` at the top. `app/page.tsx` is a client component (`'use client'`) and uses fetch to call `/api/workouts`.
- API responses: route handlers return Response.json(...) for JSON responses and use status codes for errors. Follow that pattern when adding endpoints.
- DB access: reuse the `clientPromise` from `lib/mongodb.ts`; do not create new MongoClient instances per-request.
- Imports: path alias `@/*` maps to repo root (see `tsconfig.json`). Many files import `@/lib/mongodb` style.

Developer workflows (commands and quick tips):

- Run dev server: `npm run dev` (uses `next dev --turbopack`).
- Build: `npm run build` and run with `npm start`.
- Lint: `npm run lint` (eslint present). Keep TypeScript `strict: true` in mind.
- Environment: ensure `MONGODB_URI` is set in `.env.local` for local DB work. The app throws if it's not present (see `lib/mongodb.ts`).

Files to inspect for behavior and examples:

- `app/page.tsx` — client-side UI that calls `/api/workouts`, demonstrates fetch request shape and expected response `{ workouts: [...] }`.
- `app/api/hello/workouts/route.ts` — server handlers showing how to read request.json(), insert into `workouts` collection, and return JSON.
- `lib/mongodb.ts` — Mongo client initialization and exported `clientPromise` pattern.
- `app/layout.tsx` and `globals.css` — general UI and font usage; prefer applying styles following the existing Tailwind classes.

When writing code changes, follow these concrete rules:

1. Use the App Router patterns: export `GET`, `POST`, etc. from `route.ts` files. Use `NextRequest` from `next/server` when you need typed request helpers.
2. For DB work, import `clientPromise` from `@/lib/mongodb` and await it before using `db()`.
3. Keep client components marked with `'use client'` and avoid server-only APIs (like `process.env`) inside them.
4. Return JSON using `Response.json(...)` (not `res.json`) to match existing handlers.
5. Keep TypeScript strictness: add explicit types for request/response shapes where helpful.

Small examples from the repo you can copy/extend:

- Fetching workouts (client):

  const res = await fetch('/api/workouts')
  const data = await res.json() // expects { workouts: [] }

- Inserting a workout (server):

  const client = await clientPromise
  const db = client.db('fitness-tracker')
  await db.collection('workouts').insertOne({ name, value, date: new Date() })

Edge-cases and safety checks to keep in mind:

- `lib/mongodb.ts` will throw on missing `MONGODB_URI`. If adding CI workflows, mock or set this env var accordingly.
- Route handlers catch errors and return status 500 with error objects; continue this pattern for new routes.
- Avoid serializing non-JSON-safe values directly on the client (e.g., Mongo ObjectId) — existing code sends `_id` and uses it as a key in lists; prefer stringifying when necessary.

If you update this file, preserve the short style and include specific file references. Ask the maintainer if you need access to actual deployment variables or CI details.

Questions for the maintainer (include these in PRs if I can't infer):

- Which MongoDB database name and collection naming conventions should be used beyond `fitness-tracker/workouts`?
- Is Turbopack required in CI or can it be disabled for faster local iteration?
