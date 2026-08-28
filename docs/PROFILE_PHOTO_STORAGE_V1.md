# Profile Photo Storage V1

## Current state

The authenticated `/profile` surface lets a HestivaOS user choose a JPG, PNG or WebP source image, reposition it, and zoom it inside a square crop editor before upload. The browser produces a 512×512 JPEG at quality 0.88 and uploads only that normalized headshot; the original source file is not uploaded by this flow. The browser rejects source files larger than 20 MB before opening the editor.

Profile images use the Supabase Storage bucket `profile-images` by default. `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET` may override the bucket name at build time, but production should normally retain the canonical default. The bucket is intentionally public-read because `User.profilePhotoUrl` is a durable public URL consumed by authenticated HestivaOS presentation surfaces. Public read does **not** grant upload/update/delete authority.

The canonical object path is `<supabase-auth-user-id>/avatar.jpg`. The authenticated Supabase session user ID, not an editable application field, selects the first path segment. A replacement uses `upsert` on that deterministic object and the saved URL carries a cache-busting query value so a newly cropped image is visible without creating timestamp-named storage orphans.

The Supabase Storage bucket is limited to 5 MB objects and `image/jpeg`, `image/png`, or `image/webp` MIME types. The current crop flow uploads JPEG output. RLS policies on `storage.objects` allow authenticated SELECT/INSERT/UPDATE/DELETE only when the object is in the `profile-images` bucket and the first folder segment equals `auth.uid()`. The public bucket setting affects file retrieval only; authenticated object mutations remain policy-controlled.

Removing a photo first clears `profilePhotoUrl` through the existing authenticated HestivaOS profile API, then attempts to delete the previously referenced object from the user's own Storage folder. If object cleanup fails after the profile update, the UI reports that partial cleanup rather than restoring a stale application URL.

## Provisioning authority

`supabase/migrations/20260828163000_profile_images_storage.sql` is the repository copy of the Supabase-managed bucket and Storage-policy definition. It is intentionally separate from `apps/api/prisma/migrations`: the Prisma replay database does not own Supabase's `storage` schema. Production provisioning for this slice was applied to the connected Supabase project using the same SQL through the Supabase migration service.

Do not add the Supabase Storage DDL to the Prisma migration chain merely to make it run in PostgreSQL CI. Do not weaken the object policies to `true`, expose a service-role key to the browser, or make another user's folder writable in order to repair an upload failure.

## Recovery

For `Bucket not found`, verify the active browser build targets the intended Supabase project and that `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET` is either unset (canonical `profile-images`) or exactly matches the provisioned bucket. Then verify `storage.buckets` contains `profile-images` with public read enabled, a 5 MB file limit, and the allowed image MIME types. Reapply the reviewed Supabase migration only when the bucket/policies are genuinely absent; do not invent a second bucket name as a workaround.

For `new row violates row-level security policy`, verify the user has an authenticated Supabase session and the attempted object path begins with that session's `auth.uid()`. Verify the four `profile_images_*_own` policies exist on `storage.objects`. Do not bypass RLS with a browser service-role credential.

If the Storage object succeeds but the HestivaOS profile API update fails, preserve the object and retry the profile operation through the normal UI after the underlying API/session problem is fixed. Because the canonical path is deterministic, a later successful crop replaces the same object rather than creating an unbounded set of files.

If account-level photo removal succeeds but Storage cleanup fails, the application profile is already authoritative with `profilePhotoUrl = null`. Repair the Storage policy/session problem and remove only the affected user's object after verifying ownership; do not restore the database URL simply to hide the orphan.
