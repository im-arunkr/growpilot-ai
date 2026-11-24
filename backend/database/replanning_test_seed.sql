
-- GrowPilot AI - Isolated Replanning Demo
-- Uses synthetic data only.
-- Does not change the original demo business.

BEGIN;

-- 1. Separate test business
INSERT INTO public.businesses (
    id,
    name,
    owner_name,
    business_type,
    description
)
VALUES (
    md5('growpilot-replanning-test-business')::uuid,
    'GrowPilot Replanning Test Shop',
    'Demo Owner',
    'digital_service_center',
    'Isolated synthetic business for feedback and replanning tests'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Give existing demo owner/admin access
-- to the separate test business.
INSERT INTO public.business_memberships (
    business_id,
    user_id,
    role,
    status
)
SELECT
    md5('growpilot-replanning-test-business')::uuid,
    bm.user_id,
    'owner',
    'active'
FROM public.business_memberships bm
WHERE bm.business_id =
    '59e2676c-2175-e58d-033d-cc56183bd875'
  AND bm.role IN ('owner', 'admin')
  AND bm.status = 'active'
ON CONFLICT (business_id, user_id) DO NOTHING;

-- 3. Create 12 synthetic customers
INSERT INTO public.customers (
    id,
    business_id,
    external_reference,
    full_name,
    preferred_channel,
    notes
)
SELECT
    md5('replanning-test-customer-' || n)::uuid,
    md5('growpilot-replanning-test-business')::uuid,
    'REPLAN-CUST-' || n,
    'Test Customer ' || n,
    'simulation',
    'Synthetic replanning test customer'
FROM generate_series(1, 12) AS n
ON CONFLICT (id) DO NOTHING;

-- 4. Create historical transactions.
-- Customers 1-10 are inactive.
-- Customers 11-12 are active.
INSERT INTO public.transactions (
    id,
    business_id,
    customer_id,
    external_reference,
    service_type,
    amount,
    fee_revenue,
    status,
    occurred_at
)
SELECT
    md5('replanning-test-transaction-' || n)::uuid,
    md5('growpilot-replanning-test-business')::uuid,
    md5('replanning-test-customer-' || n)::uuid,
    'REPLAN-TXN-' || n,
    'bill_payment',
    500,
    15,
    'completed',
    CASE
        WHEN n <= 10
        THEN NOW() - INTERVAL '60 days'
        ELSE NOW() - INTERVAL '5 days'
    END
FROM generate_series(1, 12) AS n
ON CONFLICT (id) DO NOTHING;

-- 5. One additional transaction for customer 11.
-- Initial repeat rate: 1 out of 2 active customers = 50%.
INSERT INTO public.transactions (
    id,
    business_id,
    customer_id,
    external_reference,
    service_type,
    amount,
    fee_revenue,
    status,
    occurred_at
)
VALUES (
    md5('replanning-test-extra-transaction')::uuid,
    md5('growpilot-replanning-test-business')::uuid,
    md5('replanning-test-customer-11')::uuid,
    'REPLAN-TXN-EXTRA',
    'mobile_recharge',
    300,
    10,
    'completed',
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Create measurable retention goal.
INSERT INTO public.agent_goals (
    id,
    business_id,
    title,
    description,
    goal_type,
    target_metric,
    baseline_value,
    target_value,
    due_at,
    status
)
VALUES (
    md5('growpilot-replanning-test-goal')::uuid,
    md5('growpilot-replanning-test-business')::uuid,
    'Improve Test Customer Retention',
    'Demonstrate feedback-driven automatic replanning',
    'customer_retention',
    'repeat_customer_rate',
    20,
    80,
    NOW() + INTERVAL '30 days',
    'active'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- 7. Verify isolated test data
SELECT
    b.id AS business_id,
    b.name,
    COUNT(DISTINCT c.id) AS customers,
    COUNT(DISTINCT t.id) AS transactions
FROM public.businesses b
LEFT JOIN public.customers c
    ON c.business_id = b.id
LEFT JOIN public.transactions t
    ON t.business_id = b.id
WHERE b.id =
    md5('growpilot-replanning-test-business')::uuid
GROUP BY b.id, b.name;
