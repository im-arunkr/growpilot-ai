
# GrowPilot AI — Autonomous AI Worker Evaluation

## 1. Evaluation Objective

Evaluate whether GrowPilot AI can help a synthetic
micro-entrepreneur improve customer retention through
goal-driven planning, human-approved interventions,
safe execution and measurable feedback.

Business: Arun Digital Services
Data: Synthetic
Execution mode: Simulation only

## 2. Business Goal

Goal: Improve repeat customer retention.

Metric: Repeat Customer Rate
Configured baseline: 20%
Target: 30%
Deadline: 22 December 2026

The 20% baseline is an illustrative demonstration
configuration, not a verified historical measurement.

Business goal completion is assessed separately from
successful technical workflow execution.

## 3. Scenario A — Successful Worker Execution

Status: PASS — observed execution result

Workflow:
1. Generate retention opportunities.
2. Generate and save a message draft.
3. Obtain human approval.
4. Resume the saved worker run.
5. Execute approved action in simulation.
6. Save execution history.

Observed:
- Executed actions: 1
- Skipped actions: 2
- Failed actions: 0
- Pending approvals: 0
- Reported run status: completed

Outcome:
The worker successfully resumed and executed a
human-approved simulated action.

Limitation:
This result does not demonstrate actual customer
re-engagement or increased business income.

## 4. Scenario B — Missing Approved Draft

Status: PASS — safe failure detection

Run ID:
6314e924-841c-4d2a-8c56-dbafe7822edd

Problem:
An approved action did not contain a valid saved
message draft.

Observed:
- Execution was blocked.
- The action was reported as needing manual review.
- The action was not marked completed.
- No successful delivery was reported for this action.

Outcome:
The worker avoided executing an invalid action.

Improvement:
Added saved-draft validation to the Resume Executor.

Limitation:
The invalid approved action remains unresolved until
a separate review or correction workflow handles it.

## 5. Scenario C — AI Model Unavailable

Status: PASS — deterministic fallback

Run ID:
f4cb5b3f-26dd-45dc-8b61-8a14893034d8

Model configuration:
Ollama / Qwen2.5 3B

Failure:
Connection refused at 127.0.0.1:11434.

Observed:
- Worker run succeeded.
- Strategy source: deterministic_fallback
- Retention actions generated: 4
- AI-enhanced actions: 0
- Execution logs saved: 9
- Reported run duration: 4,907 ms
- Run persisted: true
- Final run state: awaiting_approval

Outcome:
The worker continued deterministic planning despite
AI model unavailability.

Limitation:
Generated strategies were deterministic rather than
model-enhanced.

## 6. Harness Engineering

Implemented components:
- Authenticated business-scoped API routes
- Persistent agent runs and checkpoints
- Human approval workflow
- Simulated message execution
- Conditional action execution claims
- Duplicate delivery protection
- Execution logs
- Stale execution recovery
- Resume Executor

Application restart demonstration:
Not yet independently recorded in this evaluation.

### Restart, Resume and Idempotency Verification

Status: PASS

Run ID:
f4cb5b3f-26dd-45dc-8b61-8a14893034d8

Completed action ID:
9e6023c3-a526-450c-9a5f-47ce06b8409d

Test procedure:
1. Persisted a worker run with an approved action.
2. Restarted the backend server.
3. Resumed the saved worker run.
4. Observed one successful simulated execution.
5. Retried the same run through the authenticated API.
6. Queried message_deliveries after the retry.

Observed results:
- First resume: 1 action executed.
- Retry: 0 actions executed.
- Previously completed action skipped.
- Retry failures: 0.
- Database delivery count after retry: 1.
- Remaining actions retained their pending approval state.

Conclusion:
The observed test demonstrates that the worker
can resume after a backend restart and avoids
re-executing this completed action during retry.

Scope:
This does not independently prove exactly-once
execution under simultaneous requests, network
partitions or database transaction failures.


## 7. Inference Engineering

Primary model:
Local Ollama Qwen2.5 3B.

Fallback:
Deterministic customer retention strategy.

Rationale:
Local inference supports privacy and avoids
per-request hosted-model charges.

Trade-off:
Inference speed and output quality depend on
available hardware and model capability.

Model cost:
Not quantified in this evaluation.

## 8. Business Outcome Evaluation

Goal Progress Engine measures completed transaction
records against the configured target.

Supported metrics:
- repeat_customer_rate
- monthly_fee_revenue

A successful simulated message is not evidence that
the customer returned or generated revenue.

Actual before/after improvement and intervention
attribution remain unproven.

## 9. Known Limitations

- Simulated outreach only; no real messages sent.
- No demonstrated causal revenue improvement.
- Baseline requires historical validation.
- Automatic continuous replanning remains incomplete.
- Some database writes are not fully transactional.
- Run-level execution evidence export needs improvement.
- Restart and resume verified manually; concurrent execution and crash-mid-write recovery require further testing.

## 10. Next Improvements

1. Add reproducible restart-resumption demonstration.
2. Record run-level execution traces.
3. Improve transaction-based goal evaluation.
4. Add feedback-driven replanning.
5. Improve context retrieval and model cost reporting.

## 11. Conclusion

GrowPilot AI demonstrates a working foundation for a
goal-driven Autonomous AI Worker.

Observed evidence includes:
- Successful human-approved simulated execution
- Safe detection of an invalid approved action
- Deterministic fallback when the AI model is offline

The prototype demonstrates engineering reliability,
but does not yet prove real-world business impact.
