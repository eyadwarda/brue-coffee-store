-- Production database starter for brüe.
-- Run this in your Supabase SQL editor after creating a project.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  governorate text not null,
  address text not null,
  notes text,
  items jsonb not null,
  total_egp integer not null check (total_egp >= 0),
  status text not null default 'New',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
-- IMPORTANT: Do not enable public SELECT/UPDATE policies for customer data.
-- Production order submission should use a server-side Edge Function with
-- validation, rate limiting, and service-role credentials stored as secrets.
-- Admin reads/updates should require authenticated admin users only.