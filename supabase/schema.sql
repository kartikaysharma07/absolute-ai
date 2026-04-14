create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  plan text,
  full_name text,
  avatar_url text,
  provider text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_status text,
  stripe_last_payment_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id bigserial primary key,
  stripe_session_id text unique not null,
  stripe_invoice_id text unique,
  stripe_subscription_id text,
  stripe_customer_id text,
  supabase_user_id uuid,
  email text,
  amount_total integer not null default 0,
  currency text not null default 'usd',
  payment_status text,
  plan_id text,
  plan_title text,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id bigserial primary key,
  stripe_subscription_id text unique not null,
  stripe_customer_id text,
  supabase_user_id uuid,
  email text,
  status text not null,
  price_id text,
  product_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  raw_event jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Simple application tables requested (create only if not present)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions_simple (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade unique,
  plan text,
  status text,
  created_at timestamptz not null default now()
);

-- API keys for external access
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  key_hash text not null unique,
  name text,
  last_used_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  api_key_id uuid references public.api_keys (id),
  tokens_used integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table public.payments enable row level security;

alter table public.subscriptions enable row level security;

alter table public.users enable row level security;

alter table public.usage enable row level security;

alter table public.api_keys enable row level security;

create policy "Users can read their own payments"
  on public.payments
  for select
  using (auth.uid() = supabase_user_id);

create policy "Users can read their own subscriptions"
  on public.subscriptions
  for select
  using (auth.uid() = supabase_user_id);

create policy "Users can read their own simple subscriptions"
  on public.subscriptions_simple
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own simple subscriptions"
  on public.subscriptions_simple
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own usage"
  on public.usage
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own usage"
  on public.usage
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own api keys"
  on public.api_keys
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own api keys"
  on public.api_keys
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own api keys"
  on public.api_keys
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own api keys"
  on public.api_keys
  for delete
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_app_meta_data ->> 'provider',
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    provider = excluded.provider,
    updated_at = now();

  -- Also ensure a lightweight public.users row exists for application usage
  insert into public.users (id, email, created_at)
  values (new.id, new.email, now())
  on conflict (id) do update set
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
