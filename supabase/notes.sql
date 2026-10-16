-- Stores one free-text note per product, looked up by PRODUCT NAME.
-- Shown from the Office search product card via the Information icon next to
-- the Add Image (+) button.
--
-- Run this once in the Supabase Dashboard (SQL Editor -> New query -> Run).

create table if not exists public."Notes" (
  "id" bigserial primary key,
  "PRODUCT NAME" text not null,
  "NOTES" text,
  "created_at" timestamptz not null default now()
);

create index if not exists "Notes_product_name_idx" on public."Notes" ("PRODUCT NAME");

alter table public."Notes" enable row level security;

drop policy if exists "Notes select for anon" on public."Notes";
create policy "Notes select for anon" on public."Notes"
  for select using (true);

drop policy if exists "Notes insert for anon" on public."Notes";
create policy "Notes insert for anon" on public."Notes"
  for insert with check (true);

drop policy if exists "Notes update for anon" on public."Notes";
create policy "Notes update for anon" on public."Notes"
  for update using (true) with check (true);

drop policy if exists "Notes delete for anon" on public."Notes";
create policy "Notes delete for anon" on public."Notes"
  for delete using (true);
