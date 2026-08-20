-- Creates the cross-device submitted-orders table used by the ORDER panel.
-- Run this once in the Supabase Dashboard (SQL Editor -> New query -> Run).
--
-- "Submitted" = an order that has been SUBMITTED but NOT yet confirmed.
-- One shared "submit" per branch, stored as one row per product line.
-- When the order is CONFIRMED (or Reset/cancelled), the rows for that branch are deleted.

create table if not exists public."OrderSubmit" (
  "id" bigserial primary key,
  "BRANCH" text not null,             -- Boudoir / Chic Nailspa / Nur Yadi
  "PRODUCT NAME" text not null,
  "QTY" integer not null default 0,
  "DATE" text not null,               -- ISO date of the order
  "GRN" text,                         -- generated GRN reference
  "NOTES" text,
  "created_at" timestamptz not null default now()
);

create index if not exists "OrderSubmit_branch_idx" on public."OrderSubmit" ("BRANCH");

alter table public."OrderSubmit" enable row level security;

-- The app uses the anon (publishable) key, so allow full access for the anon role,
-- matching how the rest of the tables are used by this app.
drop policy if exists "OrderSubmit select for anon" on public."OrderSubmit";
create policy "OrderSubmit select for anon" on public."OrderSubmit"
  for select using (true);

drop policy if exists "OrderSubmit insert for anon" on public."OrderSubmit";
create policy "OrderSubmit insert for anon" on public."OrderSubmit"
  for insert with check (true);

drop policy if exists "OrderSubmit update for anon" on public."OrderSubmit";
create policy "OrderSubmit update for anon" on public."OrderSubmit"
  for update using (true) with check (true);

drop policy if exists "OrderSubmit delete for anon" on public."OrderSubmit";
create policy "OrderSubmit delete for anon" on public."OrderSubmit"
  for delete using (true);