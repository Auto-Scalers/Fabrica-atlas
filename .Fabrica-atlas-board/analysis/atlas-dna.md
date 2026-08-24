# Atlas DNA — What Fabrica IS (first batch after-rebrand)

> **Purpose:** define the non-negotiable core identity of Fabrica — what it does, what it is, what it must never lose. This is the product DNA that every feature, every PR, every decision must align with.
>
> **Source:** 91 tasks, 34 discovery reports, 30+ verification passes across mission-control, buzz, and Fabrica-app. Every claim backed by file:line evidence in the Atlas corpus.
>
> **Scope:** first batch only — the features that ship when Fabrica relaunches. Not the full vision.

---

## 1. What Fabrica IS

**Fabrica is a desktop agent operations platform.** It lets you run, observe, extend, and control AI agent CLIs from a single host — like a control tower for coding agents.

It is NOT:
- A cloud service (runs locally on your machine)
- A code editor (agents write code; Fabrica supervises them)
- A chat interface (agents run as PTY processes, not chat bubbles)
- A fleet manager (v1 is single-host; multi-host is Phase D)

---

## 2. The Five Core Features (non-negotiable)

These are what Fabrica ships with. Every other feature is built ON TOP of these.

### F1 — Agent Execution (the PTY plane)

**What it does:** Spawns agent CLIs as proper terminal processes with identity, lifecycle, and kill semantics.

**Key behaviors:**
- Agents are real PTY processes, not sandboxed wrappers
- Each agent gets a unique identity (`launchAgent`, `incarnationId`, `worktreeId`)
- Kill semantics: graceful → SIGTERM → process-group SIGKILL (production-hardened)
- Agents survive UI restarts via serialize/revive + replay buffers
- Owner-adoption registry prevents duplicate spawns of the same agent

**Anchor:** `src/main/ipc/pty.ts:5790-5825` (spawn args), `local-pty-provider.ts:284-293` (kill semantics)

**Never break:** agents must always be real PTY processes with proper identity and lifecycle.

---

### F2 — Agent Observation (the hooks pipeline)

**What it does:** Receives turn-state events from running agents without polling. You see what every agent is doing — working, blocked, waiting, done — in real time.

**Key behaviors:**
- Loopback HTTP receiver in main process
- 18 live `/hook/<source>` pathnames (14 managed install targets)
- States: working, blocked, waiting, done
- Zero polling — agents push state, UI receives
- Startup replay ensures no events lost during restart

**Anchor:** `src/shared/agent-hook-listener.ts` (18 pathnames), `src/shared/tui-agent-config.ts:49-331` (31-entry config table)

**Never break:** the zero-polling contract. Agents push; Fabrica receives. No polling.

---

### F3 — Operator Control (the palette + keybindings)

**What it does:** One Cmd+J palette that controls everything — launch agents, run commands, navigate worktrees, manage plugins. ~85 actions with dynamic per-agent keybinding families.

**Key behaviors:**
- One palette component (3,153 lines) merging 7 result families
- ~85 base actions + dynamic per-agent/plugin chord families
- Saved agent-prompt quick commands wired end-to-end to the launcher
- Agent catalog + quick commands plumbed but absent from palette (gap to fill)

**Anchor:** `src/main/ipc/pty.ts` (launch engine), `src/shared/tui-agent-config.ts` (agent catalog)

**Never break:** one palette, one keybinding registry, one control surface. No fragmented UIs.

---

### F4 — Extension (the plugin runtime)

**What it does:** Third-party code runs in sandboxed forked Node children with consent-gated host calls and supervised lifecycle.

**Key behaviors:**
- One forked Node child per plugin (`ELECTRON_RUN_AS_NODE=1`)
- Zod-walled protocol both directions
- Ordered denial-code gate: unknown_method → panel_forbidden → consent_required → capability_denied
- Supervised FSM with backoff [500, 2000, 5000]ms, max 3 restarts
- FIFO slot pool capped at 5
- `agents` manifest contributions already reserved

**Anchor:** `src/main/plugin-runtime.ts` (fork model), `src/main/plugin-service.ts:250-272` (host-call chokepoint)

**Never break:** consent gate, slot pool cap, supervised FSM. Plugins must never have raw Node power without going through the chokepoint.

---

### F5 — Distribution (the update backbone)

**What it does:** electron-updater with verified-generic-feed preflight, multiple release channels, dual signing, draft-gated publishing.

**Key behaviors:**
- Channels: stable, rc, hourly, daily, adhoc
- Dual signing: macOS notarization + SignPath Windows
- Update-survival E2E workflow
- Generic feed architecture allows server-side cohort routing

**Anchor:** `src/main/auto-updater.ts` (updater flow), `electron-builder.yml` (packaging)

**Never break:** dual signing, verified feed, draft-gated publishing. Security is not negotiable.

---

## 3. The Supervision Layer (what we're ADDING)

These don't exist yet. They're what the After-Rebrand build adds ON TOP of the five core features.

### S1 — Task Persistence

Replace memory+JSON supervision with SQLite-backed durable runs, tasks, and approvals. Status enums as FSMs, TOCTOU-safe guarded transitions, at-most-once scheduled-fire claims.

**Source pattern:** buzz workflow quartet (`bz-db-schema.md` §E)

---

### S2 — Guard Stack

One ordered execute-guard stack at the IPC boundary (`register-core-handlers.ts:109-234`). Server-side risk table, bypass detection, atomic rate limiters, spend-ladder brake, circuit breaker, owner guard.

**Source pattern:** MC execute guards (`mc-execute-guards.md` §14-§15)

---

### S3 — Decision Gates

Pending decisions freeze dispatch. After N failures, inject structured Retry/Skip/Stop questions. Answers become prompt context.

**Source pattern:** MC decision gates (`mc-decision-gates.md`)

---

### S4 — Fleet Hardening

Provider-neutral runner, readiness-gated spawn, orphan sweep, cost ledger with budgets, operator alerting depth.

**Source patterns:** MC spawn options + buzz managed-agent lifecycle

---

## 4. The Two Standing Rules

These are inviolable. Every feature, every PR, every refactor must respect them.

### Rule 1: Preserve the watcher stack verbatim

The crash-isolated watcher stack (canary deadlock detector, crash fuse 3-per-120s, WSL pollers, SSH intent persistence, removal fencing) is Fabrica-exclusive. Neither MC nor buzz has anything comparable. It is load-bearing. Do not rename, refactor, or "improve" it without a coordinated three-layer migration plan.

**Evidence:** `fa-ipc-watchers.md:407` — "highest-risk subsystem to preserve verbatim"

### Rule 2: Keep on-disk identifiers unchanged

SafeStorage key names, Chromium partition strings, `FABRICA_*` env vars, on-disk artifact names — all stay as-is. Change display surfaces only. Renaming safeStorage keys makes ALL stored ciphertext undecryptable. Renaming partition strings orphans data.

**Evidence:** `fa-settings-config-datadirs.md:286-309` — the rebrand strategy

---

## 5. The Reliability Grammar

Every new subsystem must copy the house reliability grammar already confirmed app-wide:

- **Generation counters** — detect stale state
- **Fail-closed liveness proofs** — never assume alive
- **Atomic claim-rename protocols** — prevent races
- **Env allowlists** — never trust the environment
- **Idempotency ledgers** — safe retries

**Source:** `round3/fabrica-app-main-subsystems.md` closing summary

---

## 6. What We DELIBERATELY Do NOT Build (v1)

- **Multi-host/cluster deployment** — Phase D, not first batch
- **MC's JSON-file persistence** — we use SQLite instead
- **MC's polling-over-HTTP transport** — we keep push IPC
- **Buzz Nostr multi-community tenancy** — not relevant to Fabrica
- **Buzz workflow's unwired approval resume** — port the pattern, not the code

---

## 7. The First Batch Checklist

Before the first batch ships, confirm:

- [ ] Watcher stack frozen as public API
- [ ] IPC channel contract frozen (no renames)
- [ ] Rebrand strategy adopted (keep on-disk identifiers)
- [ ] Palette "Agents" section shipped (B5)
- [ ] Two-domain task model ported (B1.1)
- [ ] Guard stack ported with fix-before-port items (B1.2)
- [ ] Decision gate escalation ported (B2.1)
- [ ] SQLite persistence landed (B2.2)
- [ ] Telemetry leak register cleared (11 items)
- [ ] Zero open red risks

---

_Last updated: 2026-08-23_
_Source: Atlas corpus (91 tasks, 34 discovery reports, 30+ verification passes)_
