
-- GrowPilot AI
-- Persisted autonomous replanning cycles
--
-- One successor planning cycle per parent run.
-- Safe to rerun: IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.agent_replanning_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    business_id UUID NOT NULL
        REFERENCES public.businesses(id),

    goal_id UUID NOT NULL
        REFERENCES public.agent_goals(id),

    parent_run_id UUID NOT NULL
        REFERENCES public.agent_runs(id),

    next_run_id UUID
        REFERENCES public.agent_runs(id),

    cycle_number INTEGER NOT NULL
        CHECK (cycle_number BETWEEN 1 AND 3),

    status TEXT NOT NULL DEFAULT 'reserved'
        CHECK (
            status IN (
                'reserved',
                'planning',
                'completed',
                'failed',
                'needs_attention'
            )
        ),

    evidence_timestamp TIMESTAMPTZ NOT NULL,

    evidence_count INTEGER NOT NULL DEFAULT 0
        CHECK (evidence_count >= 0),

    decision JSONB NOT NULL DEFAULT '{}'::jsonb,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent duplicate successor plans
    -- for the same parent worker run.
    CONSTRAINT unique_replan_parent
        UNIQUE (parent_run_id),

    CONSTRAINT unique_replan_next_run
        UNIQUE (next_run_id)
);

CREATE INDEX IF NOT EXISTS idx_replanning_business_goal
ON public.agent_replanning_cycles (
    business_id,
    goal_id,
    created_at
);

CREATE INDEX IF NOT EXISTS idx_replanning_status
ON public.agent_replanning_cycles (
    status
);

ALTER TABLE public.agent_replanning_cycles
ENABLE ROW LEVEL SECURITY;

-- No direct frontend policies.
-- Backend service-role access only.
-- Human approval is still mandatory
-- for every generated customer action.
