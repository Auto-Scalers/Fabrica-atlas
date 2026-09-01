# Atlas Consolidated Risk Register (R5-3.3)

> ATLAS R5-3.3 | Group 3 synthesis | 2026-08-23
>
> ONE consolidated, prioritized register merging every Atlas-project risk register produced so
> far: integration-map section 6 (R1-R10), digest Closure Addendum risks (A3 verification debt,
> rebrand hard-break register, Note N5, corrections CA-1..CA-3), WSL Windows-primary register
> (12 items), telemetry identity-leak register (11 items), decision-gate fix register (W1-W11).
> Every row carries severity, source-register lineage (dedupe map), key evidence anchors, and a
> mitigation citing evidence paths. No new source scanning was performed this session; all claims
> are inherited from previously written board reports, most of which carry independent
> spot-verification PASSes (status noted per source below).

## Sources merged

| Source register | Items ingested | Verification status of source |
|---|---|---|
| `analysis/agent-platform-integration-map.md` section 6 (R1-R10) | 10 integration risks | Built from 5 reports all spot-verified PASS ("R5 wave-2") |
| `analysis/round4-findings-digest.md` Closure Addendum (A1-A5) | A3 unverified-input risks; rebrand hard-break register (:243); Note N5; corrections CA-1..CA-3 | Addendum cites wave-2/3 verify PASSes (`round4-findings-digest.md:207-231`) |
| `discovery/fabrica-app/fa-wsl-remote-execution.md` section 12 (items 1-12) | 12 Windows-primary risks | HYG-ONLY - no factual spot pass yet (itself tracked as AR-P1-17) |
| `discovery/fabrica-app/fa-telemetry-consent.md` section 11 (items 1-11) | 11 identity-leak risks | Verified PASS ("R4 wave-4") |
| `discovery/mission-control/mc-decision-gates.md` section 9 (W1-W11) | 11 decision-gate defects | Verified PASS ("R4 wave-7") |

## Severity definitions

- **P0** - Security, data-loss, or product-breaking failure that MUST be addressed at/before the
  foundation phase of any transformation; for port-defects (W-register), MUST be fixed while
  porting - shipping the MC pattern as-is is unacceptable.
- **P1** - Materially raises cost/risk of the transformation or of fleet-supervision features;
  schedule into the relevant capability phase; design decisions needed NOW.
- **P2** - Hygiene, cosmetics, bounded edge cases, or process debt; track and batch-fix; must not
  gate anything.

## Dedupe map (what merged into what)

1. Integration-map R1 (channel-string rename blast radius) MERGED WITH telemetry T-7
   (consent-reason literals crossing IPC need atomic rename across shared type / main producers /
   renderer validators / i18n keys / tests) - same failure class: brand strings synchronized
   across layers. -> AR-P1-1.
2. Telemetry T-4 (`FABRICA_channel` wire-visible prop on every event + bundle header) folded into
   the safeStorage/brand-literal hard-break cluster from the digest's rebrand register - both are
   "brand string baked into persisted/wire formats". -> AR-P0-2.
3. Integration-map R6 (passive staleness + fail-open) CROSS-LINKS to section-7 gaps M5/M9
   (readiness-gated spawn, live-presence plumbing); kept as one risk row plus one gap row.
   -> AR-P1-3 and AR-P1-7.
4. Telemetry T-1 (hardcoded old-brand feedback endpoint) stays standalone P0 - distinct
   consequence class (external data POST to a domain the new product does not control).
   -> AR-P0-1.
5. WSL register item 5 (unrestricted rm -rf without approvedRoots) stays standalone P0.
   -> AR-P0-3.
6. Digest A3 "three never-landed Round 4 reports" risk is RETIRED as of 2026-08-23:
   fa-auth-onboarding landed + verified ("R5 wave-1-a"),
   bz-voice-media landed + verified (same pass), mc-ui-frontend rewritten + verified
   ("R5 wave-1-b"). See Retired section.
7. `analysis/cross-project-notes-r5.md` FA-N15 (dual-domain fix-before-port, 9 gaps) overlaps
   W-register themes (Date.now() collision, circuit-breaker-only enforcement); the W-register is
   the authoritative decision-gate subset consolidated here; FA-N15 remains scoped to the
   field-task domain in its own file and is NOT duplicated row-by-row.
8. Corrections CA-1/CA-2/CA-3 consolidated into one data-hygiene row. -> AR-P2-18.

Totals after merge/dedupe: 41 rows - 5 x P0, 17 x P1, 19 x P2.

---

## P0 - Foundation-phase blockers

| ID | Risk | Merged from | Key evidence | Mitigation |
|---|---|---|---|---|
| AR-P0-1 | Crash-report/feedback submissions POST to OLD brand domain `https://www.onfabrica.dev/v1/feedback` (hardcoded; sibling host `api.onfabrica.dev` also referenced). Post-rebrand this leaks user crash content + optional GitHub identity fields to a domain outside new-product control. | telemetry S11 #1 | `feedback.ts:17`, comment `feedback.ts:332-333` (`fa-telemetry-consent.md:333`) | Repoint endpoint or add server-side redirect before any rebrand ships; sweep for sibling-host references (`fa-telemetry-consent.md` section 11 #1 action) |
| AR-P0-2 | Rebrand hard-break cluster: renaming the "<app> Safe Storage" service makes ALL safeStorage ciphertext undecryptable; Chromium partition `persist:FABRICA-browser` orphans browser data; persisted literal `'FABRICA-first'` (`shared/constants.ts:288`); `FABRICA_channel` prop rides every telemetry event + diagnostic bundle header; ~130 `FABRICA_*` env vars; hook bundles named 'FABRICA-status' across agent homes. | digest rebrand register :243 + telemetry T-4 | `fa-settings-config-datadirs.md:286-298`; `client.ts:62`; `bundle.ts:48,84`; `telemetry-events.ts:1647` | Adopt FA-T14 verbatim: keep on-disk filenames/partition strings unchanged (opaque identifiers), change display surfaces only (`fa-settings-config-datadirs.md:308-309`; `round4-findings-digest.md:279`) |
| AR-P0-3 | Unrestricted in-guest destructive delete: `shell.trashItem` cannot recycle UNC items, so WSL deletes are true `rm -rf -- <linuxPath>`; containment/race protection exists ONLY when caller supplies `approvedRoots`. Any future caller omitting it gets an unrestricted delete inside the distro. | WSL #5 | `wsl-unc-delete.ts:43-61` (`fa-wsl-remote-execution.md:255`) | Make `approvedRoots` compile-time required (type-level), add lint/test asserting every call site supplies it (`fa-wsl-remote-execution.md` section 6) |
| AR-P0-4 | PORT-BLOCKER (decision gates): zero auth/authorization on any `/api/decisions*` endpoint - any local HTTP caller can list/create/answer/delete decisions. Porting decisions.json as-is lets any local process steer or erase agent-control flow. | W1 | `route.ts:7-141`, no auth middleware (`mc-decision-gates.md:218`) | Bind decision flow to FA's audited IPC boundary behind trust enforcement instead of open local HTTP; report verdict: "fix W1/W2/W5-class issues before porting" (`mc-decision-gates.md:234`) |
| AR-P0-5 | PORT-BLOCKER (decision gates): cross-process write race on decisions.json - daemon scripts write raw synchronous `writeFileSync` while Next.js API guards with async-mutex; interleaved read-modify-write cycles silently LOSE decision records. | W2 | `run-task.ts:538` vs `data.ts:353-356,:184`; CLAUDE.md warning (`mc-decision-gates.md:60,:219`) | Replace file+mutex storage with transactional store (SQLite via FA IPC per digest FA-T4), keeping JSON schema shape (`mc-decision-gates.md:246`) |

---

## P1 - Capability-phase material risks

| ID | Risk | Merged from | Key evidence | Mitigation |
|---|---|---|---|---|
| AR-P1-1 | Multi-layer string-rename blast radius: channel strings live simultaneously in 65 main files, 656 preload sites, ~78 renderer namespaces; consent-reason literals (`'FABRICA_disabled'`, `'FABRICA_telemetry_disabled'`) cross shared type -> main -> renderer validators -> i18n -> tests. Any namespace/literal rename is a coordinated multi-layer migration. | R1 + telemetry T-7 | survey anchors (`agent-platform-integration-map.md:216`); `telemetry-consent-types.ts:15`; `index.ts:72`; `api-types.ts:797` (`fa-telemetry-consent.md:339`) | Never rename live channel strings; alias/version instead; collapse the 14 copy-paste `agentHooks:*Status` handlers FIRST to shrink the surface (`cross-project-notes-r4.md:59`; FA-T11 friction) |
| AR-P1-2 | Watcher stack is load-bearing AND Fabrica-exclusive among the three repos: crash isolation, canary deadlock detector, crash fuses, removal fencing, remote intent persistence must survive ANY framework change verbatim; highest preservation risk in the codebase. | R9 + digest C9 warning | `fa-ipc-watchers.md:407`; `parcel-watcher-process-entry.ts:1-6`; `parcel-watcher-crash-fuse.ts:1-2` (`agent-platform-integration-map.md:232`) | Fence the watcher stack out of refactor scopes; preservation checklist `fa-ipc-watchers.md` section 8.3; treat as frozen subsystem in rebrand plan |
| AR-P1-3 | Supervision-semantics mismatch: agent liveness = passive 30-min TTL decay + fail-open 204 responses - right for never-blocking-the-CLI, wrong for supervision (no positive liveness; supervisor cannot distinguish slow/dead/gone). | R6 | hooks section 5.2/section 7 (`agent-platform-integration-map.md:226`) | Port buzz heartbeat-scaled presence TTL (= 3x heartbeat, `presence.rs:15-16`) + refcount topic manager (FA-T16, `round4-findings-digest.md:281`) |
| AR-P1-4 | Plugin sandbox honesty vs autonomous agents: post-`activate()` plugin code holds raw Node power in-process; sandbox constrains only host-mediated access. Host API has NO exec/spawn/fs method - agent packages will demand one; design the audited-exec primitive NOW before `terminal.sendText` fossilizes as de-facto. | R4 | plugin S1 honesty note, S4.7, S12.5a/b (`agent-platform-integration-map.md:222`) | Close the four documented plugin gaps (restricted runtime mode, audited exec primitive, event-set growth policy, version handshake) before promising third-party agent packages (`cross-project-notes-r4.md` FA-N3) |
| AR-P1-5 | Hook-token impersonation surface: `FABRICA_AGENT_HOOK_TOKEN` readable by anything spawned in the pane; loopback bind mitigates exposure but not secrecy from the agent itself. Acceptable today (disposition gates on launch tokens); becomes spoofing vector once spend/actions hang off status feeds. | R5 | hooks section 10.4 (`agent-platform-integration-map.md:224`) | Before wiring spend/actions to hook-status feeds, rotate per-pane tokens and bind them to process identity rather than env inheritance |
| AR-P1-6 | Single-file concentration at two chokepoints: `ipc/pty.ts` (7,745 lines) and `main/agent-hooks/server.ts` (2,907 lines); every new provider/fleet behavior lands exactly there - merge-conflict and regression hotspots for all planned fleet work. | R2 | pty section 1; hooks section 10.3 header note (`agent-platform-integration-map.md:218`) | FA-T1 refactor: move per-provider parsers/quirks into profile-owned modules while collapsing handlers (`cross-project-notes-r4.md:60`) |
| AR-P1-7 | Missing supervision layer above the substrate (M1-M9): no approval-gated autonomy (M1), decision-gate escalation (M2), durable run/task persistence (M3), persistent retry queue + concurrency slots (M4), readiness-gated spawn/orphan sweep/restart policy (M5), usage/cost ledger with budgets (M6), alerting depth (M7), searchable archive (M8), live-presence plumbing (M9). Dependency order: M1 -> M2 -> M3/M4; M5/M6/M9 harden single-host fleet first. | integration-map section 7 (gap register feeding risk) | table at `agent-platform-integration-map.md:242-252`; sequencing note :254 | Implement in dependency order per FA-N10 (`cross-project-notes-r4.md`); blueprints cited per-row in the integration map table |
| AR-P1-8 | WSL command-escaping regression hazard: `$`-preprocessing by wsl.exe argv is defended by TWO layers (base64 wrapping for scripts, backslash-escaping for sh -c). Any new code hand-building `wsl.exe ... bash -c ...` strings breaks on paths/commands containing `$` - "the single easiest regression to introduce". | WSL #3 | `wsl-bash-command.ts:6-11`; `shared/wsl-login-shell-command.ts:5-18` (`fa-wsl-remote-execution.md:253`) | Mandate the two helpers for ALL cross-boundary commands; lint rule banning raw `wsl.exe` argv construction (`fa-wsl-remote-execution.md` section 3) |
| AR-P1-9 | WSLENV allowlist is load-bearing: env vars silently do NOT cross into WSL unless registered with correct /u vs /p flag; new `FABRICA_*` vars intended for guest agents will be empty inside WSL while working on host. | WSL #4 | `hooks.ts:705-707`; `pty/wsl-fabrica-env.ts` (`fa-wsl-remote-execution.md:254`) | Every new guest-facing env var must be registered in `pty/wsl-fabrica-env.ts` as part of its definition (checklist item, not afterthought) |
| AR-P1-10 | 9P treated as hostile: Win32 stat/watch over `\\wsl.localhost` lies or stalls; directory-existence checks, file watching, rg availability, git capability caches all carry WSL-specific fallbacks. Any feature doing plain fs calls against WSL UNCs inherits those failure modes. | WSL #7 | `wsl.ts:72-102`; `ipc/filesystem-watcher-wsl.ts`; `ipc/filesystem-list-files.ts:46-66` (`fa-wsl-remote-execution.md:257`) | Reuse the existing fallback layer for any new UNC-touching feature; forbid direct fs.watch/stat on `\\wsl.localhost` paths (`fa-wsl-remote-execution.md` section 8) |
| AR-P1-11 | Repair states gate terminals and hooks, not just UI: a project pinned to a missing distro throws BEFORE terminal spawn and hooks derive distro from repair state - a Windows user uninstalling a distro gets hard failures in the exact surfaces used most. | WSL #2 | `shared/local-windows-terminal-runtime.ts:46-50`; `hooks.ts:371-382` (`fa-wsl-remote-execution.md:252`) | Graceful degradation path: prompt-to-repair instead of pre-spawn throw; surface repair state in terminal UI (`fa-wsl-remote-execution.md` sections 1/5) |
| AR-P1-12 | Agent auth state lives per-runtime AND per-distro: account selection keys include runtime+distro; managed Claude auth stored inside target distro under Fabrica's path with inode-verified containment. Deleting/reinstalling a distro silently invalidates accounts whose auth lived there. | WSL #10 | `shared/codex-selection-lane.ts`; `claude-accounts/service.ts:927-998` (`fa-wsl-remote-execution.md:260`) | Detect distro recreation and prompt re-auth proactively; document auth locality in account UI (`fa-wsl-remote-execution.md` section 9) |
| AR-P1-13 | Decision consumption semantics absent (MC): answered decisions re-inject into EVERY future run of the task forever - stale guidance can poison unrelated retries; only latest answer injected (earlier answered decisions ignored). | W5 + W4 | `prompt-builder.ts:287-297,:497-499` (`mc-decision-gates.md:221-222`) | Mark decisions `applied` after first injection or scope injection to immediately-next attempt (W5 fix); inject full ordered answer chain (W4 fix) (`mc-decision-gates.md:247`) |
| AR-P1-14 | Unbounded decision churn under persistent failure: duplicate-guard checks only `pending`, so each answer cycle followed by 3 more failures mints a NEW decision - queue floods under looping agents. | W7 | `run-task.ts:512-516 + :504-505` (`mc-decision-gates.md:225`) | Dedupe escalations across FULL history, not just pending set (`mc-decision-gates.md:250`) |
| AR-P1-15 | No TTL/aging on pending decisions: tasks block indefinitely on `status==="pending"`; recovery requires manual UI action or script - pairs with MC's own missing approval-aging escalation (digest A2 negatives). | W9 | enforcement points keyed off pending only, e.g. `prompt-builder.ts:579` (`mc-decision-gates.md:226`) | Enumerate statuses incl. real `dismissed/expired` with defined semantics + aging escalation timer (`mc-decision-gates.md:249`; `round4-findings-digest.md:278`) |
| AR-P1-16 | Verification debt on register inputs: `mc-adapters-linelevel.md` (basis of G5/G6/parts of G7/FA-T2/FA-T5), `fa-pty-terminal.md` (basis of C1-C5/C8/FA-T3), `fa-wsl-remote-execution.md` are HYG-ONLY; `bz-pair-relay-cli.md` fully unverified. Claims resting solely on these back committed roadmap recommendations without independent factual spot passes. | digest A3 table (:260-271) | `round4-findings-digest.md:264-269`; aggregate record ~500+ cites, 0 FAILED (:271) | Authorize factual spot passes (12+ cites each, Note N1 pattern `round4-findings-digest.md:138`) before those findings gate roadmap commitments; until then carry the caveat inline (as exec-summary risk 7 does, `atlas-executive-summary.md:106`) |
| AR-P1-17 | Telemetry compile-time constant rename sync: `FABRICA_BUILD_IDENTITY`, `FABRICA_POSTHOG_WRITE_KEY`, `FABRICA_DIAGNOSTICS_TOKEN_URL` + CI secret names + ambient decls must move in lockstep across vite define, d.ts, GH Actions secrets, verify-script regexes (verify script greps source shape). | telemetry T-5 | `electron.vite.config.ts:45-59,274-282`; `build-constants.d.ts:12-22`; `config/scripts/verify-telemetry-constants.mjs:1-27` (`fa-telemetry-consent.md:337`) | Single source-of-truth constant module + generated CI secret names; keep verify script regexes data-driven from it (`fa-telemetry-consent.md` section 11 #5) |
---

## P2 - Hygiene, edge cases, process debt

| ID | Risk | Merged from | Key evidence | Mitigation |
|---|---|---|---|---|
| AR-P2-1 | Provider-addition boilerplate >= 6 files (types union, TUI config row, service dir, 4 registry arrays, IPC handlers, preload, web stub) - measured; unscaled this is the growth ceiling of the observe plane. | R3 | hooks section 10.2 (`agent-platform-integration-map.md:220`) | FA-T1 SpawnSpec collapse turns provider-add into catalog-row-only change (`round4-findings-digest.md:124`) |
| AR-P2-2 | Dead surface: `agentHooks:*Status` channels have no desktop-renderer consumer - CLI/diagnostics only; any fleet UI wiring them inherits a channel family nobody exercises end-to-end. | R7 | hooks section 10.1 (`agent-platform-integration-map.md:228`) | E2E-test the family before first UI consumer ships |
| AR-P2-3 | Palette blind spot: no generic palette-open/execute analytics event; agent catalog + quick commands absent from Cmd+J; slash-command control confined to native chat - operators cannot discover the agent fleet from the primary control surface. | R8 | palette section 9 row 7 (`agent-platform-integration-map.md:230`); verified gap (`cross-project-notes-r4.md:119`) | Wire `searchTerminalQuickCommands` + TUI-agent catalog into palette results (FA-N4 seam) |
| AR-P2-4 | Pane-authority evolution: ownership arbitration between local PTY ids and runtime terminal handles is recent machinery; multi-writer agent orchestration will stress it (anti-redirect invariant already shows known failure mode). | R10 | `agent-pane-authority-ownership.ts`; ipc section 4.12 (`agent-platform-integration-map.md:234`) | Multi-writer stress tests before agent-orchestration features land on panes |
| AR-P2-5 | Sync wsl.exe probes on main thread still exist: `getWslHome`, `wslUncDirectoryExists`, `listWslDistros`, Codex probe (`execFileSync`) block up to 5 s each on wedged wsl.exe - worktree creation/account switching visibly stall on slow cold-start laptops. | WSL #1 | async-first contrast `ipc/app.ts:261-264`; `codex-accounts/service.ts:1778` (`fa-wsl-remote-execution.md:251`) | Convert remaining sync callers to async probes with timeout |
| AR-P2-6 | WSL worktrees placed INSIDE distro filesystem (`~/FABRICA/workspaces`): invisible to Windows backup tools scanning C:\; users find them only via UNC paths. | WSL #6 | `ipc/worktree-logic.ts:90-128` (`fa-wsl-remote-execution.md:256`) | Document placement + host-side backup guidance in worktree UI |
| AR-P2-7 | Linked worktrees spanning filesystems route to HOST git with 30 s TTL cache: delete/recreate of such checkouts has bounded staleness window where git ops may take wrong side. | WSL #8 | `git/wsl-linked-worktree-git-routing.ts:8-15` (`fa-wsl-remote-execution.md:258`) | Invalidate routing cache on worktree delete/recreate events |
| AR-P2-8 | gh/glab asymmetry: WSL-only installs (no host gh) lose global gh calls until default-distro override exists - explicit TODO in code. | WSL #9 | `git/runner.ts:232-233` (`fa-wsl-remote-execution.md:259`) | Implement default-distro override for gh/glab fallbacks |
| AR-P2-9 | SSH plane gaps for Windows REMOTES: compile tax (csc.exe must exist on remote for CLI launcher); ProxyJump/ProxyCommand/security-key users forced onto system ssh.exe requiring Windows OpenSSH present. | WSL #11 | `ssh-remote-cli-launcher.ts:182-184`; `ssh-transport-selection.ts:71-113`; `system-ssh-binary.ts:8-9` (`fa-wsl-remote-execution.md:261`) | Pre-flight checks surfacing these requirements before remote connect |
| AR-P2-10 | Ephemeral VMs ride SSH store with reserved ids (`runtime-ssh-`): tooling enumerating SSH targets must keep filtering or VM targets leak into user UIs. | WSL #12 | `shared/execution-host.ts:59-67` (`fa-wsl-remote-execution.md:262`) | Centralize filter in one shared selector; test all target-enumeration surfaces |
| AR-P2-11 | DELETE of decisions is silent: hard delete with no ActivityEvent breaks audit continuity. | W3 | `route.ts:129-141` (`mc-decision-gates.md:139,:220`) | Log an ActivityEvent on delete (`mc-decision-gates.md:250`) |
| AR-P2-12 | Fixed 300 ms delay between answer-write and automatic re-run; slow disk can re-run before gate clears (benign 400, but the re-run-after-answering UX promise can silently fail). | W6 | `decision-dialog.tsx:77-78`; `use-active-runs.ts:147-155` (`mc-decision-gates.md:223`) | Event-driven unblock via FA push channels instead of poll+delay (`mc-decision-gates.md:248`) |
| AR-P2-13 | Schema drift escape hatch: `fix-stuck-tasks.js` writes `status:"dismissed"` invalid per types/Zod - such rows visible nowhere (not pending -> not blocking; not answered -> excluded from retry context AND Answered UI). Records vanish from all views. | W8 | `fix-stuck-tasks.js:26-34` vs `types.ts:301`; `validations.ts:17` (`mc-decision-gates.md:39,:225`) | Real dismissed/expired enum values with defined semantics (shared mitigation with AR-P1-15, `mc-decision-gates.md:249`) |
| AR-P2-14 | `taskId:null` decisions are dead-end data: visible in queue, consumed by nothing. | W10 | decision-gates report sections 4.8-4.9 (`mc-decision-gates.md:227`) | Reject null-task decisions at creation; purge existing dead rows |
| AR-P2-15 | Answer options not enforced: any free string <= 500 chars accepted regardless of offered options - downstream consumers cannot switch on enumerated choices. | W11 | `validations.ts:248` (`mc-decision-gates.md:228`) | Optional strict mode validating answer against offered options when present |
| AR-P2-16 | Telemetry funnel continuity on cutover: brand-prefixed event names (`app_starred_FABRICA`, `FABRICA_cli_feature_tip_*`) break historical PostHog funnels if renamed (registry rule: breaking changes need NEW event names, `telemetry-events.ts:1424`); PostHog project cutover vs install_id stability decides whether cohort history joins across the switch; users can literally search "posthog" in Settings search. | telemetry T-3 + T-9 + T-10 | `telemetry-events.ts:1427,1469-1471,:1556,1573-1575`; `ipc/telemetry.ts:25-30`; `install-id.ts:4-8`; `en.json:8968` (`fa-telemetry-consent.md:335,:341-342`) | Decide continuity-vs-clean-cutover explicitly per event family; keep install_id stable across brand change to preserve cohort joins |
| AR-P2-17 | Telemetry cosmetic/brand surfaces batch: privacy doc URL constant consumed by FirstLaunchBanner + PrivacyPane; env kill-switch names cascade into docs/settings-search/i18n locale strings across 5 languages (keep community-standard DO_NOT_TRACK untouched); on-disk artifact names (`%TEMP%/FABRICA-diagnostic-bundle-previews`, `FABRICA-diagnostics-*.ndjson`); support confirm-dialog copy. | telemetry T-2 + T-6 + T-8 + T-11 | `lib/telemetry.ts:11`; `consent.ts:82-84`; `diagnostics.ts:167,173,198-202`; `en.json:8951-8955` + zh/ja/ko/es equivalents (`fa-telemetry-consent.md:334,:338,:340,:343`) | Batch into the path-migration inventory (merge with R4-1.15 13-item rebrand register per `fa-telemetry-consent.md:345-347`) |
| AR-P2-18 | Digest correction propagation debt: CA-1 mutex registry is 20 entries not 17 (downstream consumers of G4/FA-T4 must use 20); CA-2 C7 picture is 14 managed hook targets vs 18 live `/hook/*` pathnames (not "15+ / 14"); CA-3 stale self-reference cites `discovery/fabrica-app/discovery.md` round3 CA-3 stale self-reference cites `discovery/fabrica-app/ai-vault-browser.md`. Left unedited in digest body per no-content-rewrite rule. | Closure Addendum corrections CA-1..CA-3 | `round4-findings-digest.md:223-230` | All downstream synthesis (incl. this register and the phased roadmap) must consume corrected values; consider one-line errata block at next append-only digest touch |
| AR-P2-19 | buzz admin-web auth is Host-header-equality + Origin match only, no tokens/passwords: fine for localhost compose, NOT for shared deployments - real auth required before any external exposure. | Note N5 (Closure Addendum) | `api/admin/auth.rs:16-40`; `mod.rs:38-60` (`round4-findings-digest.md:251,:288`) | If buzz ops patterns are adopted for Fabrica fleet infra, add token/session auth layer on top (`bz-ops-deploy-admin.md` section admin) |

---

## Retired risks (resolved since their source registers were written)

| Original risk | Source | Resolution evidence |
|---|---|---|
| Three assigned Round 4 discovery reports never landed (fa-auth-onboarding R4-1.13, bz-voice-media R4-1.14, mc-ui-frontend R4-1.22) - master-index section D2 gap | digest A3 (:271); exec-summary risk list (`atlas-executive-summary.md:106`) | ALL THREE landed and verified PASS by Round 5 wave-1: "R5 wave-1-a" (auth-onboarding + voice-media) and "R5 wave-1-b" (ui-frontend rewrite) |

---

## Priority summary

- **P0 (5)**: old-brand feedback endpoint leak; safeStorage/brand-literal hard-break cluster; unrestricted WSL delete without approvedRoots; W1 no-authz decision endpoints (port-blocker); W2 cross-process decisions write race (port-blocker).
- **P1 (17)**: rename blast radius; watcher-stack preservation; supervision-semantics mismatch; plugin sandbox/exec primitive; hook-token spoofing surface; two single-file chokepoints; missing M1-M9 supervision layer; WSL escaping/WSLENV/9P/repair-state/auth-locality hazards (5 rows); decision consumption/churn/aging fixes (3 rows); verification debt on register inputs; telemetry CI-constant rename sync.
- **P2 (19)**: provider boilerplate, dead hook surface, palette blind spot, pane authority, WSL UX/ops edges (6 rows), decision-gate hygiene (5 rows), telemetry cosmetics/funnel continuity (2 rows), correction propagation, buzz admin auth.

Reading order for implementers: P0 rows gate the foundation phase; AR-P1-7 (supervision layer M1-M9) sequences the capability phases via its dependency order (M1 -> M2 -> M3/M4, then M5/M6/M9); P2 batches into hygiene passes between phases.
## Scan-Coverage Statement

**Source registers read this session (targeted section extraction):**

- `analysis/agent-platform-integration-map.md` - lines 214-263 read in full (section 6 R1-R10 + section 7 M1-M9 table + verification notes); header/cross-ref line :12.
- `analysis/round4-findings-digest.md` - Closure Addendum lines 201-295 read in full (A1-A5: verification status, corrections CA-1..CA-3, A2 wave findings incl. rebrand register :243, A3 unverified table, A4 recommendations incl. FA-T14/Note N5); digest body sections 1-5 NOT re-read except via targeted grep hits cited inline (G7 catalog area, FA-T block).
- `discovery/fabrica-app/fa-wsl-remote-execution.md` - section 12 risk register (lines 247-283) read in full including its scan-coverage statement; sections 0-11 not re-read (register items carry their own evidence anchors).
- `discovery/fabrica-app/fa-telemetry-consent.md` - sections 5-7.3 (lines 175-234) and section 11 identity-leak register + coverage statement (lines 329-383) read in full; sections 0-4, 8-10 not re-read this session.
- `discovery/mission-control/mc-decision-gates.md` - W1-W11 fix register (lines 218-250) plus supporting context lines :39, :60, :139, :210, verdict :234 extracted via targeted search; remaining sections not re-read.
- `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` - Checkpoint table + Group 3 task row for R5-3.3 read first per resume protocol.

**Corroborating reads (grep-sampled):** `analysis/atlas-executive-summary.md` (section 3 Top Risks, to align headline set and confirm the merged-register pointer), `analysis/cross-project-notes-r4.md` (FA-N1/N3/N4/N5/N7 areas), `analysis/similarities-gaps.md` (gap-table headings only).

**Not read / out of scope:** all `discovery/` reports other than the two named above (their risks reach this register only through the integration-map/digest synthesis layers); `_sources/` and `Fabrica-app/` source files (no new scanning - every evidence anchor is inherited verbatim from the source registers); `analysis/atlas-phased-roadmap.md` and `analysis/digest-v2-refresh.md` (in flight by other workers at time of writing).

**Known limitations:** (a) WSL-register-derived rows inherit the HYG-ONLY caveat of their source report until its factual spot pass lands (AR-P1-16 tracks exactly this); (b) severity assignments are Atlas-program judgments made this session, not present in any source register; (c) FA-N15 dual-domain gaps intentionally not duplicated (see dedupe map item 7).

**Integrity:** write-only inside `.Fabrica-atlas-board/analysis/`; no files under `_sources/` or `../Fabrica-app/` touched (auditable via git status). File written in 4 chunks (UTF-8, no BOM) per board chunked-write convention.