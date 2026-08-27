insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Evidence stays private. Prototype uploads go through the server API with the
-- service role key and store supabase:// evidence references in complaints.
-- A later authenticated Cyber Cell view can exchange those references for
-- short-lived signed URLs.
create policy "Authenticated users can upload evidence"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'evidence');
