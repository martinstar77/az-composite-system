-- Migration: Fix missing INSERT policy on failed_logins
-- The original migration only had a SELECT policy.
-- The service role bypasses RLS by default, but this migration adds an
-- explicit INSERT policy so logs can be written by the service_role client
-- used in logLoginAttempt() / checkLoginAttempts().

-- Allow service_role unrestricted INSERT (belt-and-suspenders alongside RLS bypass)
DROP POLICY IF EXISTS "Service role muze zapsat failed_logins" ON public.failed_logins;

CREATE POLICY "Service role muze zapsat failed_logins" ON public.failed_logins
FOR INSERT WITH CHECK (true);

-- Add missing index on ip_address for the IP-based lookup in checkLoginAttempts
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip_time ON public.failed_logins(ip_address, attempted_at DESC);
