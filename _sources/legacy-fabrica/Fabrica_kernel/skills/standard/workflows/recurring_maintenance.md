# Standard Workflow: Recurring Maintenance

## Overview
The Recurring Maintenance workflow governs missions that run on scheduled intervals or repeat across multiple execution rounds (`rounds.status = true`). It ensures reliable execution of background system checks, health monitoring, backup verifications, and periodic cleanups.

## 1. Round Parameter Governance
When executing a recurring mission, check the following metadata variables:
- **`rounds.status`**: Boolean flag indicating whether round looping is enabled.
- **`rounds.persistent`**: Boolean flag indicating whether the mission repeats indefinitely.
- **`rounds.max`**: Integer specifying the maximum allowed rounds (if `persistent` is `false`).
- **`rounds.current`**: Current active round counter.

## 2. Step-by-Step Maintenance Cycle
1. **Round Initialization**:
   - Verify `rounds.current <= rounds.max` (unless `persistent == true`).
   - Log start timestamp and active round index.
2. **Maintenance Procedure Execution**:
   - Execute target maintenance checklists (e.g., database backup audit, token refresh, stale cache purge).
   - Record quantitative metrics or health status outputs.
3. **Result Logging & State Update**:
   - Register audit report in mission history.
   - If maintenance succeeded without critical errors, increment `rounds.current`.
4. **Loop Evaluation**:
   - If `rounds.current > rounds.max` and `persistent == false`:
     - Set `rounds.status = false` and mark mission as completed.
   - Otherwise:
     - Re-schedule mission for next execution round.
