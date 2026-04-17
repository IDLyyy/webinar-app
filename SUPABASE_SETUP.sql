-- =====================================================================
-- WEBINAR REGISTRATION — Supabase setup script
-- Jalankan SEMUA query ini di Supabase SQL Editor (project pribadi kamu)
-- =====================================================================

-- 1. ENUMS ------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.registration_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('bank_transfer', 'qris');
exception when duplicate_object then null; end $$;

-- 2. USER ROLES TABLE -------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

drop policy if exists "Users see their own roles" on public.user_roles;
create policy "Users see their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Admins see all roles" on public.user_roles;
create policy "Admins see all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 3. WEBINAR SETTINGS (1 baris konfigurasi) ---------------------------
create table if not exists public.webinar_settings (
  id int primary key default 1,
  title text not null default 'Webinar Eksklusif',
  subtitle text not null default 'Belajar bersama para ahli',
  description text not null default 'Sesi interaktif dengan pembicara berpengalaman.',
  date_text text not null default 'Sabtu, 1 Februari 2025 · 19:00 WIB',
  price int not null default 99000,
  bank_name text not null default 'BCA',
  bank_account_number text not null default '1234567890',
  bank_account_name text not null default 'Nama Penyelenggara',
  qris_image_url text,
  whatsapp_group_link text not null default 'https://chat.whatsapp.com/XXXXXX',
  whatsapp_message_template text not null default
    'Halo {name},\n\nPembayaran kamu untuk *{title}* sudah kami terima ✅\n\nJadwal: {date}\nBergabung ke grup WA: {link}\n\nSampai jumpa di webinar!',
  constraint webinar_settings_singleton check (id = 1)
);
alter table public.webinar_settings enable row level security;

insert into public.webinar_settings (id) values (1)
  on conflict (id) do nothing;

drop policy if exists "Anyone can read settings" on public.webinar_settings;
create policy "Anyone can read settings" on public.webinar_settings
  for select using (true);

drop policy if exists "Admins update settings" on public.webinar_settings;
create policy "Admins update settings" on public.webinar_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 4. REGISTRATIONS TABLE ----------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  profession text not null,
  background text not null,
  payment_method public.payment_method not null,
  payment_proof_path text not null,
  status public.registration_status not null default 'pending',
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.registrations enable row level security;

create index if not exists registrations_status_idx on public.registrations(status, created_at desc);

-- Public boleh INSERT (anonymous registration). Tidak boleh select/update.
drop policy if exists "Anyone can register" on public.registrations;
create policy "Anyone can register" on public.registrations
  for insert with check (status = 'pending');

drop policy if exists "Admins read all registrations" on public.registrations;
create policy "Admins read all registrations" on public.registrations
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update registrations" on public.registrations;
create policy "Admins update registrations" on public.registrations
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 5. STORAGE BUCKET (privat) ------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "Anyone can upload payment proof" on storage.objects;
create policy "Anyone can upload payment proof" on storage.objects
  for insert with check (bucket_id = 'payment-proofs');

drop policy if exists "Admins read payment proofs" on storage.objects;
create policy "Admins read payment proofs" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- LANGKAH MANUAL SETELAH MENJALANKAN SQL DI ATAS:
--
-- A) Buat user admin di Authentication → Users → Add user
--    Isi email + password. Catat user_id-nya.
--
-- B) Insert role admin (ganti UUID dengan user_id dari langkah A):
--      insert into public.user_roles (user_id, role)
--      values ('PASTE-USER-ID-DI-SINI'::uuid, 'admin');
--
-- C) Edit baris di webinar_settings dengan detail webinar kamu:
--    judul, harga, no rekening, link grup WA, dll.
--
-- D) (Opsional) Upload gambar QRIS ke bucket public lain & isi
--    qris_image_url dengan URL publiknya.
-- =====================================================================
