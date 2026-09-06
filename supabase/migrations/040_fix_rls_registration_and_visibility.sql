-- ============================================================
-- Migration 040: Fix RLS for Registration & Community Content Visibility
-- ============================================================
-- Phase 1: Ensure users table INSERT policy works for onboarding
--   The 039 migration created the policy but may need re-application
--   Key: auth_id = auth.uid() + role = STUDENT (default)
--
-- Phase 2: Community content (study_materials, uploads) should be
--   readable by ALL authenticated users (cross-branch visibility),
--   while INSERT/UPDATE/DELETE remain branch-scoped.

-- ============================================================
-- PHASE 1: users table - ensure INSERT policy is correct
-- ============================================================

-- Re-grant INSERT on profile columns (idempotent)
grant insert (
  auth_id,
  email,
  full_name,
  branch_id,
  semester,
  enrollment_id,
  onboarding_completed
) on public.users to authenticated;

-- Re-create INSERT policy (idempotent)
drop policy if exists users_insert_own on public.users;

create policy users_insert_own on public.users
  for insert
  with check (
    auth_id = auth.uid()
    and role = 'STUDENT'
  );

-- ============================================================
-- PHASE 2A: study_materials - allow ALL authenticated users to READ
-- ============================================================

-- Drop the restrictive branch+semester scoped SELECT policy
drop policy if exists "Students can read study materials" on public.study_materials;

-- Create open SELECT policy for all authenticated users
create policy "Authenticated users can read study materials"
on public.study_materials
for select
to authenticated
using (true);

-- Keep branch-scoped INSERT/UPDATE/DELETE for content moderation
-- (These are handled by the submit_queue_vote RPC and admin functions)

-- ============================================================
-- PHASE 2B: uploads - allow ALL authenticated users to READ
-- ============================================================

-- Drop the restrictive branch+semester scoped SELECT policy
drop policy if exists uploads_select_scoped on public.uploads;

-- Create open SELECT policy for all authenticated users
create policy "Authenticated users can read uploads"
on public.uploads
for select
to authenticated
using (true);

-- Keep branch-scoped INSERT (only own branch/semester)
drop policy if exists uploads_insert_self_scoped on public.uploads;
create policy uploads_insert_self_scoped on public.uploads
  for insert
  with check (
    user_id   = auth_user_id()
    and branch_id = auth_branch_id()
    and semester  = auth_semester()
  );

-- Keep owner/admin UPDATE (only before verification or admin)
drop policy if exists uploads_update_owner_or_admin on public.uploads;
create policy uploads_update_owner_or_admin on public.uploads
  for update
  using (
    (user_id = auth_user_id() and status = 'UNVERIFIED')
    or auth_role() = 'SUPER_ADMIN'
  );

-- Keep admin-only DELETE
drop policy if exists uploads_delete_admin_only on public.uploads;
create policy uploads_delete_admin_only on public.uploads
  for delete
  using (auth_role() = 'SUPER_ADMIN');