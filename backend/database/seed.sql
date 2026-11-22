-- GrowPilot AI | Demo seed data v1.0
-- Compatible with growpilot_schema.sql v1.0.
-- Run in Supabase SQL Editor AFTER schema.sql.
-- Safe to re-run: stable identifiers + ON CONFLICT DO NOTHING.
-- All names and transactions are synthetic. No real contact details.
-- Transaction dates are relative to CURRENT_DATE so the demo stays useful.

begin;

-- Consistent demo business ID makes re-seeding and API testing predictable.
insert into public.businesses (id, name, owner_name, business_type, description)
values (
  md5('growpilot-demo-business')::uuid,
  'Rahul Digital Services',
  'Rahul Sharma',
  'digital_service_center',
  'Synthetic neighborhood digital service center for autonomous retention demos.'
)
on conflict (id) do nothing;

-- 40 customers across three groups:
--   1–15 active (last completed transaction 1–12 days ago)
--  16–25 declining (last completed transaction 16–28 days ago)
--  26–40 inactive (last completed transaction 35–65 days ago)
-- No real phone/email; marketing_consent remains false by default.
with demo_customers as (
  select
    n,
    (array[
      'Amit Kumar','Neha Verma','Rohit Singh','Pooja Sharma','Arjun Gupta',
      'Sneha Kapoor','Vikram Joshi','Priya Mehta','Karan Malhotra','Anjali Rao',
      'Sanjay Patel','Meera Nair','Aditya Jain','Kavita Sinha','Nikhil Das',
      'Suresh Yadav','Riya Bansal','Manoj Mishra','Tanya Arora','Deepak Chauhan',
      'Shreya Dubey','Rakesh Tiwari','Simran Kaur','Vivek Saxena','Komal Rathi',
      'Mohan Lal','Pankaj Soni','Nitin Agarwal','Rekha Thakur','Sunil Yadav',
      'Divya Goyal','Rajesh Kumar','Asha Singh','Harish Meena','Preeti Roy',
      'Gaurav Jain','Geeta Devi','Tarun Chawla','Suman Gupta','Akash Batra'
    ])[n] as full_name
  from generate_series(1,40) as n
)
insert into public.customers
  (id, business_id, external_reference, full_name, preferred_channel, notes)
select
  md5('growpilot-demo-customer-' || n::text)::uuid,
  md5('growpilot-demo-business')::uuid,
  'DEMO-CUST-' || lpad(n::text, 3, '0'),
  full_name,
  'simulation',
  case
    when n <= 15 then 'Synthetic active customer'
    when n <= 25 then 'Synthetic declining customer'
    else 'Synthetic inactive customer'
  end
from demo_customers
on conflict (id) do nothing;

-- Completed transactions with deterministic IDs and realistic service fees.
-- Each customer has 3–7 transactions; newest completed transaction varies by cohort.
-- Amount is transaction face value; fee_revenue is earnings for the business owner.
with base as (
  select
    c as customer_num,
    t as transaction_num,
    case
      when c <= 15 then 1 + ((c * 7) % 12)
      when c <= 25 then 16 + ((c * 5) % 13)
      else 35 + ((c * 3) % 31)
    end as latest_days_ago
  from generate_series(1,40) as c
  cross join lateral generate_series(1, 3 + (c % 5)) as t
), transaction_rows as (
  select
    customer_num,
    transaction_num,
    latest_days_ago + (transaction_num - 1) * (6 + (customer_num % 4)) as days_ago,
    (array['mobile_recharge','bill_payment','money_transfer','dth_recharge'])[
      1 + ((customer_num + transaction_num) % 4)
    ] as service_type,
    (100 + ((customer_num * 71 + transaction_num * 37) % 1900))::numeric(12,2) as amount
  from base
)
insert into public.transactions
  (id, business_id, customer_id, external_reference, service_type, amount,
   fee_revenue, status, occurred_at)
select
  md5('growpilot-demo-txn-' || customer_num || '-' || transaction_num)::uuid,
  md5('growpilot-demo-business')::uuid,
  md5('growpilot-demo-customer-' || customer_num)::uuid,
  'DEMO-TXN-' || lpad(customer_num::text, 3, '0') || '-' || transaction_num,
  service_type,
  amount,
  round(amount * 0.025, 2),
  'completed',
  (current_date - make_interval(days => days_ago))::timestamptz + interval '11 hours'
from transaction_rows
on conflict (id) do nothing;

-- An initial goal: only the goal is seeded; runs, plans, approvals and logs
-- should be created by the real backend agent, not fabricated in demo data.
insert into public.agent_goals
  (id, business_id, title, description, goal_type, target_metric, target_value,
   due_at, status)
values (
  md5('growpilot-demo-retention-goal')::uuid,
  md5('growpilot-demo-business')::uuid,
  'Improve repeat customer retention',
  'Identify inactive and declining customers, propose re-engagement actions, request owner approval, and evaluate simulated outcomes.',
  'customer_retention',
  'reengaged_customers',
  5,
  now() + interval '30 days',
  'active'
)
on conflict (id) do nothing;

commit;

-- Verification: should show 1 business, 40 customers, 1 goal and >100 transactions.
select
  (select count(*) from public.businesses where id = md5('growpilot-demo-business')::uuid) as demo_businesses,
  (select count(*) from public.customers where business_id = md5('growpilot-demo-business')::uuid) as demo_customers,
  (select count(*) from public.transactions where business_id = md5('growpilot-demo-business')::uuid) as demo_transactions,
  (select count(*) from public.agent_goals where business_id = md5('growpilot-demo-business')::uuid) as demo_goals;
