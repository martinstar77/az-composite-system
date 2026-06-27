-- Migration: Create failed_logins table for rate limiting and backoff
-- Active date: 2026-06-27

CREATE TABLE IF NOT EXISTS public.failed_logins (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    ip_address text,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL
);

-- Enable RLS
ALTER TABLE public.failed_logins ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write logs
DROP POLICY IF EXISTS "Admini mohou cist failed_logins" ON public.failed_logins;
CREATE POLICY "Admini mohou cist failed_logins" ON public.failed_logins 
FOR SELECT TO authenticated USING (public.get_my_role() = 'admin');

-- Add index on email and attempted_at for fast lookup
CREATE INDEX IF NOT EXISTS idx_failed_logins_email_time ON public.failed_logins(email, attempted_at DESC);
