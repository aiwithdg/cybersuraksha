create extension if not exists pgcrypto;

create table public.suspects (
  id uuid primary key default gen_random_uuid(),
  identifier_type text not null check (identifier_type in ('phone', 'upi', 'email', 'url')),
  identifier_value text not null,
  risk_level text not null default 'reported' check (risk_level in ('flagged', 'reported', 'unverified')),
  source text,
  created_at timestamptz not null default now(),
  constraint suspects_identifier_unique unique (identifier_type, identifier_value)
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  category text not null check (category in ('financial_fraud', 'identity_theft', 'harassment', 'other')),
  incident_description text,
  incident_date date,
  suspect_identifier_type text check (suspect_identifier_type in ('phone', 'upi', 'email', 'url')),
  suspect_identifier_value text,
  complainant_name text,
  complainant_contact text,
  is_guest boolean not null default false,
  evidence_urls text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'routed', 'investigation_update')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index suspects_identifier_idx on public.suspects (identifier_type, identifier_value);
create index complaints_reference_number_idx on public.complaints (reference_number);
create index status_history_complaint_id_idx on public.status_history (complaint_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger complaints_set_updated_at
before update on public.complaints
for each row
execute function public.set_updated_at();

alter table public.suspects enable row level security;
alter table public.complaints enable row level security;
alter table public.status_history enable row level security;

create policy "Public can read suspect lookup data"
on public.suspects
for select
to anon, authenticated
using (true);

-- Complaints and status_history intentionally have no public policies.
-- Writes must go through server-side API routes using the Supabase service role.
-- Citizen reference-number-based complaint/status lookup will be handled in API routes,
-- not through direct table access from the client.
