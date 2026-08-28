# Stats & Usage — Existing System Reference

> **Focus system #8.** Describes what Fabrica ALREADY has for usage tracking, per-provider stats, and rate-limit monitoring. Companion ideas live in `ideas.md` (section: Stats & Usage).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

Stats & Usage is the observability surface for token/cost consumption per AI provider, with live usage bars and per-provider rate-limit polling. It is the **metering + guardrail** layer across all agent runs.

## 2. Architecture (what exists)

- **Status bar usage bars** (`fabrica-app-discovery.md:140`); `stats` (27 usage charts per provider) (`fabrica-app-discovery.md:143`).
- **Components**: `StatsPane`, `UsageOverviewPane`, `UsageBreakdownSection`, `UsageRecentSessionsTable`, `UsageTrackingPaneShell`, `ClaudeUsagePane`/`CodexUsagePane`/`GrokUsagePane`/`OpenCodeUsagePane` (+DailyChart/Details), `StatCard`, `ShareUsageCard`/`ShareUsageButton` (`Fabrica-features.md:427-442`).
- **Store slices**: `store/slices/stats.ts:15`, `usage-provider-slices.ts:275-297`; IPC `stats:summary`, `${prefix}:getSummary/getDaily` (`fa-ipc-watchers.md:6.2,4.12`).
- **Rate limits**: `rateLimits` namespace ×10 (`rate-limits.ts`); `rate-limits/` ~33 files — central `RateLimitService` polling per-provider (Claude/Codex/Gemini/Grok/Kimi/MiniMax/OpenCode) (`fa-ipc-watchers.md:163,4.12`).
- **`usage/`**: provider-agnostic usage record contract (plugin-contributable); `stats/`: local collector, PRs created, 10k event cap (`fabrica-app-discovery.md:128`).
- **Slices**: `claude/codex/opencode usage`; `star-nag` gated by stats (`fabrica-app-discovery.md:146,128`).

## 3. Reference designs (MC / buzz)

- **[buzz]** Agent Turn Metrics `kind:44200` durable per-turn token-usage; `storage_sweep.rs` hourly S3 usage sweep; owner-scoped encrypted telemetry frames (`buzz-features.md`).
- **[MC]** (none comparable — MC integrates only the Claude CLI with NO per-provider token/cost accounting, no 429/backoff enforcement; explicit gap vs Fabrica.)

## 4. Hard constraint

Preserve every existing stats/usage feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
