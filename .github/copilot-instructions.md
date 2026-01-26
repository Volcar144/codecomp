# CodeComp - AI Coding Agent Instructions

## Project Overview

CodeComp is a **coding competition platform** built with Next.js 14+ (App Router), BetterAuth, and Supabase. Users create competitions, submit code in multiple languages, which is executed in sandboxed Docker containers via Piston API, tested against test cases, and scored on leaderboards.

**Tech Stack**: Next.js 14+ (App Router) • TypeScript • React 19 • TailwindCSS 4 • BetterAuth • Supabase (PostgreSQL) • Piston API • Monaco Editor

## Architecture & Key Concepts

### Dual Authentication System
- **BetterAuth**: Manages user authentication, sessions, and user table in PostgreSQL (via `DATABASE_URL`)
- **Supabase**: Handles application data (competitions, submissions, test cases) with Row Level Security (RLS)
- **Critical**: Both use the same PostgreSQL database but serve different purposes
  - BetterAuth server config: [lib/auth.ts](lib/auth.ts) exports `auth` for API routes
  - BetterAuth client: [lib/auth-client.ts](lib/auth-client.ts) exports `authClient`, `useSession` for React components
  - Must set `NEXT_PUBLIC_APP_URL` for auth client to work (localhost:3000 in dev)

### Code Execution Flow
1. User writes code in Monaco Editor → submits to `/api/execute`
2. API fetches test cases from Supabase `test_cases` table
3. Code sent to Piston API (sandboxed Docker execution)
4. Results compared against expected outputs
5. Score calculated: `(passed_tests / total_tests) * 100`
6. For submissions (not test runs), saved to `submissions` table → triggers leaderboard view update

**Key files**: [lib/code-execution.ts](lib/code-execution.ts), [app/api/execute/route.ts](app/api/execute/route.ts)

### Database Schema Relationships
```
competitions (creator_id: VARCHAR from BetterAuth)
  ├─→ test_cases (hidden vs. visible for testing)
  ├─→ submissions (status: pending|running|passed|failed)
  │     └─→ test_results
  ├─→ judges
  └─→ prizes

leaderboard VIEW: Aggregates best_score, best_time, rank per competition
```

**RLS Policies**: Users see only their submissions; creators manage their competitions and test cases. See [supabase-schema.sql](supabase-schema.sql) lines 107-125.

## Development Workflows

### Running the App
```bash
npm run dev          # Start Next.js dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
```

### Database Setup
1. Create Supabase project
2. Copy [supabase-schema.sql](supabase-schema.sql) to Supabase SQL Editor and execute
3. Set `DATABASE_URL` (Supabase PostgreSQL connection string)

### Environment Variables
**Required**:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase API access
- `DATABASE_URL`: PostgreSQL connection (shared by BetterAuth + Supabase)
- `BETTER_AUTH_SECRET`: Min 32 chars, generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `NEXT_PUBLIC_APP_URL`: Auth client base URL (http://localhost:3000 in dev)

**Optional**:
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: OAuth login
- `CODE_EXECUTION_API_URL`: Custom Piston instance (defaults to public emkc.org)

See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup.

## Code Conventions

### API Routes Pattern
- **Location**: `app/api/[endpoint]/route.ts`
- **Pattern**: Export `GET`, `POST`, etc. as named async functions
- **Auth**: Use `auth` from [lib/auth.ts](lib/auth.ts) for session validation
- **Supabase**: Use `supabase` client from [lib/supabase.ts](lib/supabase.ts)
- **Error Handling**: Return `NextResponse.json({ error: "message" }, { status: code })`
- **Example**: [app/api/competitions/route.ts](app/api/competitions/route.ts) - validation, Supabase queries, error responses

### Client-Side Auth
```typescript
import { useSession, signIn, signOut } from "@/lib/auth-client";

function Component() {
  const { data: session, isPending } = useSession();
  // session.user contains user info
}
```

### Supabase Queries
```typescript
import { supabase } from "@/lib/supabase";

// Simple query
const { data, error } = await supabase
  .from("competitions")
  .select("*")
  .eq("id", competitionId)
  .single();

// Insert with type safety
const { data, error } = await supabase
  .from("submissions")
  .insert({ competition_id, user_id, code, language })
  .select()
  .single();
```

### Language Support
Supported languages (Piston API): `python`, `javascript`, `java`, `cpp`, `csharp`, `go`, `rust`
- Check support: `isLanguageSupported(language)` from [lib/code-execution.ts](lib/code-execution.ts)
- Versions/filenames: See `LANGUAGE_MAP` in [lib/code-execution.ts](lib/code-execution.ts)

## Common Tasks

### Adding a New API Endpoint
1. Create `app/api/[name]/route.ts`
2. Import `supabase` and/or `auth` as needed
3. Export HTTP method handlers (GET, POST, etc.)
4. Validate input, query database, return `NextResponse.json()`
5. Add error handling for all database operations

### Adding a New Page
1. Create `app/[route]/page.tsx` (Server Component by default)
2. For client interactivity: Add `"use client"` directive at top
3. Import auth client if authentication needed: `import { useSession } from "@/lib/auth-client"`
4. Use TailwindCSS for styling (utilities-first approach)

### Modifying Database Schema
1. Update [supabase-schema.sql](supabase-schema.sql)
2. Run SQL in Supabase SQL Editor
3. Update TypeScript types in [lib/supabase.ts](lib/supabase.ts) under `Database` export
4. Update RLS policies if needed (lines 107-125 in schema)

### Self-Hosting Piston API
For production, avoid public Piston instance (rate limits):
```bash
docker run -d --name piston -p 2000:2000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/engineer-man/piston
```
Set `CODE_EXECUTION_API_URL=http://your-server:2000/api/v2/piston`. See [CODE_EXECUTION.md](CODE_EXECUTION.md) lines 60-95.

## Key Files Reference

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System diagrams, data flows
- **[CODE_EXECUTION.md](CODE_EXECUTION.md)**: Piston API integration, security, self-hosting
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Vercel deployment, env vars, Supabase setup
- **[supabase-schema.sql](supabase-schema.sql)**: Complete database schema with RLS policies
- **[lib/auth.ts](lib/auth.ts)**: BetterAuth server config (use in API routes)
- **[lib/auth-client.ts](lib/auth-client.ts)**: BetterAuth client (use in React components)
- **[lib/supabase.ts](lib/supabase.ts)**: Supabase client + TypeScript types

## Gotchas & Important Notes

1. **Separate Supabase RLS from BetterAuth**: User table managed by BetterAuth; use `user_id: string` (not UUID) in foreign keys
2. **Test-only vs. Submission**: `/api/execute` uses `test_only` flag - if true, excludes hidden test cases and doesn't save to database
3. **Leaderboard**: Materialized as a VIEW, automatically updated on new submissions with `status='passed'`
4. **Time zone**: All timestamps use `TIMESTAMP WITH TIME ZONE` - store in UTC
5. **Monaco Editor**: Lazy-loaded in client components with `@monaco-editor/react`
6. **Mock User ID**: [app/api/competitions/route.ts](app/api/competitions/route.ts) line 25 uses `"user-123"` - replace with real session user ID in production
