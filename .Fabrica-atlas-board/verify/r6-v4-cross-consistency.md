# ATLAS R6-V4 — Cross-Consistency Check: Three Newest Punch-List Reports

> Task: ATLAS R6-V4 (Group 2 verify; task_38d23d8f1e64 / dispatch ctx_b16b56e1fc23).
> Method: full read of the three newest punch-list reports + targeted re-reads of the
> three named prior verified reports + source re-verification of every contested or
> overlapping anchor. READ-ONLY throughout (git status clean outside `.Fabrica-atlas-board/`).

## Reports Under Comparison

| New (R6 punch list) | Size | Prior verified comparators |
|---|---|---|
| `discovery/round4/fa-runtime-structured-read.md` (R6-T2) | 176 ln | `fa-ipc-watchers.md` (R4-2.3-verified), `fa-git-integration.md` (R4-2.5-verified), `fa-pty-terminal.md` |
| `discovery/round4/fa-ssh-plane-residuals.md` (R6-T3) | 491 ln | `fa-git-integration.md`, `fa-pty-terminal.md` (+ `fa-wsl-remote-execution.md` gap list) |
| `discovery/round4/fa-hook-parity.md` (R6-T4) | 315 ln | `fa-agent-hooks-probes.md` (R4-2.8-verified, comparator for hook counts), `fa-pty-terminal.md` |

---

## 1. Contradictions

### 1.1 Cross-report contradictions vs previously verified reports: **NONE FOUND**

Every anchor shared between the new reports and the prior verified set was re-opened
against source and reproduced exactly:

| Shared claim | New report cite | Prior report cite | Source re-check | Verdict |
|---|---|---|---|---|
| `registerPty(` definition | runtime §S11 `:9328` | pty-terminal §2.1 (call-site sequencing `ipc/pty.ts:4913-4918`) | `rg` hit: def at `fabrica-runtime.ts:9328`; call site distinct file | CONSISTENT (complementary planes) |
| `registerPtyHandlers()` location | runtime §7 `ipc/pty.ts:2370` | pty-terminal §1 `:2370` | not re-opened (double-attested already, R4 wave verify) | CONSISTENT |
| `ipc/pty.ts` module size | — (implied via §7 anchors) | pty-terminal §1 "7,745-line module" | `rg --count` = **7745** | EXACT |
| `terminal:tabCreateReply` registration | — (Z3 range contains it) | fa-ipc-watchers.md:44/:82 `fabrica-runtime.ts:25788` | source `:25788` `ipcMain.on('terminal:tabCreateReply', handler)` | EXACT |
| Fetch throttle constants | runtime §Z4/S23 | fa-git-integration.md:237 `FETCH_FRESHNESS_MS = 30_000` `:35388-35390` | source `35388: const FETCH_FRESHNESS_MS = 30_000` | EXACT (but see C-1) |
| Canonical fetch key / in-flight sharing | runtime §6 `getCanonicalFetchKey 23135`, `getOrStartRemoteFetch 23197` | fa-git-integration.md:237 `:23126-23163`, `:23197-23246` | ranges nest the same methods | CONSISTENT |
| Sole production instantiation | runtime §3 `index.ts:2486` | (new claim; uniqueness grep) | source: `new FABRICARuntimeService` at `index.ts:2486`, one hit | EXACT |
| Managed hook fleet size | parity §3a/§3b: **16** hook-service.ts files; **14** managed agents wired remote (`remote-managed-hook-installers.ts:42-71`) | fa-agent-hooks-probes.md:30/:62 "**14** managed-install targets, **18** live `/hook/<source>` pathnames" | recursive Get-ChildItem: exactly **16** `hook-service.ts` under `src/main/<agent>/`; remote array read: exactly **14** entries claude→kimi incl. openclaude; codex/grok extended opts confirmed verbatim | EXACT |
| Plugin-based agents have no hook-service | parity D-1 (mimo/opencode PTY-overlay) | probes :30 "adds opencode, mimo-code, pi, omp, prime-agent … via plugins/extensions" | `src/main/pi/` exists with `agent-status-extension-source.ts` family, **no** hook-service.ts | CONSISTENT (18 − 5 plugin-based + openclaude-inheritance = 14 managed) |
| Ephemeral-VM SSH ready window | residuals §5.2 "timeout 10s" (`ephemeral-vm-runtime-ssh.ts:59-71`) | fa-wsl-remote-execution.md:238 "10 s ready window" | same module | CONSISTENT |
| ControlMaster win32 null | residuals §1.4/§1.5 `ssh-control-socket.ts:34-36`, getuid `:37-40` | (wsl report listed control-socket structurally only) | source lines 34-36 `win32 → null`; 37-40 uid guard | EXACT |
| Remote installer invariant comment | parity §3b ":73-75 omission that hid Droid/Copilot" | probes (same bug-class narrative) | source comment verbatim | EXACT |

### 1.2 Internal inconsistencies within the new reports (all MINOR)

- **C-1 — runtime §1 Z4 zone map omits a constants sliver its own verified sibling cites.**
  Z4 describes "constants (35295–35342)" then "helpers (35394–35443)", leaving 35343–35393
  unmapped — yet `FETCH_FRESHNESS_MS` sits at 35388 (source-confirmed), and
  fa-git-integration.md:237 correctly cites `:35388-35390`. The runtime coverage statement
  claims "no gap larger than the ranges shown"; this ~50-line sliver technically violates
  that. Content is not wrong anywhere; the zone boundary label is imprecise.
- **C-2 — runtime §8.2 connector-sprawl arithmetic doesn't sum.** S20 "(~1,475)" +
  S33 "(~2,200)" + S34 "(~470)" are quoted as "~4,900 lines" of inlined GitHub/GitLab/
  Linear/Jira code, but the report's *own* ranges give S20=1,476 + S33=2,184 +
  S34=270 ≈ 3,930. Additionally S34's label (~470) contradicts its own range
  (34598–34868 = 270). Direction of the argument (sprawl exists) unaffected.
- **C-3 — runtime self-anchor drift:** §3 says production instantiation is
  `index.ts:2486`; the scan-coverage statement says "`index.ts:2468-region`". Source
  confirms 2486. Cosmetic.
- **C-4 — hook-parity D-8 wording ambiguity:** "all **13** real installer services emit
  the 4-state model" vs bottom line "all **14** managed agents satisfy the canonical
  contract". Reconcilable (openclaude *inherits* ClaudeHookService rather than
  reimplementing, so 13 distinct implementations / 14 managed agents), but the two
  sentences never state the reconciliation explicitly.
- **C-5 — task-file metadata (ledger note, not a report defect):** Group 1 table carries
  two R6-T2 rows ("~37K lines" and "~35.8K lines"). The report header itself resolves this
  (rg = 37,549; PowerShell `Measure-Object -Line` = 35,848 due to encoding handling;
  source `rg --count` reproduces **37,549**, Measure-Object reproduces **35,848**).
  No contradiction once the tooling note is read; recommend keeping the rg figure canonical.

---

## 2. Duplicate Coverage Gaps (addressed by NONE of the three, nor by the named prior verified reports)

- **G-1 — `system-ssh-file-transfer.ts` Windows branch body.** Residuals §coverage
  explicitly read only "first 80 of 221 lines — POSIX branch; Windows branch body and
  download helpers not line-read". No prior verified report covers it (wsl report touched
  `system-ssh-binary.ts`, not this). Open gap on the Windows tar|ssh fallback path.
- **G-2 — `pi/omp/prime-agent` extension-source subsystem.** Probes names them as live
  `/hook/*` sources; parity proves they have no hook-service.ts; but the actual mechanism
  (`src/main/pi/agent-status-extension-source.ts`, `titlebar-extension-service.ts`,
  `legacy-omp-overlay-migration.ts`, etc.) is line-level undocumented in BOTH hook reports
  and everywhere else in round4/. This is the largest unnamed hole the R6 trio shares.
- **G-3 — `ssh-relay-deploy.ts` (71KB) / `ssh-relay-build-toolchain.ts` /
  `ssh-relay-versioned-install.ts` internals.** Residuals lists them "covered only at
  import/export sites"; wsl report mapped deploy structurally (its §11.4 imports view,
  :13-90). Net: versioned-install lock/GC machinery has no line-level pass in any report.
- **G-4 — codex hook-service WSL/trust internals.** Parity covers codex only at signature
  level beyond structure (its §6 explicitly skips "WSL/trust internals"); wsl report covered
  generic wsl-hook-relay files, not codex's `:850` install / `:990,:1020` reconciliation
  bodies. Two reports each defer the same region.
- **G-5 — fabrica-runtime.ts method bodies + its >48K-line companion test file.** Runtime
  report is honest that ~700 method bodies were not line-read and the test file was only
  counted; no other report covers either. Acknowledged-by-design, listed for completeness
  since the convergence memo treated R6-T2 as "the last big unknown".

---

## 3. Citation-Format Consistency

| Aspect | runtime (R6-T2) | residuals (R6-T3) | parity (R6-T4) | Assessment |
|---|---|---|---|---|
| Base path declared in header | yes (`../Fabrica-app/`) | yes (`../Fabrica-app/src/`) | yes (`../Fabrica-app/`) | ✅ all three |
| Path style used | bare filename `fabrica-runtime.ts:NNN` | src-relative `main/ssh/...:NNN` | repo-relative `src/main/claude/hook-service.ts:NNN` | ⚠ F-1: three different conventions; each self-declared, but cross-report cite strings are not uniform |
| Line notation | `:` colon + ranges, **en-dashes** in tables (1050–2669) | `:` + ASCII hyphens | `:` + ASCII hyphens | ⚠ F-2: mixed dash usage in runtime report (mojibake-prone per board history R2-4.1/R4-4.2); cosmetic |
| Coverage statement | ✅ "Scan-coverage statement" | ✅ "Scan Coverage Statement" | ✅ §6 "Scan-Coverage Statement" | ✅ present in all; ⚠ F-3: heading spelling varies (hyphenation/casing) |
| Negative-evidence / skipped-files honesty | ✅ explicit skip list | ✅ flagged "scanned-by-listing-only" items | ✅ explicit NOT-read list | ✅ uniform quality |
| Read-only compliance statement | ✅ | ✅ ("out of scope… frozen `_sources/`") | ✅ ("No source file was modified") | ✅ |

Sampled-cite accuracy across the three new reports during this pass: 14 anchors
re-opened against source → 14 EXACT, 0 FAILED (see §1.1 table + C-1/C-3 re-checks).

---

## 4. Totals

| Category | Count | Severity split |
|---|---|---|
| Cross-report contradictions vs prior verified reports | **0** | — |
| Internal inconsistencies in new reports | **5** (C-1..C-5) | 0 factual-content failures; 3 boundary/arithmetic cosmetics (runtime), 1 wording ambiguity (parity), 1 ledger-metadata note |
| Duplicate coverage gaps | **5** (G-1..G-5) | G-2 (pi/omp/prime-agent extension subsystem) recommended as highest-value next targeted task |
| Citation-format deviations | **3** (F-1..F-3) | all cosmetic; content traceable |
| Shared anchors re-verified against source this pass | **14** | 14 EXACT / 0 FAILED |

**Verdict:** the three newest punch-list reports are mutually consistent AND consistent
with the prior verified corpus (fa-ipc-watchers, fa-git-integration, fa-pty-terminal,
plus fa-agent-hooks-probes and fa-wsl-remote-execution used as extended comparators).
Notably, R6-T3 closes *exactly* the five "known residual gaps" declared at
fa-wsl-remote-execution.md:283, and R6-T4's 16-file/14-managed inventory reproduces
fa-agent-hooks-probes' 14-managed/18-live-pathname surface independently. No correction
tasks are mandatory; C-2 arithmetic and G-2 are the only items worth a follow-up.

---

## Scan Coverage (this verification pass)

**Read in full:** fa-runtime-structured-read.md (176 ln), fa-ssh-plane-residuals.md
(491 ln), fa-hook-parity.md (315 ln), fa-pty-terminal.md (405 ln),
Fabrica-atlas-tasks.md Checkpoint + Group tables + Session Ledger (553 ln).

**Read via targeted grep/extraction:** fa-ipc-watchers.md (channel totals, scope,
webContents/push mentions), fa-git-integration.md (all fabrica-runtime.ts cites),
fa-agent-hooks-probes.md (hook-count claims, TUI_AGENT_CONFIG, ingestion §4.4),
fa-wsl-remote-execution.md (SSH plane sections, residual-gaps list).

**Source re-verification (Fabrica-app, read-only):** fabrica-runtime.ts (line count ×2
tools, FETCH_FRESHNESS_MS, registerPty, class decl, AGENT_HOOK_RUNTIME_ENV_KEYS block
2418-2424, terminal:tabCreateReply sites), index.ts:2486, ipc/pty.ts line count,
hook-service.ts recursive inventory (16), remote-managed-hook-installers.ts:41-79 full,
ssh-control-socket.ts:29-42, src/main/pi/ + minimax/ listings.

**Skipped:** bodies of the three new reports' cited source regions beyond the anchors
listed; remaining ~60 round4 discovery docs (outside task scope); `_sources/` repos
(out of scope for FA-targeted consistency check).

No file under `_sources/` or `../Fabrica-app/` was modified. Output written only to
`.Fabrica-atlas-board/verify/r6-v4-cross-consistency.md`.
