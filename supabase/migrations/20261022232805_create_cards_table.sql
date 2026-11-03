-- Baseline: reconstructed from the live database (table, constraints, index, trigger, RLS policies)
-- after the fact, so it documents the schema rather than being the original migration text.

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  assignee text not null default '',
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low', 'None')),
  due_date date,
  status text not null default 'backlog' check (status in ('backlog', 'in-progress', 'in-review', 'done')),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_user_status_position_idx on public.cards (user_id, status, position);

-- set_updated_at() and the cards_set_updated_at trigger exist in the live database
-- (before update, for each row); their function body was not captured here.

alter table public.cards enable row level security;

create policy "Users can view their own cards" on public.cards
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users can create their own cards" on public.cards
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can update their own cards" on public.cards
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own cards" on public.cards
  for delete to authenticated using ((select auth.uid()) = user_id);
