-- Adds the SELLING PRICE column to AllFileLog for Customer / Staff sales.
-- Run this once in the Supabase Dashboard (SQL Editor -> New query -> Run).
--
-- When USAGE is saved with the type pill set to CUSTOMER or STAFF, the app now
-- shows a "Selling Price" line and stores the typed numeric price in this column.

alter table public."AllFileLog"
  add column if not exists "SELLING PRICE" numeric;