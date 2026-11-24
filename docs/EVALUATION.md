# GrowPilot AI — Autonomous AI Worker Evaluation

**Evaluation date:** 24 November 2026  
**Project:** GrowPilot AI  
**Scope:** Goal-driven customer-retention worker, human review, simulation-only execution, persistence, evaluation, and evidence-driven replanning  
**Data:** Synthetic businesses, customers, and transactions  
**Overall finding:** The observed end-to-end prototype workflows passed the specified manual tests. Real-world retention uplift, production-grade concurrency guarantees, and unattended scheduling have **not** been established.

## 1. Evaluation Objective

Evaluate whether GrowPilot AI can support a synthetic micro-entrepreneur whose repeat business is declining by:

1. Loading a measurable business goal and current performance.
2. Detecting at-risk or inactive customers and generating prioritized interventions.
3. Persisting plans and waiting for a human decision before execution.
4. Resuming safely after interruption and skipping terminal actions on retry.
5. Measuring transaction-based goal progress, identifying new business evidence, and deciding whether to replan.
6. Creating **at most one successor plan per parent run** in the observed repeated-resume scenario, with actions returned for human review.

**Technical workflow success is not the same as business-goal success.** All customer outreach in these tests is simulated. A simulated delivery is not a real customer response, and no causal business-income improvement is claimed.

## 2. Synthetic Business Goals and Measurement

Two development fixtures were used. They have different goals and must not be conflated.

| Field | Original demo fixture | Isolated replanning fixture |
|---|---|---|
| Business | Arun Digital Services (synthetic) | GrowPilot Replanning Test Shop (synthetic) |
| Goal | Improve repeat customer retention | Improve test customer retention |
| Metric | `repeat_customer_rate` | `repeat_customer_rate` |
| Configured baseline | 20% (illustrative) | 20% (illustrative) |
| Target | 30% | 80% |
| Observed repeat rate in the tested scenario | 72% | 50% |
| Goal target reached in the observation | Yes | No |
| Execution mode | Simulation | Simulation |

The original fixture's stated deadline was **22 December 2026**. The isolated fixture was created with a future deadline in December 2026. A baseline configured in a goal record is **not** a verified historical control measurement.

In the observed test, `repeat_customer_rate` was measured from completed transactions within the 30-day window: customers with at least two completed transactions divided by customers with at least one completed transaction, expressed as a percentage. The isolated fixture initially had **two active customers**, of whom **one** met the repeat criterion, giving **50%**. The target was **80%**, a gap of **30 percentage points**.

The product also has support for the `monthly_fee_revenue` goal metric, but the detailed positive replanning test documented below concerns repeat-customer rate, **not** achieved revenue growth.

## 3. Scenario A — Successful Human-Approved Execution

**Status: PASS — observed simulation execution**

**Procedure:**

1. Identify inactive customers and persist an action plan.
2. Generate a customer message draft.
3. Approve a selected action using an authenticated owner/admin decision.
4. Resume or execute an approved action in simulation mode.
5. Inspect saved execution and run lifecycle evidence.

**Earlier original-fixture observation:**

- Executed actions: **1**.
- Skipped actions: **2**.
- Failed actions: **0**.
- Pending approvals: **0** in the reported completed scenario.
- Run status: **`completed`**.

**Additional isolated-fixture observation:**

- Parent run: `46b05e97-4d2a-44d8-ba31-e33a8de264ed`.
- Approved and completed action: `8982a285-afe0-4dca-9668-811b8d1d20ae`.
- Simulated delivery ID: `db919f05-ca5d-46d5-8250-b65e059bec9f`.
- Draft generation returned `strategySource: ollama`, `draftPersisted: true`, `guardrailTriggered: false`.
- Approval API returned `auditLogged: true` and stored a verified approver identity.
- Execution returned `status: completed`, `executionMode: simulation`, and `auditLogged: true`.
- Lifecycle after execution: **1 completed**, **4 rejected**, **0 pending approvals**.

**Conclusion:** The human approval handoff and simulated execution path worked for the selected actions. The test does not show a real customer contact, response, or incremental income.

## 4. Scenario B — Invalid Approved Draft

**Status: PASS — safe execution block**

**Run ID:** `6314e924-841c-4d2a-8c56-dbafe7822edd`

**Condition:** An approved action lacked a valid persisted message draft.

**Observed:**

- Execution was blocked.
- The problem was surfaced for manual review.
- The action was not marked completed.
- No successful delivery was reported for the affected action.

**Engineering response:** Saved-draft validation was added to the resume execution path.

**Limitation:** The invalid action still needs a separate remediation or review process; the test does not demonstrate fully automated repair.

## 5. Scenario C — Local Model Unavailable

**Status: PASS — deterministic fallback**

**Run ID:** `f4cb5b3f-26dd-45dc-8b61-8a14893034d8`  
**Primary model:** Ollama `qwen2.5:3b`  
**Failure observed:** `ECONNREFUSED 127.0.0.1:11434`

**Observed:**

| Measure | Result |
|---|---|
| Worker run success | Yes |
| Strategy source | `deterministic_fallback` |
| Retention actions persisted | 4 |
| AI-enhanced actions | 0 |
| Saved execution logs | 9 |
| Reported total worker-run duration | 4,907 ms |
| Persisted | `true` |
| Run awaiting review | Yes |

**Conclusion:** The planning workflow continued without the local model, saved deterministic recommendations, and retained the human approval gate.

A separate test also showed the model safety guardrail rejecting strategy enrichment, after which deterministic fallback was used. This is different from model unavailability: the local model responded but its output was not accepted.

## 6. Scenario D — Restart, Resume, and Action Idempotency

**Status: PASS — observed sequential restart/retry behavior**

**Run ID:** `f4cb5b3f-26dd-45dc-8b61-8a14893034d8`  
**Completed action ID:** `9e6023c3-a526-450c-9a5f-47ce06b8409d`

**Procedure:**

1. Persist a run containing an approved action.
2. Restart the backend server.
3. Resume the saved run using the authenticated API.
4. Retry resume after execution.
5. Inspect stored `message_deliveries` records.

**Observed:**

- First resume: **1** simulated action executed.
- Repeat resume: **0** actions executed.
- Previously completed action was skipped.
- Retry failures: **0**.
- Stored delivery count remained **1**.
- Other actions retained their waiting-for-approval state.

**Conclusion:** The run could continue from persisted state after restart and did not duplicate the previously completed action during the observed sequential retry.

**Boundary:** This does **not** prove exactly-once delivery across parallel executors, process crashes between writes, network partitions, or transaction-boundary failures.

## 7. Scenario E — Owner Rejection and Audit Trail

**Status: PASS — observed human decision handling**

An initial isolated test run was created:

- Run ID: `d0f47d19-fbeb-4eda-a876-a7832c661351`.
- Goal: **50% observed**, **80% target**.
- Actions persisted: **5**.
- All five were rejected through authenticated `PATCH /api/approvals/:actionId/decision` requests with `decision: "rejected"`.
- Each response reported `success: true` and `auditLogged: true`.
- Final lifecycle: **5 rejected**, **0 pending**, **0 completed**, run status **`cancelled`**.
- No simulated delivery was executed for this run.

**Conclusion:** The backend honored and recorded the owner's decisions, rather than treating the mere existence of an AI recommendation as authorization to act.

**Important limitation discovered:** Rejected customers can be proposed again in subsequent runs unless an explicit rejection-aware cooldown/suppression rule is added. Rejection tracking and historical suppression are separate capabilities; only the former is verified here.

## 8. Scenario F — Initial Evaluation Without New Evidence

**Status: PASS — no premature replanning**

**Parent run ID:** `46b05e97-4d2a-44d8-ba31-e33a8de264ed`  
**Goal ID:** `e2a8e527-4f2d-194b-7405-5166d280801b`

A new run generated five actions. Four were rejected; one valid Ollama-generated draft was approved and executed in simulation. An authenticated resume then evaluated goal progress.

**Observed evaluation:**

- Evaluation ID: `3a1721fd-5595-498e-92e2-5248f3474202`.
- Metric: `repeat_customer_rate`.
- Actual: **50%**; target: **80%**.
- Evaluation status: `completed`.
- `replanningEvidence.newBusinessEvidence: false`.
- `replanningEvidence.newCompletedTransactions: 0`.
- `nextDecision.decision: wait_for_new_evidence`.
- `nextDecision.shouldReplan: false`.
- `replanning.started: false`.

**Conclusion:** A below-target goal by itself did not trigger another plan when no new transaction evidence existed.

## 9. Scenario G — Evidence-Driven Autonomous Replanning

**Status: PASS — observed positive integration test**

**Parent run:** `46b05e97-4d2a-44d8-ba31-e33a8de264ed`  
**Replanning cycle:** `53db68ea-1850-460f-939e-8046b6be6b24`  
**Successor run:** `3a69ffc5-e0e4-491f-951f-ca6965f768be`

**Procedure:**

1. Save the parent run's baseline goal evaluation.
2. Add **one** new synthetic, completed transaction with an `occurred_at` timestamp after that evaluation.
3. Resume the same completed parent run through the authenticated API.
4. Inspect the evidence, next decision, persisted replanning cycle, and newly created successor plan.

**Observed:**

| Field | Observed value |
|---|---|
| `replanningEvidence.newBusinessEvidence` | `true` |
| `replanningEvidence.newCompletedTransactions` | `1` |
| `nextDecision.decision` | `replan_required` |
| `nextDecision.shouldReplan` | `true` |
| `replanning.started` | `true` |
| `replanning.cycleNumber` | `1` |
| `replanning.parentRunId` | `46b05e97-4d2a-44d8-ba31-e33a8de264ed` |
| `replanning.nextRunId` | `3a69ffc5-e0e4-491f-951f-ca6965f768be` |
| `replanning.newActions` | `10` |
| Successor status | `awaiting_human_approval` |
| Execution mode | `simulation` |

**Conclusion:** New transaction evidence triggered a goal-aware decision to create and save the next retention plan. The successor's ten actions **were proposed for owner approval**, not silently executed.

**Interpretation of “autonomous”:** The worker makes the next-step decision and creates a successor plan when its **resume API is invoked**. A background scheduler, event listener, or independently operating continuous watch loop was **not** demonstrated.

**Business impact caveat:** Actual repeat rate remained **50%**, still below the **80%** goal. The added transaction is synthetic evidence used to exercise the replanning mechanism, not proof of a customer's response to a simulated message.

## 10. Scenario H — Duplicate Successor Protection

**Status: PASS — observed sequential duplicate-resume test**

**Procedure:** Resume the same parent run again **without inserting another transaction**, then inspect replanning response and query the persisted cycles table.

**Observed API response:**

- `newBusinessEvidence: false`.
- `newCompletedTransactions: 0`.
- `nextDecision.decision: wait_for_new_evidence`.
- `nextDecision.shouldReplan: false`.
- `replanning.started: false`.

**Observed database verification:**

| Check | Result |
|---|---|
| `COUNT(*)` for parent run in `agent_replanning_cycles` | **1** |
| `COUNT(DISTINCT next_run_id)` | **1** |
| Persisted successor run | `3a69ffc5-e0e4-491f-951f-ca6965f768be` |

Reproducible read-only query for the same development fixture:

```sql
SELECT
    parent_run_id,
    COUNT(*) AS cycle_count,
    COUNT(DISTINCT next_run_id) AS unique_successor_runs,
    ARRAY_AGG(next_run_id) AS successor_run_ids
FROM public.agent_replanning_cycles
WHERE parent_run_id =
    '46b05e97-4d2a-44d8-ba31-e33a8de264ed'::uuid
GROUP BY parent_run_id;
```

**Conclusion:** No duplicate successor was created in the observed sequential repeated-resume scenario. This does **not** verify race-condition safety under two concurrent requests, nor recovery from a crash after cycle reservation but before successor-run persistence.

## 11. Engineering Design and Safety Controls

### Goal execution and persistence

- Stores business goals, agent runs, action plans, action states, execution logs, and goal evaluations in Supabase/Postgres.
- Uses a retention opportunity tool and deterministic ranking alongside optional local LLM enrichment.
- Saves human-approval checkpoints and supports a later resume request.
- Skips terminal actions such as `completed` and `rejected` during resume.
- Enforces authenticated business membership and owner/admin controls on approval-sensitive operations.
- Draft validity is checked before permitted simulated execution.

### Feedback and replanning

- `replanningDecision.service.js` makes an explicit next-step decision using goal evaluation, action state, new evidence, and a replan bound.
- `replanningEvidence.service.js` compares newly completed transaction timestamps against the **previous saved evaluation** for that run.
- `replanningOrchestrator.service.js` persists a replanning cycle and invokes successor-run planning when eligible.
- `agentResume.service.js` integrates action lifecycle, evidence lookup, evaluation, and the replanning decision.
- `agent_replanning_cycles` records parent/successor relationships and cycle state; the schema includes uniqueness constraints relevant to repeated processing.
- Fresh successor actions still require owner approval.

### Frontend visibility

- Existing Agent, Approvals, Dashboard, and History pages support the demonstration.
- A Resume Worker / Replanning panel was added to the Agent page and passed the reported TypeScript check.
- Dashboard and History status-panel additions were supplied during implementation; **their final local integration and build are not independently verified in this report**.
- The history-based status component reads a paginated log window, not a full dedicated replanning-cycle index. Older cycles may not be visible in the latest page.

### Security interpretation

All recorded deliveries use `executionMode: simulation`. Approval is necessary but is not a substitute for live-outreach consent. The test customer's saved metadata included `marketingConsent: false` and `executionAllowed: false`; no real message was sent. These observations do not establish a production-ready consent policy for external messaging providers.

## 12. Inference, Usage, and Cost Notes

**Primary inference:** Local Ollama `qwen2.5:3b`.  
**Fallback:** Deterministic opportunity prioritization and safe strategy text when inference is unavailable or rejected by guardrails.

During the isolated test, one successful message-draft generation reported:

- `provider: ollama`.
- `model: qwen2.5:3b`.
- `strategySource: ollama`.
- `promptTokens: 1547`.
- `completionTokens: 56`.
- `latencyMs: 32645`.
- `guardrailTriggered: false`.

The earlier initial plan in this fixture used deterministic fallback after a safety guardrail triggered, while message-draft generation later succeeded with Ollama. These are distinct operations.

**Cost limitation:** No complete cost accounting was established. Local inference avoids per-call hosted-model API fees but still consumes hardware, energy, memory, and operator time. One sample token report is not an end-to-end cost benchmark.

## 13. Known Limitations and Risks

1. **No demonstrated real-world business impact.** Synthetic transactions and simulated messages do not prove customer retention or monthly income improvement.
2. **Illustrative baseline.** The configured 20% starting baseline is not a validated historical observation.
3. **Human-triggered feedback loop.** Replanning runs on an authenticated resume request; no autonomous scheduler or transaction-event listener was verified.
4. **Rejected-action suppression missing.** The same previously rejected customers may be proposed again in a fresh plan. A rejection-aware cooldown, suppression policy, or explicit override process is needed before production use.
5. **Concurrency not validated.** Duplicate protection passed in sequential requests only; concurrent successor creation and crash-mid-write recovery remain untested.
6. **Transaction evidence semantics.** Evidence detection uses completed transactions with `occurred_at` later than the previous evaluation timestamp; late-arriving historical records or event-time versus ingestion-time differences need additional handling.
7. **Not all writes are fully atomic.** Recovery and reconciliation of partial reservations/plans need a stronger transactional design.
8. **No live provider integration.** SMS, email, and WhatsApp delivery, consent management, unsubscribe behavior, deliverability, and provider failures were not evaluated.
9. **Frontend history completeness.** Paginated logs are useful for evidence but are not a dedicated complete run-chain explorer. Final Dashboard/History modifications require local verification.
10. **Reproducibility and deployment.** Fresh-clone setup, credentials, migrations, automated integration tests, CI, production monitoring, and deployment hardening should be verified separately before claiming production readiness.

## 14. Recommended Next Engineering Steps

**Priority 1 — Safe product behavior**

- Implement a rejection-aware cooldown or suppression policy so the owner is not repeatedly asked to approve the same proposal without new justification.
- Make successor creation and reservation more concurrency-safe, with explicit recovery for partially completed replanning cycles.
- Distinguish transaction ingestion from event occurrence when deciding what evidence is genuinely new.

**Priority 2 — Demonstration quality**

- Verify final Dashboard and History frontend integration and run a production TypeScript/build check.
- Add a read-only authenticated endpoint to list replanning cycles per business/goal, enabling complete parent → successor history without relying only on the latest logs.
- Record a short video showing initial run, approval, simulated execution, evaluation, evidence-driven successor creation, and duplicate prevention.
- Ensure README, SQL schema/seeds, environment examples, and this evaluation report match the pushed commit.

**Priority 3 — Production readiness**

- Add scheduled/event-driven reevaluation with rate limits and operational alerts.
- Add automated integration and concurrency tests, including failure injection and crash recovery.
- Instrument comprehensive inference latency/cost, approval wait times, intervention outcomes, and true customer-return attribution.

## 15. Final Assessment

**GrowPilot AI meets the observed technical demonstration goals for a human-supervised, goal-driven retention worker** in its synthetic development environment:

- **PASS:** Goal-aware planning and persistence.
- **PASS:** Human-approved, simulation-only execution and audit logs.
- **PASS:** Safe block when an approved action lacks a valid draft.
- **PASS:** Deterministic fallback when Ollama is unavailable.
- **PASS:** Restart/resume and action idempotency in the observed sequential test.
- **PASS:** Transaction-based goal evaluation and no-replan decision when evidence is absent.
- **PASS:** New evidence triggers a persisted successor plan with **10** actions awaiting human approval.
- **PASS:** Sequential duplicate-resume test yields **1** replanning cycle and **1** successor run.

**Not established:** Real customer retention uplift, increased income, fully unattended monitoring, rejection-aware re-proposal safety, concurrent exactly-once guarantees, or production deployment readiness.

The engineering result is an **evidence-driven, checkpointed AI Worker prototype with human accountability**—not a claim of proven autonomous business growth.
