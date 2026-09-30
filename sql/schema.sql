-- QR Buddy tables. The app creates these itself on first use (src/lib/db.ts); this copy is for reference
-- or for running by hand in the Neon SQL editor.
create table if not exists qb_parents (
  id                 text primary key,
  email              text not null unique,
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);
create table if not exists qb_buddies (
  slug                   text primary key,             -- teddy → teddy.myqr.co.nz
  parent_id              text not null references qb_parents(id) on delete cascade,
  colour                 text not null default 'honey',
  child_name             text not null default '',
  age_band               text not null default '4-5',   -- 2-3 | 4-5 | 6+
  tz                     text not null default 'Pacific/Auckland',
  status                 text not null default 'pending', -- pending | active | lapsed | disabled
  plan                   text not null default 'monthly',
  stripe_subscription_id text,
  checkout_session_id    text,
  card_key               text not null,                -- the buddy code (MOON-TIGER-APPLE-27), also in the card's QR; replace to revoke
  settings               jsonb not null default '{}',
  visit_day              int not null default 0,       -- growth counts visits, not calendar days
  created_at             timestamptz not null default now(),
  activated_at           timestamptz
);
create table if not exists qb_unlocks (
  slug        text not null references qb_buddies(slug) on delete cascade,
  unlocked_on date not null,
  visit_day   int not null,
  item_id     text not null,
  primary key (slug, unlocked_on)
);
create table if not exists qb_messages (
  id         bigserial primary key,
  slug       text not null references qb_buddies(slug) on delete cascade,
  text       text not null,
  show_on    date not null,
  created_at timestamptz not null default now()
);
create table if not exists qb_devices (
  id           text primary key,
  slug         text not null references qb_buddies(slug) on delete cascade,
  kind         text not null default 'phone',          -- tv | phone
  token_hash   text not null unique,
  name         text not null default 'Device',
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz,
  last_hq_at   timestamptz
);
create table if not exists qb_commands (
  id         bigserial primary key,
  slug       text not null references qb_buddies(slug) on delete cascade,
  command    text not null,
  created_at timestamptz not null default now()
);
create table if not exists qb_pairings (
  code       text primary key,
  device     text not null unique,                     -- random id kept by the TV until claimed
  slug       text references qb_buddies(slug) on delete cascade,
  token      text,                                     -- handed to the TV once, then cleared
  created_at timestamptz not null default now()
);
create table if not exists qb_visits (
  slug    text not null references qb_buddies(slug) on delete cascade,
  day     date not null,
  seconds int not null default 0,
  primary key (slug, day)
);
-- v2: buddy codes (card_key holds the words code) and the parent PIN
alter table qb_buddies add column if not exists parent_pin text;
alter table qb_buddies add column if not exists pin_fails int not null default 0;
alter table qb_buddies add column if not exists pin_locked_until timestamptz;
update qb_buddies set parent_pin = lpad(floor(random() * 10000)::int::text, 4, '0') where parent_pin is null;
create index if not exists qb_buddies_code_idx on qb_buddies ((regexp_replace(upper(card_key), '[^A-Z0-9]', '', 'g')));
create index if not exists qb_commands_slug_idx on qb_commands (slug, id);
create index if not exists qb_messages_slug_idx on qb_messages (slug, show_on);
