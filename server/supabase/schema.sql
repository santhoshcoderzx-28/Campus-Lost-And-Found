-- ============================================================
--  Campus Lost & Found (v2) - Supabase PostgreSQL schema
--  Runs in its own schema (app_v2) so the earlier version of the
--  project, which lives in public.*, keeps working untouched.
--
--  Apply it with:  npm run migrate      (uses DATABASE_URL from .env)
--  or paste it into Supabase > SQL Editor.
-- ============================================================

create schema if not exists app_v2;

-- 1. USERS -----------------------------------------------------
create table if not exists app_v2.users (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 80),
  email          text not null unique,
  student_id     text default '',
  password_hash  text not null,
  role           text not null default 'user' check (role in ('user', 'admin')),
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at     timestamptz not null default now()
);

-- 2. ITEMS -----------------------------------------------------
create table if not exists app_v2.items (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null check (char_length(title) between 3 and 100),
  description          text not null check (char_length(description) between 10 and 1500),
  category             text not null,
  type                 text not null check (type in ('lost', 'found')),
  location             text not null,
  event_date           date not null,
  identifying_features text default '',
  image_url            text default '',
  image_public_id      text default '',
  status               text not null default 'open'
                       check (status in ('open', 'under-review', 'matched', 'recovered', 'closed')),
  reported_by          uuid not null references app_v2.users(id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 3. RECOVERY REQUESTS -----------------------------------------
create table if not exists app_v2.recovery_requests (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references app_v2.items(id) on delete cascade,
  requester_id uuid not null references app_v2.users(id) on delete cascade,
  message      text not null check (char_length(message) between 15 and 600),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references app_v2.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (item_id, requester_id)
);

-- 4. INDEXES ---------------------------------------------------
create index if not exists v2_items_type_idx       on app_v2.items (type);
create index if not exists v2_items_status_idx     on app_v2.items (status);
create index if not exists v2_items_category_idx   on app_v2.items (category);
create index if not exists v2_items_date_idx       on app_v2.items (event_date desc);
create index if not exists v2_items_reported_idx   on app_v2.items (reported_by);
create index if not exists v2_req_item_idx         on app_v2.recovery_requests (item_id);
create index if not exists v2_req_requester_idx    on app_v2.recovery_requests (requester_id);
create index if not exists v2_items_date_created_idx on app_v2.items (event_date desc, created_at desc);
create index if not exists v2_items_type_status_idx  on app_v2.items (type, status);
create index if not exists v2_req_status_idx         on app_v2.recovery_requests (status);
create index if not exists v2_req_created_idx        on app_v2.recovery_requests (created_at desc);
create index if not exists v2_items_title_search   on app_v2.items using gin (to_tsvector('simple', title || ' ' || description));

-- 5. ROW LEVEL SECURITY ----------------------------------------
-- The Express server is the only database client and it connects with the
-- pooler role, so RLS is enabled with no policies: a browser holding the
-- public anon key can read nothing. Authorization happens in the API.
alter table app_v2.users             enable row level security;
alter table app_v2.items             enable row level security;
alter table app_v2.recovery_requests enable row level security;

-- 6. STORAGE BUCKET FOR ITEM PHOTOS ----------------------------
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do update set public = true;
