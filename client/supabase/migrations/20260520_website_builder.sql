-- Website Builder: per-event wedding website configuration
create table if not exists website_configs (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid unique not null references events(id) on delete cascade,
  template_id  text not null default 'template1',
  data         jsonb not null default '{}',
  is_published boolean not null default false,
  slug         text unique,                        -- friendly URL: arjun-and-priya
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_website_configs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger website_configs_updated_at
  before update on website_configs
  for each row execute procedure update_website_configs_updated_at();

-- RLS
alter table website_configs enable row level security;

-- Event owners can do everything
create policy "owner_all" on website_configs
  for all using (
    event_id in (select id from events where user_id = auth.uid())
  )
  with check (
    event_id in (select id from events where user_id = auth.uid())
  );

-- Anyone can read published websites (by event_id or slug)
create policy "public_read" on website_configs
  for select using (is_published = true);
