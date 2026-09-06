-- ============================================================
-- Migration 039: Allow new users to create their profile row
-- Problem: New Google/email users get an auth.users row but never
-- a public.users profile. Nothing in the schema creates it:
--   * No trigger on auth.users → public.users
--   * No INSERT policy/grant on users
--   * Onboarding.tsx only ever issued UPDATE (silent no-op)
-- Result: fresh users were bounced back to /auth/student.
-- Fix: grant INSERT on the profile columns + an RLS policy that
-- only permits inserting your OWN row (auth_id = auth.uid()) with
-- the default student role.
-- ============================================================

-- 1. Column-level INSERT grant for the columns onboarding writes
grant insert (
  auth_id,
  email,
  full_name,
  branch_id,
  semester,
  enrollment_id,
  onboarding_completed
) on public.users to authenticated;

-- 2. RLS policy: a user may only create their own profile row.
--    role is force-locked to STUDENT so a client can never self-promote.
drop policy if exists users_insert_own on public.users;

create policy users_insert_own on public.users
  for insert
  with check (
    auth_id = auth.uid()
    and role = 'STUDENT'
  );