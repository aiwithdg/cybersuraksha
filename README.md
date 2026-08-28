# CyberSuraksha

CyberSuraksha is a hackathon prototype for a citizen-first cybercrime reporting portal for India. It reimagines the core reporting journey around a simple flow:

1. **Check** a phone number, UPI ID, email, or URL against known suspect demo data.
2. **Report** what happened through a guided one-question-at-a-time form.
3. **Track** the report by reference number with a visible status pipeline.

This is not an official government service. It is built for demo and product exploration only.

## How It Differs From cybercrime.gov.in

- Starts with a quick lookup tool so a citizen can check suspicious identifiers before reporting.
- Uses a continuous guided report flow instead of static, category-first forms.
- Shows an explicit status timeline and review-window expectations after submission.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres and Storage
- ESLint

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is required for report submission, tracking, and the demo admin page. Keep it server-side only and do not commit `.env.local`.

Apply the database migrations in Supabase SQL Editor or with the Supabase CLI:

```bash
supabase db push
```

The migrations live in:

```text
supabase/migrations
```

Seed demo suspect data:

```bash
psql "$DATABASE_URL" -f seeds/seed_suspects.sql
```

Or paste `seeds/seed_suspects.sql` into the Supabase SQL Editor.

Run the app locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Main Routes

- `/` - Check suspicious identifiers
- `/report` - Guided report flow
- `/track` - Track by reference number
- `/admin/complaints` - Prototype-only internal demo page for advancing complaint status

## Prototype Scope

Intentionally out of scope for this hackathon version:

- Real police or I4C system integration
- Authentication and role-based access control
- Multi-language support
- Production evidence review workflows
- Real identity verification

Before production use, the admin route must be protected, evidence access must use authenticated role-based policies, and the reference-number lookup model should be hardened against enumeration.
