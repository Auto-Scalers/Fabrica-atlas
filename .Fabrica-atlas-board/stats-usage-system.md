# Stats & Usage — Existing System Reference

> **Focus system #8.** Describes what Fabrica ALREADY has for usage tracking, per-provider stats, and rate-limit monitoring. Companion ideas live in `ideas.md` (section: Stats & Usage).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

Stats & Usage is the observability surface for token/cost consumption per AI provider, with live usage bars and per-provider rate-limit polling. It is the **metering + guardrail** layer across all agent runs.

**How it works:** The Stats & Usage area shows you how much each AI provider (Claude, Codex, etc.) is being used — tokens consumed and cost — with live bars, and it watches each provider's rate limits so you don't get cut off. It is both your dashboard for spend and a guardrail that warns before you hit a provider's ceiling.

## 2. Architecture (what exists)

- **Status bar usage bars** (`fabrica-app-discovery.md:140`); `stats` (27 usage charts per provider) (`fabrica-app-discovery.md:143`).

  **How it works:** A small usage bar lives in the status bar for a constant at-a-glance read, and there are 27 detailed charts breaking down usage for each provider.

- **Components**: `StatsPane`, `UsageOverviewPane`, `UsageBreakdownSection`, `UsageRecentSessionsTable`, `UsageTrackingPaneShell`, `ClaudeUsagePane`/`CodexUsagePane`/`GrokUsagePane`/`OpenCodeUsagePane` (+DailyChart/Details), `StatCard`, `ShareUsageCard`/`ShareUsageButton` (`Fabrica-features.md:427-442`).

  **How it works:** The screen is composed of a stats pane, an overview, a breakdown section, a table of recent sessions, and provider-specific panes (Claude, Codex, Grok, OpenCode) each with a daily chart and details. `StatCard` shows a single metric, and `ShareUsageCard`/`ShareUsageButton` let you share a usage report.

- **Store slices**: `store/slices/stats.ts:15`, `usage-provider-slices.ts:275-297`; IPC `stats:summary`, `${prefix}:getSummary/getDaily` (`fa-ipc-watchers.md:6.2,4.12`).

  **How it works:** Fabrica keeps usage state in dedicated store slices and answers internal requests for a summary or daily breakdown per provider.

- **Rate limits**: `rateLimits` namespace ×10 (`rate-limits.ts`); `rate-limits/` ~33 files — central `RateLimitService` polling per-provider (Claude/Codex/Gemini/Grok/Kimi/MiniMax/OpenCode) (`fa-ipc-watchers.md:163,4.12`).

  **How it works:** A central service continuously polls ten rate-limit namespaces across seven providers to know how close you are to each provider's usage cap, so it can warn or throttle before you're blocked.

- **`usage/`**: provider-agnostic usage record contract (plugin-contributable); `stats/`: local collector, PRs created, 10k event cap (`fabrica-app-discovery.md:128`).

  **How it works:** Usage is recorded in a provider-neutral format that plugins can also contribute to, and the local collector tracks things like pull requests created, capping stored events at 10,000 to bound growth.

- **Slices**: `claude/codex/opencode usage`; `star-nag` gated by stats (`fabrica-app-discovery.md:146,128`).

  **How it works:** Saved state includes per-provider usage (Claude/Codex/OpenCode) and a "star-nag" prompt (a gentle ask to star the project) whose display is decided by your usage stats.

## 3. Reference designs (MC / buzz)

- **[buzz]** Agent Turn Metrics `kind:44200` durable per-turn token-usage; `storage_sweep.rs` hourly S3 usage sweep; owner-scoped encrypted telemetry frames (`buzz-features.md`).

  **How it works:** buzz records token usage for every single agent turn in a durable, per-turn record, sweeps usage data to storage hourly, and scopes encrypted telemetry to the owner. This durable, per-turn accounting is a pattern Fabrica could add to its usage contract.

- **[MC]** (none comparable — MC integrates only the Claude CLI with NO per-provider token/cost accounting, no 429/backoff enforcement; explicit gap vs Fabrica.)

  **How it works:** Mission Control only connects to the Claude CLI and does not track per-provider token cost or enforce rate-limit backoffs — so Fabrica is actually ahead of MC here, and there is nothing from MC to adopt.

## 4. Hard constraint

Preserve every existing stats/usage feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
