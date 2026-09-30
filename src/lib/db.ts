import postgres from 'postgres';

// Neon Postgres (the same database as the other myQR apps is fine: every table starts with qb_).
// The tables create themselves on first use; the same SQL is in sql/schema.sql.
// On your own computer, point DATABASE_URL at a local Postgres (see README).

export const DDL = `
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
  card_key               text not null,                -- in the printed QR card; replace to revoke
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
create index if not exists qb_commands_slug_idx on qb_commands (slug, id);
create index if not exists qb_messages_slug_idx on qb_messages (slug, show_on);
`;

let client: ReturnType<typeof postgres> | null = null;
let ready: Promise<unknown> | null = null;

export async function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require', max: 5, prepare: false, idle_timeout: 20, onnotice: () => {} });
  }
  if (!ready) ready = client.unsafe(DDL).catch((e) => { ready = null; throw e; });
  await ready;
  return client;
}
