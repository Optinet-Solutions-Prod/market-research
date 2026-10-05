-- Opportunity Radar schema
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Catalog: industries, brands, affiliate programs
-- ---------------------------------------------------------------------------
create table if not exists industries (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text not null unique,
  -- regulated / YMYL verticals carry extra SEO + legal risk
  regulated     boolean not null default false,
  default_conversion numeric not null default 0.04,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists brands (
  id            uuid primary key default gen_random_uuid(),
  industry_id   uuid not null references industries(id) on delete cascade,
  name          text not null,
  official_domain text,
  geos          text[] not null default '{US}',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (industry_id, name)
);

create table if not exists affiliate_programs (
  id            uuid primary key default gen_random_uuid(),
  industry_id   uuid not null references industries(id) on delete cascade,
  brand_id      uuid references brands(id) on delete set null,
  merchant      text not null,
  network       text not null default 'direct',  -- impact, awin, cj, partnerstack, rakuten, direct ...
  model         text not null check (model in ('CPA','CPL','REVSHARE','RECURRING')),
  payout_eur    numeric not null default 0,      -- flat payout or expected value per conversion
  revshare_pct  numeric,                         -- for REVSHARE / RECURRING
  avg_order_eur numeric,                         -- used to turn revshare into € per conversion
  recurring_months int,
  cookie_days   int not null default 30,
  conversion_rate numeric,                       -- merchant conversion if known (0-1)
  epc_eur       numeric,
  geos          text[] not null default '{US}',
  allows_brand_keywords        boolean not null default false,
  allows_competitor_comparison boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (industry_id, merchant, network)
);

-- ---------------------------------------------------------------------------
-- Research data
-- ---------------------------------------------------------------------------
create table if not exists scans (
  id            uuid primary key default gen_random_uuid(),
  mode          text not null check (mode in ('demo','live')),
  status        text not null default 'running' check (status in ('running','done','failed')),
  industries    text[] not null default '{}',
  geo           text not null default 'US',
  brands_scanned int not null default 0,
  opportunities_found int not null default 0,
  log           text[] not null default '{}',
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create table if not exists keywords (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  geo           text not null default 'US',
  keyword       text not null,
  intent        text not null check (intent in ('navigational','informational','commercial','comparison','transactional')),
  modifier      text,
  volume        int not null default 0,
  cpc_eur       numeric,
  competition   numeric,
  updated_at    timestamptz not null default now(),
  unique (brand_id, geo, keyword)
);

create table if not exists serp_results (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  geo           text not null default 'US',
  keyword       text not null,
  position      int not null,
  url           text not null,
  domain        text not null,
  title         text,
  kind          text not null,   -- official, review_platform, ugc, video, publisher, affiliate, other
  fetched_at    timestamptz not null default now()
);
create index if not exists serp_results_brand_kw on serp_results (brand_id, geo, keyword);

create table if not exists opportunities (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  scan_id       uuid references scans(id) on delete set null,
  geo           text not null default 'US',
  industry      text not null,
  brand         text not null,
  theme         text not null,
  search_volume int not null default 0,
  commercial_volume int not null default 0,
  commercial_share numeric not null default 0,
  -- 0-100 signals
  commercial_demand    numeric not null default 0,
  serp_weakness        numeric not null default 0,
  affiliate_economics  numeric not null default 0,
  conversion_intent    numeric not null default 0,
  domain_quality       numeric not null default 0,
  competitor_diversity numeric not null default 0,
  content_moat         numeric not null default 0,
  geo_expansion        numeric not null default 0,
  seo_risk             numeric not null default 0,
  legal_risk           numeric not null default 0,
  -- economics
  expected_rank        int not null default 10,
  ctr                  numeric not null default 0,
  affiliate_click_rate numeric not null default 0,
  merchant_conversion  numeric not null default 0,
  avg_commission       numeric not null default 0,
  revenue_conservative numeric not null default 0,
  revenue_expected     numeric not null default 0,
  revenue_aggressive   numeric not null default 0,
  break_even_months    numeric,
  -- outcome
  score         numeric not null default 0,
  risk_tier     text not null check (risk_tier in ('green','yellow','red')),
  decision      text not null check (decision in ('BUILD','REVIEW','SKIP')),
  status        text not null default 'NEW' check (status in ('NEW','APPROVED','REJECTED','HANDED_OFF')),
  rationale     jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  unique (brand_id, geo)
);
create index if not exists opportunities_score on opportunities (score desc);

create table if not exists domain_candidates (
  id            uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  domain        text not null,
  pattern       text not null,
  risk          text not null check (risk in ('GREEN','YELLOW','RED')),
  reason        text not null,
  quality       numeric not null default 0,
  available     boolean,          -- null = unknown / not checked
  checked_at    timestamptz,
  unique (opportunity_id, domain)
);

create table if not exists handoffs (
  id            uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  domain        text not null,
  status        text not null check (status in ('sent','failed','blocked','queued')),
  payload       jsonb not null,
  response      text,
  created_at    timestamptz not null default now()
);

create table if not exists settings (
  key           text primary key,
  value         jsonb not null,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Security: the app talks to Supabase only from the server with the service
-- role key. RLS is on with no policies, so the anon key can read nothing.
-- ---------------------------------------------------------------------------
alter table industries         enable row level security;
alter table brands             enable row level security;
alter table affiliate_programs enable row level security;
alter table scans              enable row level security;
alter table keywords           enable row level security;
alter table serp_results       enable row level security;
alter table opportunities      enable row level security;
alter table domain_candidates  enable row level security;
alter table handoffs           enable row level security;
alter table settings           enable row level security;
