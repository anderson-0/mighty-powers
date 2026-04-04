# WriteFlow — Benchmark Spec (FROZEN)

> This spec is identical for all 4 methodology runs. Do not add, remove, or change features.
> Frozen: 2026-04-04. Any agent modifying this file is out of spec.

## What to Build

WriteFlow is a minimal AI writing assistant SaaS. Users sign in, create documents, get AI completions, and have a monthly usage cap.

## Features (exactly these 6, nothing more)

### F1: Authentication
- Sign up / sign in via Clerk
- Protected routes: `/dashboard` and all `/doc/*` routes redirect to `/sign-in` if unauthenticated
- Public routes: `/` (landing), `/sign-in`, `/sign-up`

### F2: Document Management
- Create a new blank document (title + empty body)
- List all documents belonging to the current user
- Open a document for editing
- Delete a document (with confirmation dialog)
- Documents stored in Postgres: `id, user_id, title, content, created_at, updated_at`

### F3: AI Completion
- In the document editor, pressing `Ctrl+Enter` triggers AI completion
- Completion appends to the current document content
- Uses Vercel AI Gateway: model `anthropic/claude-haiku-4-5-20251001`
- Streaming response displayed inline as it arrives

### F4: Usage Limits
- Each user has a monthly completion budget: 20 completions/month
- Budget tracked in Postgres: `usage_logs(id, user_id, created_at, tokens_used)`
- When budget exhausted: show inline error "Monthly limit reached"
- Usage counter visible in dashboard header: "X / 20 completions used"

### F5: Dashboard
- Lists all user documents with title, last updated date, word count
- "New Document" button
- Usage counter in header

### F6: Landing Page
- Simple marketing page at `/`
- Hero section with app name + one-sentence description
- "Get Started" CTA that links to `/sign-up`
- No authentication required

## Database Schema (exact)

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tokens_used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX ON documents(user_id);
CREATE INDEX ON usage_logs(user_id, created_at);
```

## API Surface (exact)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents` | List user's documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/[id]` | Get single document |
| PUT | `/api/documents/[id]` | Update document content/title |
| DELETE | `/api/documents/[id]` | Delete document |
| POST | `/api/complete` | AI completion (streaming) |
| GET | `/api/usage` | Get current user's usage stats |

## Acceptance Criteria

All 6 features must work end-to-end:
- [ ] User can sign up, sign in, sign out
- [ ] User can create, view, edit, delete documents
- [ ] Ctrl+Enter triggers streaming AI completion
- [ ] Usage counter increments after each completion
- [ ] Usage limit blocks completions at 20/month
- [ ] Landing page loads without authentication

## Tech Stack (same for all runs)

- **Framework:** Next.js (latest, App Router)
- **Auth:** Clerk
- **Database:** Neon Postgres (via `@neondatabase/serverless`)
- **AI:** Vercel AI Gateway (`ai` package, model string `anthropic/claude-haiku-4-5-20251001`)
- **Styling:** Tailwind CSS + shadcn/ui
- **Tests:** Vitest
- **Deploy:** Vercel

## Out of Scope (do not implement)

- Rich text / WYSIWYG editor (plain textarea only)
- Document sharing or collaboration
- Billing / Stripe
- Email notifications
- Dark mode toggle (default dark is fine)
- Mobile-specific layouts
- Search or filtering of documents
- Document versioning / history
- Image uploads
- Export functionality
