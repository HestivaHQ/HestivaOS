-- Supabase-managed Storage migration for HestivaOS profile headshots.
-- This is intentionally separate from Prisma/PostgreSQL application migrations because
-- the local Prisma replay database does not own the Supabase storage schema.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "profile_images_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "profile_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "profile_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "profile_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
