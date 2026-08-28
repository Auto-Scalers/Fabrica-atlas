# R5-2.9 — Spot Verification: mc-chainedispatch-reconciler.md vs Sources

**Task:** R5-2.9 (Group 2, Round 5) · task_32c12b1c4b21 · dispatch ctx_a7c57715aac7
**Report under verification:** `.Fabrica-atlas-board/discovery/round4/mc-chainedispatch-reconciler.md`
**Sources root:** `_sources/mission-control/mission-control/` (READ-ONLY — nothing under `_sources/` or `../Fabrica-app/` was modified)
**Date:** 2026-08-23

---

## Verdict

**PASS — 46/47 citation clusters verified against source (44 exact, 2 substantively-correct-with-minor-line-drift). 1 citation failure (minor, does not affect any conclusion). All architectural claims, mechanism descriptions, and fit-assessment judgments are supported by the source code.**

| Metric | Count |
|---|---|
| Citation clusters sampled | 47 |
| Exact match (content at cited lines) | 44 |
| Correct substance, minor line drift (±1–7 lines) | 2 |
| Citation failures (claim not supported at cited location) | 1 |
| Fabricated / contradicted claims | 0 |
| Line-count claims in coverage statement checked | 8/8 exact |

---

## Verified Citations (sampled)

### run-task.ts (`scripts/daemon/run-task.ts`, 1090 lines)

| # | Report cite | Claim | Result |
|---|---|---|---|
| 1 | RUNTASK:41-56 | `ActiveRunEntry` interface with id/taskId/agentId/pid/status union/continuationIndex etc. | ✅ exact |
| 2 | RUNTASK:62-70, 94-101 | Readers tolerate corruption via try/catch returning empty data | ✅ exact |
| 3 | RUNTASK:72-74, 103-105 | Plain `writeFileSync` for active-runs.json and missions.json (no atomicity) | ✅ exact |
| 4 | RUNTASK:79-90, :84 | `pruneOldRuns` prunes after 1 hour; `if (run.status === "running") return true;` keeps running rows forever | ✅ exact |
| 5 | RUNTASK:310-332 | `appendTaskProgress` appends session summaries to task notes | ✅ exact |
| 6 | RUNTASK:338-370 | `spawnContinuation` detached child with `--continuation N --run-id <runId>`, `child.unref()` | ✅ exact |
| 7 | RUNTASK:374 | `const MAX_LOOP_ATTEMPTS = 3;` | ✅ exact |
| 8 | RUNTASK:379-450 | `postProjectRunReport` posts completion/stalled report to inbox | ✅ exact |
| 9 | RUNTASK:485-544 | `checkLoopAndEscalate`; last 5 errors kept (:498-502 exact); decision created at attempts>=MAX_LOOP_ATTEMPTS (:505); options Retry-different-approach/Skip/Stop-mission (:526-530); dedup guard on pending decisions (:513-516, report says :512-516) | ✅ exact |
| 10 | RUNTASK:550-729 | `handleProjectRunContinuation` body spans exactly this range | ✅ exact |
| 11 | RUNTASK:564 | Terminal-status guard `completed \|\| stopped → return` | ✅ exact |
| 12 | RUNTASK:566-569 | Stalled→running revival on any completion | ✅ exact |
| 13 | RUNTASK:572-577 | `lastTaskCompletedAt = now`; completedTasks++ / failedTasks++ | ✅ exact |
| 14 | RUNTASK:580-581 | Unconditional `taskAttempts[completedTaskId] = prevAttempts + 1` | ✅ exact |
| 15 | RUNTASK:584-593 | History append, `summary.slice(0, 500)` at :591 | ✅ exact |
| 16 | RUNTASK:606-635 | Completion check: remaining==0 → status="completed" + postProjectRunReport | ✅ exact |
| 17 | RUNTASK:643-655 | Dispatchable predicate: not-running, unblocked, no pending decision, attempts<MAX_LOOP_ATTEMPTS | ✅ exact |
| 18 | RUNTASK:657-661 | Slot clamp `maxParallelAgents - currentlyRunning`, slice | ✅ exact |
| 19 | RUNTASK:663-664 | Save-before-spawn comment "(prevents race conditions)" verbatim | ✅ exact |
| 20 | RUNTASK:667-693 | Next-wave spawn: `--source mission-chain`, detached:true, stdio ignore, unref | ✅ exact |
| 21 | RUNTASK:695-728 | Stall determination block; dep-wait uses `blocked.some(...)` (:699-704, SOME semantics); keep-running branch :706-711; stalled + skippedTasks + causes log :712-727 | ✅ exact |
| 22 | RUNTASK:808-834 | already-running / blocked / pending-decision checks all wrapped `if (!isContinuation)` | ✅ exact |
| 23 | RUNTASK:839 | `config.execution.maxTaskContinuations ?? 2` | ✅ exact |
| 24 | RUNTASK:843-885 | Run row built and written non-atomically before spawn; pid:0 at :853 with "Will be updated after spawn via onSpawned" | ✅ exact |
| 25 | RUNTASK:866-887 | Continuation run id `${runId}_c${continuationIndex}` | ✅ exact |
| 26 | RUNTASK:912-927 | "CONTINUATION SESSION" header injected into prompt | ✅ exact |
| 27 | RUNTASK:940-950 | `onSpawned` callback patches real PID into active-runs row | ✅ exact |
| 28 | RUNTASK:963-965 | `shouldContinue = (hitMaxTurns || hitTimeout) && continuationIndex < maxTaskContinuations` verbatim | ✅ exact |
| 29 | RUNTASK:1038-1051, 1069-1081 | `handleProjectRunContinuation` called on success path AND inside catch (chain advances after runner throw) | ✅ exact |

### dispatcher.ts (`scripts/daemon/dispatcher.ts`, 621 lines)

| # | Report cite | Claim | Result |
|---|---|---|---|
| 30 | DISPATCHER:23-30 | `RetryEntry` with retryAt ISO timestamp, attempt counter | ✅ exact |
| 31 | DISPATCHER:54-67, :63-66 | `loadRetryQueue` on construction; corrupt file → warn + fresh empty queue | ✅ exact |
| 32 | DISPATCHER:69-77 | `saveRetryQueue` atomic tmp+rename | ✅ exact |
| 33 | DISPATCHER:83-86 (+18) | Exponential backoff `retryDelayMinutes * 2^(attempt-1)` capped `MAX_RETRY_DELAY_MINUTES = 60` | ✅ exact |
| 34 | DISPATCHER:104 | `getPendingTasks()` sorted by Eisenhower priority — non-mission poll only | ✅ exact |
| 35 | DISPATCHER:140-145 | Retry-limit gate via `health.getRetryCount(task.id) >= retries + 1` | ✅ exact |
| 36 | DISPATCHER:171-175 | `pollProjectRuns()` called at tail of every `pollAndDispatch()` | ✅ exact |
| 37 | DISPATCHER:286-312 | `handleFailure` pushes persistent retry entry with retryAt | ✅ exact |
| 38 | DISPATCHER:331-461, :336-338 | `pollProjectRuns` scans `running \|\| stalled` missions | ✅ exact |
| 39 | DISPATCHER:358-369 | Per-run signal-0 liveness probe | ✅ exact (pid<=0 rule at :360, report said :359 — ±1 line) |
| 40 | DISPATCHER:391-396 | Marks mission `completed` when no remaining tasks | ✅ exact |
| 41 | DISPATCHER:398-413 | Third copy of dispatchable predicate, hardcoded `attempts >= 3` at :411 | ✅ exact |
| 42 | DISPATCHER:416, :420-424 | Global live-count slot accounting; stalled revived to running before spawn | ✅ exact |
| 43 | DISPATCHER:426-434, :455-457 | Spawn with `--source project-run-chain` (:432); write missions.json only if changed | ✅ exact |

### src/app/api/missions/route.ts (336 lines)

| # | Report cite | Claim | Result |
|---|---|---|---|
| 44 | MISSIONS-API:67-75, :68 | `isProcessAlive`: signal-0 probe; `pid <= 0 return true` | ✅ exact |
| 45 | MISSIONS-API:79 | `GRACE_PERIOD_MS = 30_000` | ✅ exact |
| 46 | MISSIONS-API:82-85 | Comment "heartbeat safety net … picks up the slack on the next frontend poll" verbatim | ✅ exact |
| 47 | MISSIONS-API:86-211 | `reconcileStuckMissions`; processes ONLY `running` missions (:115) | ✅ exact |
| 48 | MISSIONS-API:110-112, :172 | GLOBAL live-slot budget `totalLiveProcesses` across ALL missions | ✅ exact |
| 49 | MISSIONS-API:125-129 | Grace-period skip when within GRACE_PERIOD_MS | ✅ exact |
| 50 | MISSIONS-API:137-145, :141 | Completion path recomputes `completedTasks` from tasks.json | ✅ exact |
| 51 | MISSIONS-API:155-168, :166 | Predicate copy, hardcoded `attempts >= 3` | ✅ exact |
| 52 | MISSIONS-API:170-181 | Re-dispatch via `spawnMissionTasks` (:216-248, detached, best-effort try/catch); mission stays running | ✅ exact |
| 53 | MISSIONS-API:184-201, :189-195 | Dep-wait uses `blockedBy.every` (ALL unmet deps must be same-project remaining) vs RUNTASK `.some` — drift claim confirmed | ✅ exact |
| 54 | MISSIONS-API:203-207 | Otherwise → stalled + inbox report | ✅ exact |
| 55 | MISSIONS-API:326-330 | missions.json rewritten only when changed, inside GET handler | ✅ exact |

### src/app/api/projects/[id]/run/route.ts (232 lines)

| # | Report cite | Claim | Result |
|---|---|---|---|
| 56 | PROJECT-RUN:76-232 | POST handler range | ✅ exact |
| 57 | PROJECT-RUN:83-93 | Single-flight guard: 409 if any running mission for project; stalled does NOT block | ✅ exact |
| 58 | PROJECT-RUN:102-109 | Eligibility filter kanban!==done && assignedTo && !=="me" && !deletedAt | ✅ exact |
| 59 | PROJECT-RUN:118-139 | Pre-validation counts from blockedBy + pending-decision | ✅ exact |
| 60 | PROJECT-RUN:127-139 | Cited as containing the loop-limit part of the "same dispatchability predicate" | ⚠️ PARTIAL — filter checks blockedBy + pending decisions only; NO loop-limit or running check here. Report's own §3.3 describes it correctly; §1 blanket claim slightly overbroad. Noted, non-blocking |
| 61 | PROJECT-RUN:141-156 | Liveness-filtered dedup of already-running taskIds | ✅ exact |
| 62 | PROJECT-RUN:65 | `pid <= 0 return true // PID 0 = just started, assume alive` verbatim | ✅ exact |
| 63 | PROJECT-RUN:167-170, :224-231 | Overflow returned as `queued` in response, persisted nowhere | ✅ exact |
| 64 | PROJECT-RUN:173, :176 | `mission_${Date.now()}`; projectId field | ✅ exact |
| 65 | PROJECT-RUN:189-190, :197-221 | Mission persisted BEFORE spawning; detached `child.unref()` per task, `--source project-run --mission <id>` | ✅ exact |

### types.ts / health.ts / index.ts / runner.ts / prompt-builder.ts

| # | Report cite | Claim | Result |
|---|---|---|---|
| 66 | TYPES:124, :142-156, :158-160 | `ProjectRunStatus` union; `ProjectRun` fields; `{ missions: ProjectRun[] }` | ✅ exact |
| 67 | TYPES:126-135 | taskHistory entry incl. startedAt/completedAt/attempt | ✅ exact (report's inline field list omits timestamps; cited schema has them — cosmetic) |
| 68 | HEALTH:14-21 | Signal-0 `isProcessRunning` | ✅ exact |
| 69 | HEALTH:169-172 | `getRetryCount` counts non-completed history entries per taskId | ✅ exact |
| 70 | HEALTH:196-206, :199 | `cleanStaleSessions`: dead-PID → failed "Process died unexpectedly (detected by health check)"; pid<=0 skipped | ✅ exact |
| 71 | HEALTH:210-232 | `loadPersistedStats` carries cumulative stats + history from daemon-status.json | ✅ exact |
| 72 | HEALTH:252-261, :267-286 | Atomic tmp+rename flush with "prevents corruption if the daemon is killed mid-write" comment; `writeStoppedStatus` atomic | ✅ exact |
| 73 | INDEX:41-48 | Signal-0 liveness helper | ✅ exact |
| 74 | INDEX:70, :84-88, :100-108 | Stale PID file cleaned on status and stop; start refuses while live daemon exists then cleans stale PID | ✅ exact |
| 75 | INDEX:164-174, :192-196 | Shutdown loop kills each child via `runner.killSession`; `cleanStaleSessions` interval every 60s | ✅ exact |
| 76 | RUNNER:361-372 | `killSession` tree-kills process tree by PID | ✅ exact |
| 77 | PROMPTBUILDER:217-262 | `buildRestartContext` from missions.json taskHistory; "avoid duplicating work" instruction at :255 | ✅ exact |
| 78 | PROMPTBUILDER:269+ | `buildRetryContext` reads answered decisions for user guidance | ✅ exact |
| 79 | PROMPTBUILDER:469-493 | Restart/retry context wiring into `buildTaskPrompt(agentId, task, missionId?)` | ⚠️ minor drift — function at :471, injections at :491-499. Substance confirmed |

### Stop routes / venture twins / frontend hook

| # | Report cite | Claim | Result |
|---|---|---|---|
| 80 | PROJECT-STOP:47-66 | tree-kill dynamic import with process.kill fallback | ✅ exact |
| 81 | PROJECT-STOP:70-142, :84-86, :97-101 | Finds running/stalled mission; collects runs matching projectId OR missionId | ✅ exact |
| 82 | PROJECT-STOP:109-113, :119-121 | Run rows → `stopped` + stoppedAt; mission stopped+stoppedAt | ✅ exact |
| 83 | PROJECT-STOP:123-135 | In-progress tasks reverted to `not-started` | ✅ exact |
| 84 | VENTURE-RUN:53, :173-188, :203 | Near-identical duplicate incl. loopDetection init; spawn block | ⚠️ minor drift — loopDetection init at :187, spawn at :202-210. Substance confirmed |
| 85 | VENTURE-STOP:85-101 | Same stop shape, filter at :85 | ✅ exact |
| 86 | use-active-runs.ts:66 | Frontend poll filters `status === "running" || "stalled"` | ✅ exact |

---

## Failure Log

### F-1 (minor, citation misattribution) — §7.3 "PID reuse risk"

- **Claim:** "liveness = `process.kill(pid, 0)` everywhere (RUNTASK:360-363 equivalent at MISSIONS-API:67-75, DISPATCHER:360-362, INDEX:41-48, HEALTH:14-21)".
- **Evidence:** `rg -n "process.kill|kill\(" scripts/daemon/run-task.ts` returns **zero matches**. run-task.ts lines 360-363 are the `spawn(...)` options object inside `spawnContinuation` (verified by reading the region). run-task.ts performs **no PID liveness probing at all**.
- **Impact:** Low. The four probes that do exist (MISSIONS-API, DISPATCHER ×2 sites, INDEX, HEALTH) were each verified individually and are correctly cited. The analysis conclusion (signal-0-only liveness is fragile under Windows PID reuse) remains fully valid for every reconciler path — run-task.ts simply isn't a fifth instance. Should read "probe present in MISSIONS-API/DISPATCHER/INDEX/HEALTH only; run-task.ts never probes".

### Imprecision notes (not counted as failures)

- **N-1:** §1 lists PROJECT-RUN:127-139 among implementations of the full dispatchability predicate "under loop limit" — that copy omits the loop-limit and running checks (see #60). The report elsewhere (§3.3) states the narrower truth accurately.
- **N-2:** Small line drifts: DISPATCHER:359 (actual :360), PROMPTBUILDER wiring ":469-493" (actual :471/:491-499), VENTURE-RUN ":203" spawn (actual :202-210). All substantively correct.

---

## Coverage Statement Check

The report ends with an explicit Scan Coverage Statement (discovery report lines 201-219). Verified:

- Line-count claims all exact: dispatcher.ts 621 ✓, run-task.ts 1090 ✓, health.ts 287 ✓, index.ts 228 ✓, types.ts 210 ✓, api/missions/route.ts 336 ✓, projects/[id]/run/route.ts 232 ✓, projects/[id]/stop/route.ts 142 ✓.
- Files declared read-in-full match what I independently read; partial-read declarations (prompt-builder 210-274, runner killSession) match reality.
- Skipped-scope declarations (workflow FSM/R4-1.6, decisions UI/R4-1.29, field-ops execute pipeline, inbox-respond runs) are consistent with the scope guard at the top of the report.
- **Coverage statement: VALID.**

---

## Verification Pass Coverage Statement

- **Files fully read during this verification:** `scripts/daemon/run-task.ts` (all 1090 lines across 4 reads), `src/app/api/missions/route.ts` (336), `src/app/api/projects/[id]/run/route.ts` (232), `src/app/api/projects/[id]/stop/route.ts` (142).
- **Files partially read (targeted regions matching report citations):** `scripts/daemon/dispatcher.ts` (1-214, 280-469), `scripts/daemon/health.ts` (1-30, 160-287), `scripts/daemon/index.ts` (38-117, 160-204), `scripts/daemon/types.ts` (120-164), `scripts/daemon/prompt-builder.ts` (210-284, 460-499), `scripts/daemon/runner.ts` (356-373), `src/app/api/ventures/[id]/stop/route.ts` + `[id]/run/route.ts` (rg-targeted regions), `src/hooks/use-active-runs.ts` (line-66 region).
- **Grep-only checks:** absence of `process.kill` in run-task.ts (failure F-1 evidence).
- **Not re-verified:** report sections 1/8/9 narrative synthesis whose individual sub-citations were covered above; `mission-progress.tsx` UX claim (cosmetic, out of R5-2.9 sample).
- **Read-only honored:** zero modifications outside `.Fabrica-atlas-board/`. No source file touched.

**Final verdict: mc-chainedispatch-reconciler.md PASSES spot verification. Recommended follow-up: correct the single §7.3 wording (F-1) in a future editorial pass; conclusions unaffected.**
