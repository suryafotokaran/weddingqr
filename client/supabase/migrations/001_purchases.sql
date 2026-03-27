-- ─── Purchases Table ────────────────────────────────────────────────────────
-- Tracks every successful Razorpay payment tied to a user

create table if not exists public.purchases (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan                 text not null check (plan in ('basic', 'pro', 'premium')),
  quantity             int  not null default 1 check (quantity > 0),
  events_granted       int  not null,
  amount_paise         int  not null,
  razorpay_order_id    text not null unique,
  razorpay_payment_id  text unique,
  status               text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at           timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.purchases enable row level security;

-- Users can only read their own purchases
create policy "users can view own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

-- Only the service role (Edge Functions) can insert/update
create policy "service role can manage purchases"
  on public.purchases for all
  using (auth.role() = 'service_role');

-- Index for fast lookup by user
create index idx_purchases_user_id on public.purchases(user_id);
