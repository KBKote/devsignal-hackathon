# Phase 5: WunderGraph Cosmo — `app/api/graphql/route.ts` implementation plan

Plan only (no implementation in this document). Next.js 16 App Router; federated graph **devsignal** with subgraph **devsignal-stories** → `https://devsignal.space/api/graphql`.

## Goals

- Expose the GraphQL endpoint so Cosmo can introspect it and Cosmo Studio can show the schema explorer.
- Reuse the same **credential shape** as `app/api/agent/run/route.ts`, but return **401** when auth fails (infra route, not payment-gated).
- Thin implementation: inline SDL string, `graphql` + `buildSchema`, `getSupabaseAdmin()` from `@/lib/supabase-server`, no Claude, no Zod.

## Files to change

1. **`package.json`** — add `graphql` (graphql-js reference implementation).
2. **`app/api/graphql/route.ts`** — new route handler.

## Schema (inline in the route file)

```graphql
type Story {
  id: ID!
  title: String!
  url: String!
  source: String
  summary: String
  score: Int!
  why: String
  publishedAt: String
  scoredAt: String!
}

type Query {
  scoredStories(limit: Int): [Story!]!
  agentRuns: String!
}
```

## Route behaviour

- **`export const maxDuration = 30`**
- **GET `/api/graphql`** — after auth, return SDL as **`text/plain`**, status **200** (Cosmo schema introspection / publishing).
- **POST `/api/graphql`** — after auth, parse JSON `{ query, variables? }`, execute, return **`application/json`**.
- Auth: **`x-api-key === AGENT_API_KEY`** OR **`Authorization: Bearer ${CRON_SECRET}`** (trim env values like agent run). **401** on failure.

## Resolvers

- **`scoredStories(limit)`** — `getSupabaseAdmin()`, `from('scored_stories')`, filter **`user_id = process.env.AGENT_USER_ID`**, order **`score` DESC**, limit **`Math.min(limit ?? 20, 80)`**. Map DB → GraphQL: `published_at` → `publishedAt`, `scored_at` → `scoredAt`, uuid `id` as string.
- **`agentRuns`** — return the literal string:  
  `Run: ghost sql devsignal-hackathon "SELECT run_id, stories_scraped, stories_scored, status FROM agent_runs ORDER BY created_at DESC LIMIT 5"`

## CLAUDE.md constraints

- Never call Claude API in this file.
- Use **`getSupabaseAdmin()`** for server-side Supabase.
- No Zod; keep the route thin.

---

## 1. Which version of `graphql` to add

- **Add:** `"graphql": "^16.13.2"` (or whatever `npm view graphql version` prints as `latest` at install time — stable line is **16.x**).
- **Why:** Latest **stable** graphql-js; **v17** is still **alpha**. `^16.13.2` stays on 16.x with patch/minor updates. Zero runtime dependencies; spec-aligned reference implementation ([graphql/graphql-js](https://github.com/graphql/graphql-js/releases)).

---

## 2. Exact structure of `app/api/graphql/route.ts`

Top-to-bottom:

1. **`export const maxDuration = 30`** (module level).

2. **Imports** — `NextResponse` from `next/server`; from `graphql`: `buildSchema`, `graphql`, `printSchema`, and `GraphQLError` if used for resolver errors; `getSupabaseAdmin` from `@/lib/supabase-server`.

3. **SDL constant** — single template literal with the `Story` and `Query` types above.

4. **Schema** — `const schema = buildSchema(SDL)` at module load (or lazy on first request).

5. **Auth** — helper that reads trimmed `AGENT_API_KEY` / `CRON_SECRET`, compares `x-api-key` and `Authorization: Bearer …` like `app/api/agent/run/route.ts`; on failure return **`NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`**.

6. **`rootValue`** — object with **`scoredStories`** and **`agentRuns`** functions (graphql-js resolves root `Query` fields from `rootValue` keys matching field names). No separate resolver map type.

7. **`GET`** — auth → `printSchema(schema)` → `new NextResponse(sdl, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`.

8. **`POST`** — auth → `await request.json()` → require `query` string; else **400** JSON → `await graphql({ schema, source: query, rootValue, variableValues: variables })` → **`NextResponse.json(result, { status: 200 })`** (standard GraphQL-over-HTTP: 200 with `errors` in body when applicable).

Optional: `export const dynamic = 'force-dynamic'` if desired for this handler.

---

## 3. How `buildSchema` + `graphql()` execute queries

1. **`buildSchema(SDL)`** — produces a `GraphQLSchema`. Resolvers come from **`rootValue`** + default resolution for nested `Story` fields (returned objects use camelCase keys: `id`, `title`, `url`, …).

2. **`graphql({ schema, source, rootValue, variableValues })`** — runs the operation; `$limit` flows via `variableValues`.

3. **`scoredStories`** — use **`args.limit`**; **`take = Math.min(args.limit ?? 20, 80)`**.

4. **`agentRuns`** — return the literal CLI hint string (no DB).

5. **Story rows** — map each row to the GraphQL shape; **`ID`** as string.

---

## 4. SDL for GET (`printSchema`)

- Use **`printSchema(schema)`** after `buildSchema` so the served SDL matches the **executable** schema.
- GET returns that string with **`Content-Type: text/plain; charset=utf-8`** and **200** after auth.

---

## 5. Error handling: `AGENT_USER_ID` and Supabase

| Condition | Suggested behaviour |
|-----------|---------------------|
| **`AGENT_USER_ID` missing/empty** | Do not query with invalid `user_id`. Throw **`GraphQLError`** (e.g. server misconfiguration) so the GraphQL payload includes **`errors`**; log server-side. |
| **Supabase `error`** | Log `[api/graphql] scored_stories: …`. Throw **`GraphQLError`** with a **generic** message (no internal leakage). |
| **`data` null with error** | Same as error path. |
| **Row nullability** | Ensure non-null GraphQL fields always populated from DB; `publishedAt` optional — ISO string or null. |
| **Auth failure** | **401** JSON (not GraphQL). |
| **Malformed POST / missing `query`** | **400** JSON. |

---

## 6. Correct end state (GET vs POST)

### GET `/api/graphql`

- Valid **`x-api-key`** or **`Authorization: Bearer <CRON_SECRET>`**.
- **200**, **`text/plain`**, body = full SDL (`Story`, `Query`, fields as built).
- Unauthorized: **401**, JSON **`{ error: 'Unauthorized' }`** (or consistent with other APIs).

### POST `/api/graphql`

- Same auth.
- Body: **`{ "query": "…", "variables": { … } }`** (variables optional).
- **200**, **`application/json`**, body = GraphQL result: **`data`**, optional **`errors`** (including validation/partial errors per spec).
- Unauthorized: **401** JSON.

### Cosmo Studio

- Subgraph URL → this route; GET for SDL/publish; POST for explorer and introspection queries.

### `package.json`

- Single new dependency: **`graphql`** at **`^16.13.x`** latest stable.

### Sanity checks

- No Anthropic / Claude in this file.
- **`getSupabaseAdmin()`** only inside **`scoredStories`**.
- No Zod; simple `typeof query === 'string'` checks.

---

## Implementation notes

- **`agentRuns`**: preserve the exact string (including inner quotes) for demo copy-paste.
- **Dates**: ISO 8601 strings for `publishedAt` / `scoredAt` where values are timestamps.
