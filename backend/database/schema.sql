-- GrowPilot AI | PostgreSQL / Supabase schema v1.0
-- Run once in Supabase SQL Editor on a NEW project.
-- Backend-only data access via server-side Supabase service role key.
-- IMPORTANT: Never expose the service role key to the browser.

create extension if not exists pgcrypto;

-- Shared timestamp maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Business and operational customer data
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  owner_name text not null check (length(trim(owner_name)) > 0),
  business_type text not null default 'digital_service_center',
  currency_code char(3) not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  external_reference text,
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  email text,
  preferred_channel text not null default 'simulation'
    check (preferred_channel in ('simulation','sms','email','whatsapp')),
  marketing_consent boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, external_reference),
  unique (id, business_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  external_reference text,
  service_type text not null,
  amount numeric(12,2) not null check (amount >= 0),
  fee_revenue numeric(12,2) not null default 0 check (fee_revenue >= 0),
  status text not null default 'completed'
    check (status in ('completed','pending','failed','refunded')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (customer_id, business_id)
    references public.customers(id, business_id) on delete cascade,
  unique (business_id, external_reference)
);

-- 2. Goals, durable runs and business insights
create table if not exists public.agent_goals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text not null,
  goal_type text not null default 'customer_retention'
    check (goal_type in ('customer_retention','revenue_growth','general')),
  target_metric text,
  target_value numeric(14,2),
  baseline_value numeric(14,2),
  due_at timestamptz,
  status text not null default 'active'
    check (status in ('draft','active','paused','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  goal_id uuid not null,
  status text not null default 'queued'
    check (status in ('queued','running','waiting_approval','completed','failed','cancelled')),
  current_step text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  checkpoint jsonb not null default '{}'::jsonb,
  summary text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, business_id)
    references public.agent_goals(id, business_id) on delete cascade,
  unique (id, business_id),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  goal_id uuid,
  memory_key text not null,
  content jsonb not null default '{}'::jsonb,
  source_run_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, business_id)
    references public.agent_goals(id, business_id) on delete cascade,
  foreign key (source_run_id, business_id)
    references public.agent_runs(id, business_id) on delete set null (source_run_id),
  unique (business_id, goal_id, memory_key)
);

-- One NULL goal can represent business-wide memory; enforce uniqueness for that case.
create unique index if not exists ux_agent_memory_global
  on public.agent_memory(business_id, memory_key) where goal_id is null;

create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  run_id uuid not null,
  title text not null,
  rationale text,
  plan_json jsonb not null default '{}'::jsonb,
  status text not null default 'proposed'
    check (status in ('proposed','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (run_id, business_id)
    references public.agent_runs(id, business_id) on delete cascade,
  unique (id, business_id)
);

-- 3. Human-approved action queue + idempotency and simulated delivery
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  run_id uuid not null,
  plan_id uuid,
  customer_id uuid,
  action_type text not null
    check (action_type in ('send_message','create_followup','recommendation')),
  channel text not null default 'simulation'
    check (channel in ('simulation','sms','email','whatsapp','internal')),
  payload jsonb not null default '{}'::jsonb,
  rationale text,
  expected_outcome text,
  idempotency_key text not null,
  status text not null default 'pending_approval'
    check (status in ('pending_approval','approved','rejected','executing','completed','failed','cancelled')),
  requires_approval boolean not null default true,
  approved_by text,
  approved_at timestamptz,
  rejected_reason text,
  retry_count integer not null default 0 check (retry_count >= 0),
  max_retries integer not null default 2 check (max_retries between 0 and 10),
  next_retry_at timestamptz,
  last_error text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (run_id, business_id)
    references public.agent_runs(id, business_id) on delete cascade,
  foreign key (plan_id, business_id)
    references public.action_plans(id, business_id) on delete set null (plan_id),
  foreign key (customer_id, business_id)
    references public.customers(id, business_id) on delete set null (customer_id),
  unique (business_id, idempotency_key),
  unique (id, business_id),
  check (status <> 'approved' or not requires_approval or approved_at is not null),
  check (status <> 'rejected' or approved_at is null)
);

create table if not exists public.message_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  action_id uuid not null,
  customer_id uuid,
  destination text,
  channel text not null default 'simulation'
    check (channel in ('simulation','sms','email','whatsapp')),
  message_body text not null,
  provider_message_id text,
  status text not null default 'sent'
    check (status in ('sent','delivered','failed')),
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (action_id, business_id)
    references public.agent_actions(id, business_id) on delete cascade,
  foreign key (customer_id, business_id)
    references public.customers(id, business_id) on delete set null (customer_id),
  unique (action_id)
);

-- 4. Immutable execution traces, outcome measurement and learning
create table if not exists public.execution_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  run_id uuid,
  action_id uuid,
  event_type text not null,
  severity text not null default 'info'
    check (severity in ('debug','info','warning','error')),
  tool_name text,
  model_name text,
  model_provider text,
  latency_ms integer check (latency_ms >= 0),
  tokens_input integer check (tokens_input >= 0),
  tokens_output integer check (tokens_output >= 0),
  estimated_cost_usd numeric(12,6) check (estimated_cost_usd >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (run_id, business_id)
    references public.agent_runs(id, business_id) on delete cascade,
  foreign key (action_id, business_id)
    references public.agent_actions(id, business_id) on delete set null (action_id)
);

create table if not exists public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  run_id uuid not null,
  evaluation_type text not null default 'retention'
    check (evaluation_type in ('retention','revenue','execution_quality')),
  status text not null default 'pending'
    check (status in ('pending','completed','insufficient_data','failed')),
  measurement_start timestamptz,
  measurement_end timestamptz,
  baseline_value numeric(14,2),
  actual_value numeric(14,2),
  metric_name text,
  findings text,
  recommendations jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (run_id, business_id)
    references public.agent_runs(id, business_id) on delete cascade,
  check (measurement_end is null or measurement_start is null or measurement_end >= measurement_start)
);

-- High-frequency access patterns
create index if not exists idx_customers_business on public.customers(business_id);
create index if not exists idx_transactions_customer_date
  on public.transactions(customer_id, occurred_at desc) where status = 'completed';
create index if not exists idx_transactions_business_date
  on public.transactions(business_id, occurred_at desc);
create index if not exists idx_goals_business_status on public.agent_goals(business_id, status);
create index if not exists idx_runs_goal_created on public.agent_runs(goal_id, created_at desc);
create index if not exists idx_runs_business_status on public.agent_runs(business_id, status);
create index if not exists idx_actions_business_status
  on public.agent_actions(business_id, status, created_at desc);
create index if not exists idx_actions_customer on public.agent_actions(customer_id, created_at desc);
create index if not exists idx_actions_due_retry
  on public.agent_actions(next_retry_at) where status = 'failed' and next_retry_at is not null;
create index if not exists idx_logs_run_time on public.execution_logs(run_id, created_at desc);
create index if not exists idx_evaluations_run on public.evaluation_results(run_id, created_at desc);

-- Keep updated_at accurate
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.agent_goals
  for each row execute function public.set_updated_at();
create trigger runs_updated_at before update on public.agent_runs
  for each row execute function public.set_updated_at();
create trigger memory_updated_at before update on public.agent_memory
  for each row execute function public.set_updated_at();
create trigger plans_updated_at before update on public.action_plans
  for each row execute function public.set_updated_at();
create trigger actions_updated_at before update on public.agent_actions
  for each row execute function public.set_updated_at();
create trigger evaluations_updated_at before update on public.evaluation_results
  for each row execute function public.set_updated_at();

-- IMPORTANT: RLS enabled with no browser-facing policies by default.
-- Express backend uses a SECRET service-role key stored only on the server.
-- This demo does not yet implement end-user login / multi-tenant auth.
alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.agent_goals enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_memory enable row level security;
alter table public.action_plans enable row level security;
alter table public.agent_actions enable row level security;
alter table public.message_deliveries enable row level security;
alter table public.execution_logs enable row level security;
alter table public.evaluation_results enable row level security;

-- Additional guardrail: only server-side privileged role should write these tables.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;