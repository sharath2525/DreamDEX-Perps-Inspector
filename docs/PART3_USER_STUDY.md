# Three-person comparison protocol — not yet performed

Status: **UNPERFORMED**. No testers, timings, quotes, satisfaction scores or retention results are claimed. Automated browser checks are separate engineering evidence.

## Purpose

Find out whether PEI helps a trader answer “which account traded, what filled, what remains, and what exposure do I have?” more accurately or faster than the official app plus explorer. If it does not, improve those answers before expanding features.

## Prepare once

1. Recruit three relevant people: a perps trader, a bot builder, and a less experienced trader where possible. Use anonymous IDs A, B, C.
2. Ask for consent to take notes; obtain separate consent before recording. Do not collect keys, email addresses or wallet sessions.
3. Use one supported real transaction and its public owner/pool for both tools. Save a timestamped canonical report first. A synthetic fixture is unsuitable for claiming real trading evidence.
4. Ensure both tools and the report link open in the tester's browser. The current owner-private hosted site is not automatically accessible to them. Use a locally run source checkout or an approved accessible deployment.
5. Prepare the answer sheet from receipt events and same-time account observations. Record later state changes separately. Do not mark a different current remainder incorrect without checking timestamps.
6. Give A the official tools first, B PEI first, and C official tools first. Record this imperfect counterbalance; three users cannot establish statistical superiority.

## Tasks — read these prompts without coaching

1. **Account:** “Identify the address holding trading margin and the address paying transaction gas. Are they the same?” Start timer when tools open. Stop when the tester answers. Record exact addresses, seconds, assistance and confidence 1–5.
2. **Execution:** “Did this transaction fill? How much filled in this receipt? What remainder is observed now? What can you NOT conclude?” Start the outcome timer on report/tool opening. Record correct/incorrect/unknown, seconds, assistance and source blocks.
3. **Exposure:** “Which direction is the resulting position? Apply +10% to that market only. Does modeled equity improve or worsen, and what is excluded?” Record correctness, seconds, assistance and whether the tester understands that a scenario places no order.
4. Repeat using the other tool with the same evidence. Note learning effects and any prices/state that changed between runs.
5. Ask: “Which tool would you use after an uncertain trade, and why? What confused you most? In what situation would you return?” Record actual words with permission; do not suggest the desired answer.

## Pass/fail and follow-up

1. Proposed target: at least two of three identify outcome AND remainder correctly, without help, within 60 seconds of opening the report. This is a target, not an achieved result.
2. Incorrect actor/owner, false fill interpretation, or inability to find evidence is a high-priority failure regardless of speed.
3. For each failure record the exact step, screenshot, source time and explanation. Fix the smallest relevant obstacle; retest the affected task with consent.
4. Preserve unfavorable results. Report individual observations and limitations; do not claim product-market fit or statistical significance.
5. Ask permission for a voluntary later follow-up. Record whether they actually used PEI again, separately from their stated intention. No tracking/analytics is installed by this work.

## Blank results record — copy one per person/tool/task

```text
Participant ID:
Relevant experience:
Notes consent / recording consent:
Build revision and browser:
Tool and order (first/second):
Task ID:
Transaction hash / account / pool:
Receipt block / current observation block and time:
Start / finish / elapsed seconds:
Exact answer:
Correct / incorrect / inconclusive and rationale:
Assistance given (none, hint, guided):
Confidence 1–5:
Confusion / screenshot or recording reference:
Intended return use:
Observed voluntary return use (unknown until measured):
Fix and retest result:
```
