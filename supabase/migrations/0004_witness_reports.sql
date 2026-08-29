alter table public.complaints
  add column is_witness_report boolean not null default false;
