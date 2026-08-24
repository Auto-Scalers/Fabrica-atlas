# R6-V2 — Spot Verification: fa-ssh-plane-residuals.md

> Task R6-V2 (Group 2), dispatch ctx_e4c2109d2331, task task_3670eb4ec08d.
> Target: `.Fabrica-atlas-board/discovery/round4/fa-ssh-plane-residuals.md` (R6-T3 SSH-plane deep dive).
> Method: sample of **22 file:line citations** across all five components, each checked against on-disk source in `../Fabrica-app/src/`. READ-ONLY on sources; this is the only file written.

---

## Verdict

**PASS — report is accurate.** 22/22 sampled citations verified correct (20 exact, 2 minor drift notes below, neither misleading). Coverage statement is internally consistent with on-disk reality (every line-count claim checked matched exactly).

---

## Component 1 — SSH Channel Multiplexer (8 citations)

| # | Claimed | Found on disk | Verdict |
|---|---------|---------------|---------|
| 1 | `SshChannelMultiplexer` class at `ssh-channel-multiplexer.ts:84` | Line 84: `export class SshChannelMultiplexer {`; fields match report (nextOutgoingSeq, highestReceivedSeq, unackedTimestamps, livenessProbeWaiters) | ✅ |
| 2 | `REQUEST_TIMEOUT_MS = 30_000` at `:59` | Line 59: `const REQUEST_TIMEOUT_MS = 30_000`. Nit: it is a module const, not a "default"; value exact | ✅ |
| 3 | `WAKE_GAP_MS = KEEPALIVE_SEND_MS * 3`, #7773 comment, `:62-64` | Lines 62-64 verbatim: comment "(system sleep, App Nap timer throttling) — not that the link is dead (#7773)" + `WAKE_GAP_MS = KEEPALIVE_SEND_MS * 3` | ✅ |
| 4 | Lane assignment: only `pty.data` → ordinary, else control, `:667-669` | Lines 667-669: `messageLane()` returns `'ordinary'` iff `msg.method === 'pty.data'`, else `'control'`. File ends at line 669 as coverage claims | ✅ |
| 5 | `MultiplexerTransport` shape (`write`/`onData`/`onClose`/`onDrain`, optional settlement/pause/resume/close) at `ssh-multiplexer-transport-writer.ts:6-15`; lanes `'ordinary'\|'control'\|'liveness'` at `:17`; queue caps 2 MiB/2048 frames, reserve `MAX_MESSAGE_SIZE+HEADER_LENGTH`/512 at `:26-29` | All four confirmed verbatim: type block 6-15, lane union line 17, `MULTIPLEXER_ORDINARY_QUEUE_MAX_BYTES = 2*1024*1024` + 2048/512 frame caps + control-reserve bytes lines 26-29 | ✅ |
| 6 | Scheduler `:38-73`: liveness first (:49-52), control capped by `CONTROL_WRITES_BEFORE_ORDINARY` before ordinary interleave (:53-60), anti-starvation | `SshMultiplexerWriterLaneScheduler` at :38; select(): liveness shift first (:49-52), control branch gated on `controlWritesSinceOrdinary < CONTROL_WRITES_BEFORE_ORDINARY` (:53-60); counter reset on ordinary (:63). File ends line 73 as coverage claims | ✅ |
| 7 | `getControlSocketPath` returns `null` on win32 (`ssh-control-socket.ts:34-36`) and requires `process.getuid` (:37-40) | Lines 34-36: `if (process.platform === 'win32') return null`; lines 37-40: `uid === undefined → null` | ✅ |
| 8 | ControlMaster machinery macOS/Linux-only: XDG_RUNTIME_DIR/tmpdir candidates (:89-97), 0o700 owner-checked dir (:99-108) | Candidates fn :89-97 pushes XDG_RUNTIME_DIR + tmpdir; `ensurePrivateDirectory` mkdirs `mode: 0o700` (:101) then owner/symlink checks (:102-108) | ✅ |

## Component 2 — SSH Config Parser family (5 citations)

| # | Claimed | Found on disk | Verdict |
|---|---------|---------------|---------|
| 9 | `parseSshConfig` `ssh-config-parser.ts:28-138`; multi-pattern Host (:50-60); wildcard/negated dropped (:51-54); stops at Match (:63-69); first-value-wins (:77-131) | Function :28-138 exact. `concretePatterns` filter drops `!`/`*`/`?` at :51-54; `match` clears current :63-69; OpenSSH first-obtained-value comment at :77 with `??=` assignments through :131 | ✅ |
| 10 | `loadUserSshConfig()` missing→`[]`, read error→warn+`[]` (:217-230); `sshConfigHostsToTargets` with generated ids + label dedup (:233-266) | Both functions at claimed ranges verbatim: try/catch warn+[] at :223-229; dedup via `seenLabels` + `ssh-${Date.now()}-…` ids at :233-266. File is 266 lines as coverage claims | ✅ |
| 11 | `resolveWithSshG` `ssh-g-config-resolution.ts:57-98`; 5s timeout (:28, :61-68); `--` flag guard (:79-84); `-F` HOME/passwd divergence incl. documented `/etc/ssh/ssh_config` suppression (:38-52, :44-45) | All exact: `SSH_G_TIMEOUT_MS = 5000` :28; timeout timer resolves null :61-68; `-G -- host` guard comment :79; `sshGArgsForHost` :38-53 with "-F also suppresses /etc/ssh/ssh_config" at :44 | ✅ |
| 12 | Include expander caps: glob ≤256 (:17), size ≤1 MiB (:18), target-dependent tokens h/n/p/r/j/k/C rejected (:19) | `MAX_INCLUDE_GLOB_MATCHES = 256`, `MAX_INCLUDE_FILE_BYTES = 1024*1024`, token set `{h,n,p,r,j,k,C}` — lines 17-19 verbatim | ✅ |
| 13 | `~/` AND `~\` backslash form supported (`ssh-config-path-expansion.ts:8-16`) | Line 8: `startsWith('~/') || startsWith('~\\')`, split on `[\\/]+`; file is 18 lines as coverage claims | ✅ |

Drift note A: report cites `expandSshConfigIncludes` at "(:20-38)" — the function signature is at line 21 (line 20 is blank). Off-by-one, content matches.

## Component 3 — SFTP Support (5 citations)

| # | Claimed | Found on disk | Verdict |
|---|---------|---------------|---------|
| 14 | `mkdirSftp` accepts ambiguous SSH_FX_FAILURE=4 as exists (:15-24) | Comment lines 15-18 explain code-4 ambiguity; accept condition `(err.code !== 4 \|\| allowExisting === false)` at :19; next-op-surfaces-error rationale quoted accurately | ✅ |
| 15 | `uploadFile` O_NOFOLLOW open + pre/post stat identity check (:43-65); abort wiring (:71-83) | `open(localPath, O_RDONLY \| O_NOFOLLOW)` at :43; symlink/non-file reject :54-55; openedStat size/ino/dev mismatch → "File changed during upload" :58-65 | ✅ |
| 16 | Windows-remote namespace bypass in `resolveSftpTransferPathIfMapped` (:228-235), drive-path regex set (:239-245) | Bypass condition :229-235 (declared-Windows platform OR recognizable Windows abs path → return shell path unchanged); regexes `/^[A-Za-z]:[\\/]/`, UNC `\\\\`, `/C:/`, `//host` at :241-244. File is 246 lines as coverage claims | ✅ |
| 17 | Abort grace `ABORTED_SFTP_OPERATION_GRACE_MS = 5_000` (:4); wait-for-owner-callback so "Windows local handles quiesce" (:41-49) | Constant at :4 verbatim; comment at :45-46 nearly verbatim ("the folder owner closes SFTP on abort… Windows local handles quiesce before the temporary tree is removed"); grace timer at :47. File is 115 lines as coverage claims | ✅ |
| 18 | System-ssh fallback: tar\|ssh pipe on POSIX, Windows-remote branch (:32-80, win branch :39-41, tar spawn :49) | `uploadDirectoryViaSystemSsh` :32; Windows redirect :39-42; `spawn('tar', ['-czf','-','-C',localDir,'.'])` at :49; remote `tar -xzf -` extract :53. File is 221 lines; report's partial-read flag (first ~80 lines) consistent | ✅ |

## Component 4 — vscode-ssh-authority (2 citations)

| # | Claimed | Found on disk | Verdict |
|---|---------|---------------|---------|
| 19 | Result union invalid/alias-required/upstream (:4-7); C0/DEL validation (:9-17); port range 1-65535 (:29-37); **port≠22 → `ssh-alias-required`** (:38-40); port-22 passes `[user@]host` (:41); file is 42 lines | Every element exact: union :4-7; `codePoint <= 0x1f || === 0x7f` :14; port bounds :33-34; `if (target.port !== 22) return { ok:false, reason:'ssh-alias-required', … }` :38-40; final `[user@]host` return :41; file ends line 42 | ✅ |
| 20 | Config-backed targets use `isOpenSshConfigBackedTarget` from `system-ssh-args`; authority = configHost trimmed (:20-25) | Import from './system-ssh-args' at :2; config-backed branch :20-25 returns `configHost.trim()` | ✅ |

## Component 5 — Ephemeral VM Recipe DSL (2 grouped citations, many sub-claims)

| # | Claimed | Found on disk | Verdict |
|---|---------|---------------|---------|
| 21 | Recipe type `{id,name,create,suspend?,resume?,destroy?,destroyDisabled?}` at `shared/types.ts:2197-2206`; structural limits 256k tokens/depth 64 (`ephemeral-vm-recipes.ts:25-28`); SshTarget schema w/ relay-grace bounds + portForwards (:39-64); pairing-code + absolute projectRoot parse (:133-157); `isAbsoluteRuntimePath` POSIX/drive-letter/UNC (:183-190); runner exit gate :119-126, stdout gate :128-136, destroy payload piped via stdin JSON :161, skipped stages :151-153; process spawn `{shell:true,cwd,windowsHide:true}` :42-48, `detached !== win32` :44, taskkill tree-kill w/ child.kill fallback :95-109 (fallback at :105), POSIX group kill :111-120, quoteShellToken :13-21; runtime-ssh poll 100ms/timeout 10s :12-13, orphan-target removal :36-41, provider wait :59-71; ipc handlers + removeHandler guard :65-69, doctor call :94-99 | ALL verified verbatim: types.ts block 2197-2206 exact (nit: prose omits optional `description?` field — cosmetic only); limits constants :25-28; schema :39-64 with grace refine :51-61 and portForwards :62; parser :133-157 with pairing-code check :150-151 and abs-path check :153-154; `isAbsoluteRuntimePath` :183-190 tests `/`, `[A-Za-z]:`, `\\\\`, `//`; runner gates at claimed lines, `stdin: `${JSON.stringify(payload)}\n`` at :161, `skipped:true` :151-153; spawn opts :42-48 with detached ternary at :44; `killRecipeProcess` :95-121 with `killer.on('error', () => child.kill())` at :105 and `process.kill(-child.pid,'SIGTERM')` :114; `quoteShellToken` :13-21 cmd-doubling vs POSIX escaping; runtime-ssh constants :12-13, orphan removal :36-41, provider loop :59-71 checking git+filesystem providers :65; ipc `registerEphemeralVmHandlers` :64 with five `removeHandler` calls :65-69, `doctorEphemeralVmRecipe` :94-99. Line-count claims all exact (recipes 190, runner 295, process 166, runtime-ssh 71, ipc/ephemeral-vm 262) | ✅ |

---

## Totals

| Metric | Value |
|---|---|
| Citations sampled | 22 groups (~40 individual file:line claims) |
| Verified correct | 22 |
| Failed | 0 |
| Minor drift (non-misleading) | 2 — expandSshConfigIncludes cited :20-38 vs actual :21-38 (off-by-one); "REQUEST_TIMEOUT_MS default" is a module const not a default param (value exact). Also one cosmetic prose omission: `FABRICAVmRecipe.description?` not listed though the citation range includes it |
| Coverage-statement line counts cross-checked | 19 files — **all matched exactly** (669, 270, 73, 132, 266, 351, 18, 155, 284, 246, 115, 221, 42, 190, 295, 166, 71, 262, types.ts 3937) |
| Sources modified | None (READ-ONLY audit) |

## Scan Coverage Statement (this verification)

Read line-level: all slices of `../Fabrica-app/src/main/ssh/{ssh-channel-multiplexer,ssh-multiplexer-transport-writer,ssh-multiplexer-writer-lane-scheduler,ssh-control-socket,ssh-config-parser,ssh-config-include-expander,ssh-config-path-expansion,ssh-g-config-resolution,sftp-upload,sftp-namespace-resolution,system-ssh-file-transfer,vscode-ssh-authority}.ts`, `src/main/providers/ssh-filesystem-provider-sftp.ts`, `src/shared/{types.ts slice,ephemeral-vm-recipes,ephemeral-vm-recipe-runner,ephemeral-vm-recipe-process}.ts`, `src/main/ephemeral-vm-runtime-ssh.ts`, `src/main/ipc/ephemeral-vm.ts` (slice). Not read: files outside the sampled citation set (relay-session/deploy internals, CLI surfaces, renderer slices) — consistent with the target report's own declared gaps. Nothing under `_sources/` touched (out of scope per target report).
