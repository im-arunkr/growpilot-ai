
-- GrowPilot AI - Authentication & Business Memberships
-- Run after schema.sql in a NEW Supabase project.
-- Existing production/development data is not modified
-- unless you explicitly execute this migration.

CREATE TABLE IF NOT EXISTS public.business_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    business_id UUID NOT NULL
        REFERENCES public.businesses(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL
        CHECK (role IN ('owner', 'admin', 'staff')),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_memberships_user
ON public.business_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_business_memberships_business
ON public.business_memberships(business_id);

ALTER TABLE public.business_memberships
ENABLE ROW LEVEL SECURITY;

-- Users can view their own memberships.
DROP POLICY IF EXISTS "Users view own memberships"
ON public.business_memberships;

CREATE POLICY "Users view own memberships"
ON public.business_memberships
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);

-- Membership creation is deliberately not exposed
-- to authenticated frontend users.
-- Initial owner membership must be provisioned
-- through a trusted administrative process.
