# Standard Rules: Recurring Round Rules

## Overview
Recurring Round Rules govern automated missions that repeat over scheduled intervals or multiple execution rounds. These rules prevent runaway loops and ensure clean round transitions.

## 1. Round Counter Management
- Each time a recurring mission finishes a round, check `rounds.current` against `rounds.max`.
- Always increment `rounds.current` by `1` upon successful round completion.
- Never reset `rounds.current` to `0` unless explicitly requested by the user.

## 2. Infinite Loop Guardrails
- If `rounds.persistent == true`, the mission repeats indefinitely until manually paused (`rounds.status = false`).
- If `rounds.persistent == false` and `rounds.current >= rounds.max`, the agent must:
  1. Set `rounds.status = false`.
  2. Mark the mission as `COMPLETED`.
  3. Log a final completion notice summarizing all executed rounds.

## 3. Failure Handling in Recurring Rounds
- If an automated maintenance round fails due to a critical error:
  1. Do not increment `rounds.current`.
  2. Log the error details in the mission history.
  3. Notify the operator or pause `rounds.status` if three consecutive failures occur.
