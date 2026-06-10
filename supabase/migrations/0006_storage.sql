-- Riverbend Farmers Market — Lodestone capability demo
-- 0006: vendor photo uploads (logo + cover). The browser rescales and converts
-- to WebP, then uploads to this Storage bucket; a vendor may only write into
-- their own {vendor_id}/ folder. Public-read so the CDN URL renders anywhere.
--
-- If your project blocks policy SQL on the storage schema, create the bucket and
-- these four policies in the Storage UI instead (same rules).

-- New column for the brandmark (cover photo reuses vendors.image_url).
alter table vendors add column if not exists logo_url text;

-- Bucket: public-read, WebP only, 2 MB cap (we send already-compressed WebP).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vendor-photos', 'vendor-photos', true, 2097152, array['image/webp'])
on conflict (id) do nothing;

-- Anyone can read; a vendor can write only inside their own folder; admins all.
create policy "vendor photos read" on storage.objects
  for select using (bucket_id = 'vendor-photos');

create policy "vendor photos insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-photos'
    and ((storage.foldername(name))[1] = public.my_vendor_id()::text or public.is_admin())
  );

create policy "vendor photos update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vendor-photos'
    and ((storage.foldername(name))[1] = public.my_vendor_id()::text or public.is_admin())
  );

create policy "vendor photos delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vendor-photos'
    and ((storage.foldername(name))[1] = public.my_vendor_id()::text or public.is_admin())
  );
