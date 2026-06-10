-- Riverbend Farmers Market — Lodestone capability demo
-- 0016: vendor compliance documents (liability/COI, food & nursery licenses,
-- organic & scale certs). A managed doc-type lookup, a vendor_documents table, a
-- private docs bucket, and a computed status view (valid / expiring / expired)
-- that powers the admin "expiring soon" panel and the email notifier (0017).
--
-- Self-contained: creates the tables, RLS, a verification guard, the status view,
-- the private storage bucket + policies, and seeds 3 sample docs (one expired, one
-- expiring, one valid). The "Reset demo" loader (0007) does NOT touch these — they
-- FK only vendors (upserted, never dropped for 01–23); re-run this file to restore.
--
-- If your project blocks policy SQL on the storage schema, create the bucket and
-- these four policies in the Storage UI instead (same rules).

-- ─── Managed doc-type lookup (Oregon-realistic set) ──────────────────
-- A table, not an enum: markets can add/retire types, and `required` feeds the
-- compliance report (an enum can't carry that). Admin curates the list.
create table doc_types (
  code       text primary key,             -- stable key used in code/CSV
  label      text not null,
  required   boolean not null default false,-- counts toward compliance %
  active     boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create table vendor_documents (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  doc_type    text not null references doc_types(code),
  file_url    text,                          -- path within the private vendor-documents bucket
  issued_date date,
  expires_date date,
  verified_by uuid references profiles(id) on delete set null,
  verified_at timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);
create index vendor_documents_vendor_idx on vendor_documents(vendor_id);
create index vendor_documents_expires_idx on vendor_documents(expires_date);

alter table doc_types        enable row level security;
alter table vendor_documents enable row level security;

-- doc_types: any authenticated user reads the active list; admins manage it.
create policy doc_types_select on doc_types for select to authenticated
  using (active or is_admin());
create policy doc_types_write on doc_types for all to authenticated
  using (is_admin()) with check (is_admin());

-- vendor_documents: a vendor manages own; admins all.
create policy vendor_documents_select on vendor_documents for select to authenticated
  using (vendor_id = my_vendor_id() or is_admin());
create policy vendor_documents_manage on vendor_documents for all to authenticated
  using (vendor_id = my_vendor_id() or is_admin())
  with check (vendor_id = my_vendor_id() or is_admin());

-- ─── Verification guard ──────────────────────────────────────────────
-- RLS can't gate individual columns, so a trigger keeps verified_by/verified_at
-- staff-only: non-admins can't self-verify (insert) or alter verification (update).
create or replace function guard_doc_verification() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- A null auth.uid() means a trusted context (service role / migration / seed);
  -- RLS already gated who may write the row, so only authenticated NON-admins are guarded.
  if not (is_admin() or auth.uid() is null) then
    if tg_op = 'INSERT' then
      new.verified_by := null;
      new.verified_at := null;
    elsif tg_op = 'UPDATE'
      and (new.verified_by is distinct from old.verified_by
        or new.verified_at is distinct from old.verified_at) then
      raise exception 'Only market staff can verify a document.';
    end if;
  end if;
  return new;
end $$;

create trigger vendor_documents_verify_guard
  before insert or update on vendor_documents
  for each row execute function guard_doc_verification();

-- ─── Computed status view ────────────────────────────────────────────
-- now() isn't immutable, so status can't be a stored/generated column. The view
-- recomputes on read. security_invoker keeps the vendor/admin RLS boundary intact
-- (a vendor sees only their own statuses; admins see all).
create or replace view vendor_documents_status as
select
  d.*,
  dt.label    as doc_label,
  dt.required as doc_required,
  v.name      as vendor_name,
  v.email     as vendor_email,
  (d.expires_date - current_date) as days_until_expiry,
  case
    when d.expires_date is null              then 'no_expiry'
    when d.expires_date <  current_date      then 'expired'
    when d.expires_date <= current_date + 30 then 'expiring'
    else                                          'valid'
  end as status,
  (d.expires_date = current_date + 60) as due_60,   -- exact-day flags the notifier keys off
  (d.expires_date = current_date + 30) as due_30,
  (d.expires_date = current_date + 7)  as due_7,
  (d.expires_date is not null
    and d.expires_date between current_date and current_date + 60) as expiring_soon
from vendor_documents d
join doc_types dt on dt.code = d.doc_type
join vendors  v  on v.id   = d.vendor_id;

alter view vendor_documents_status set (security_invoker = true);

-- ─── Private storage bucket (mirror 0006, but NOT public) ────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vendor-documents', 'vendor-documents', false, 10485760,
        array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Read is gated (private): own folder or admin. Vendor writes only inside their
-- own {vendor_id}/ folder; admins all. Files are read via signed URLs.
create policy "vendor docs read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vendor-documents'
    and ((storage.foldername(name))[1] = public.my_vendor_id()::text or public.is_admin())
  );

create policy "vendor docs insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-documents'
    and ((storage.foldername(name))[1] = public.my_vendor_id()::text or public.is_admin())
  );

create policy "vendor docs update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vendor-documents'
    and ((storage.foldername(name))[1] = public.my_vendor_id()::text or public.is_admin())
  );

create policy "vendor docs delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vendor-documents'
    and ((storage.foldername(name))[1] = public.my_vendor_id()::text or public.is_admin())
  );

-- ─── Seed: doc types + 3 sample docs (anchored to 2026-06-10) ────────
insert into doc_types (code, label, required, sort) values
  ('liability_insurance', 'General Liability / COI',                       true,  1),
  ('food_license',        'Food License (ODA Domestic Kitchen / cottage food)', false, 2),
  ('nursery_license',     'ODA Nursery License',                           false, 3),
  ('organic_cert',        'USDA Organic Certificate',                      false, 4),
  ('scale_cert',          'Scale Certification (ODA Weights & Measures)',   false, 5),
  ('other',               'Other',                                         false, 6)
on conflict (code) do nothing;

-- Expired → vendor 23 "The Lapsed Larder" (insurance lapsed mid-season).
-- Expiring (~16 days out) → vendor 1 Fern Hollow liability.
-- Valid → vendor 17 Greenwise nursery license.
insert into vendor_documents (id, vendor_id, doc_type, issued_date, expires_date, notes) values
  ('55550000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000023','liability_insurance','2025-06-01','2026-05-31','Lapsed — vendor suspended pending renewal.'),
  ('55550000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','liability_insurance','2025-06-26','2026-06-26',null),
  ('55550000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000017','nursery_license','2026-01-15','2026-12-31',null)
on conflict (id) do nothing;
