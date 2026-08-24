# R4-1.4 — Fabrica-app Auto-Update + Build/Distribution Pipeline (Line-Level Deep Dive)

> Task: R4-1.4 (Group 1, Round 4) · Worker: ctx_5ef3ba7d9868 · task_8e5a3ea9c331 · Date: 2026-08-23
> Scope: READ-ONLY scan of `Fabrica-app/` (updater integration, packaging config, signing/notarization, release scripts, CI workflows, version bump flow).
> All paths below are relative to `Fabrica-app/` unless prefixed. Line numbers are from the state of the tree on 2026-08-23.

---

## A. Updater Integration

### A1. Which updater

- **electron-updater** (`electron-updater` ^6.8.9) is the sole update engine: `package.json:139` (`"electron-updater": "^6.8.9"` in dependencies).
- Packaging stack: `electron-builder` ^26.15.3 plus **`electron-builder-squirrel-windows`** ^26.15.3 (`package.json:204-205`) — Squirrel.Windows provider is installed even though the active Windows target is NSIS (see §B); Squirrel.Mac is the runtime install mechanism on macOS (ShipIt references throughout).
- The updater singleton is loaded lazily so dev/E2E launches don't trip electron-updater's version validation: `src/main/electron-updater-loader.ts:5-10` (`loadElectronAutoUpdater()` keeps `require('electron-updater')` behind packaged-update guards).
- Central orchestration lives in `src/main/updater.ts` (2,329 lines) with companion modules:
  - `src/main/updater-events.ts` — event-handler registration adapter (`registerAutoUpdaterHandlers`, invoked at `src/main/updater.ts:2214-2258`)
  - `src/main/updater-fallback.ts` — benign-failure classification (`isBenignCheckFailure`, `isMissingUpdateManifestFailure`, `isGitHubReleaseTransitionFailure`, `isReleaseAssetsPublishingFailure`: `src/main/updater-fallback.ts:63-91`)
  - `src/main/updater-prerelease-feed.ts` — atom-feed preflight/probing (§A3)
  - `src/main/updater-release-builds.ts` — pinned-build listing/resolution (§A5)
  - `src/main/updater-nudge.ts` — server-side update nudge campaigns (§A6)
  - `src/main/updater-mac-install.ts` / `updater-mac-install.ts` defer logic — macOS staged-install gating
  - `src/main/update-install-exit-watchdog.ts` — arms a watchdog once install commits (`src/main/updater.ts:829`, `:812`)
  - `src/main/linux-package-update-recovery.ts` + `linux-package-install-diagnostic.ts` — Linux root-package install/recovery (§A8)
  - `src/main/serve-update-handoff.ts` — headless `fabrica serve` supervisor handoff (§A9)
- Wiring into the app: `setupAutoUpdater(mainWindow, opts)` (`src/main/updater.ts:2139-2293`), called from the main-window services attachment with the persisted channel override getter `store.getUI().releaseChannelOverride ?? null` (`src/main/window/attach-main-window-services.ts:191`; type at `src/shared/types.ts:3515`).

### A2. Feed URLs (the concrete endpoints)

| Purpose | URL | Citation |
|---|---|---|
| Default startup feed | `https://github.com/Auto-Scalers/Fabrica-app/releases/latest/download` | `src/main/updater.ts:2202-2207` |
| Routine-check fallback feed | same `/releases/latest/download` URL | `src/main/updater.ts:1437-1445` |
| Atom feed used for preflight tag discovery | `https://github.com/Auto-Scalers/Fabrica-app/releases.atom` | `src/main/updater-prerelease-feed.ts:5` |
| Per-tag download base | `https://github.com/Auto-Scalers/Fabrica-app/releases/download/<tag>` | `src/main/updater-prerelease-feed.ts:6,16-18` |
| Tag regex mining the feed | `/href="https://github\.com/Auto-Scalers/Fabrica-app/releases\/tag\/([^"]+)"/g` | `src/main/updater-prerelease-feed.ts:13-14` |
| Platform manifests probed | `latest-mac.yml` / `latest-linux.yml` / `latest.yml` | `src/main/updater-prerelease-feed.ts:20-28` |
| Nudge campaign config | `https://onfabrica.dev/whats-new/nudge.json` | `src/main/updater-nudge.ts:12` |
| Dev-channel release lists (REST API) | `https://api.github.com/repos/<repo>/releases?per_page=100` | `src/main/updater-release-builds.ts:15-17` |
| Pinned dev-build feeds | `https://github.com/<channel-repo>/releases/download/<tag>` | `src/main/updater-release-builds.ts:19-21,101-108` |
| Dev-channel repos | `Auto-Scalers/Fabrica-hourly`, `/Fabrica-daily`, `/Fabrica-adhoc`; main = `Auto-Scalers/Fabrica-app` | `src/shared/release-channel.ts:24-27` |

Key design decision (heavily commented in source): the app does **not** ride electron-updater's native GitHub provider. Every check first runs `pinDefaultReleaseFeed()` (`src/main/updater.ts:1351-1447`) which probes the atom feed, verifies the newest tag's manifest + assets actually exist (HEAD probes; `src/main/updater-prerelease-feed.ts:109-150`), and then pins a **generic** provider feed at the concrete `/releases/download/<tag>/` URL (`src/main/updater.ts:1392`). Reasons given in-source: the native GitHub provider filters RC channels unpredictably and `/latest` redirects can drift between check and download (`src/main/updater.ts:2201`, `:1355`). During a publish window (newest release assets not yet uploaded) it pins a verified **last-good** tag instead (`src/main/updater.ts:1394-1405`).

### A3. Channels

- Channel enum: `'stable' | 'rc' | 'hourly' | 'daily' | 'adhoc'` (`src/shared/release-channel.ts:3-11`).
- Stable + RC share the main repo; each dev channel publishes to its own dedicated repo so its tags never enter the main releases atom feed — in-source reason: the atom feed exposes only the 10 newest entries, and 24 hourly tags/day would evict every stable/RC entry (`src/shared/release-channel.ts:21-27`; same rationale in `config/electron-builder.config.cjs:36-48`).
- Version shapes (regexes): hourly `X.Y.Z-hourly.YYYYMMDDHHmm` (`release-channel.ts:83`), daily `…-daily.YYYYMMDDHHmm` (`:88`), adhoc `…-adhoc.YYYYMMDDHHmmss` (seconds because adhoc has no concurrency group; `:91-99`).
- Channel classification of any version: `getVersionChannel()` — dev channels tested before the `-` catch-all so they don't misfile as rc (`src/shared/release-channel.ts:176-193`).
- Dev channels are macOS-only today; `isChannelSupportedOnPlatform()` returns false for them off darwin and the pinned-jump IPC refuses with "`<label>` builds are produced only for macOS." (`release-channel.ts:56-71`; enforced again in `src/main/updater.ts:1741-1748`).
- User-facing channel selection:
  - A persisted `'rc'` override makes every routine background check follow the RC series (`src/main/updater.ts:379-385` via `getUpdateCheckVariant`; UI store field `releaseChannelOverride` at `src/shared/types.ts:3515`, schema validation `src/main/runtime/rpc/methods/client-ui-schemas.ts:252`; settings UI `src/renderer/src/components/settings/ReleaseChannelSection.tsx` — selecting the running build's own channel clears the override).
  - Modifier-clicking "Check for Updates" targets prerelease manifests (`includePrereleaseActive`, `src/main/updater.ts:122-123`, `1573-1580`); a separate `perf` variant matches `rc.N.perf` tags without permanently opting the user into RC (`src/main/updater.ts:361-370`, `1611-1615`; perf tag shape `src/main/updater-prerelease-feed.ts:47-57`).
  - Explicit pinned jumps to any published tag on any channel incl. older ones: `checkForPinnedBuild()` sets `allowDowngrade`, `disableDifferentialDownload`, `allowPrerelease=true` and pins the channel-repo feed (`src/main/updater.ts:1734-1796`); picker data from `listReleaseBuilds()` (`src/main/updater-release-builds.ts:67-92`).

### A4. Check cadence, retries, and safety rails

- Background check interval: 24h (`AUTO_UPDATE_CHECK_INTERVAL_MS = 24*60*60*1000`, `src/main/updater.ts:106`); retry base 1h doubling per failure up to a 6h cap (`:107-109`, backoff choke point `:1239-1259`). Any completed check resets the backoff (`:1261-1264`).
- Startup/wake gating: last-check timestamp persisted through opts (`setLastUpdateCheckAt`/`getLastUpdateCheckAt`, `src/main/updater.ts:2142-2145`, applied at `:2283-2292`); `powerMonitor resume` and `browser-window-focus` re-run a due daily check (`:2263-2281`).
- Stall protection: every attempt gets a 45s stall timer (`UPDATE_CHECK_STALL_TIMEOUT_MS`, `src/main/updater.ts:115`, armed at `:474-502`) and a 1s silent-settle grace period reconciling promise resolution vs events (`:114`, `:591-601`).
- Attempt-scoped sequencing guards duplicate/stale events (`updateCheckAttemptSequence` etc., `src/main/updater.ts:148-155`, `:504-513`).
- Prerelease missing-manifest fallback: when the pinned primary tag briefly lacks `latest*.yml`, one automatic retry against the previous tag is launched with careful event suppression bookkeeping (`retryPrereleaseFallbackAfterMissingManifest`, `src/main/updater.ts:1449-1505`).
- Auto-behavior flags: `autoDownload = false` (user consents to downloads; `src/main/updater.ts:2183`); `autoInstallOnAppQuit` true only for interactive mode and non-root-Linux (`:2190-2191`); `autoRunAppAfterInstall` tied to interactive mode (`:2192-2193`).
- Security note preserved in code: *"never re-add a verifyUpdateCodeSignature override — a no-op disables electron-updater's built-in Authenticode check"* (`src/main/updater.ts:2199`). Windows signature failure classification (AV/EDR interception vs mismatch) at `src/shared/updater-windows-signature-check.ts:8-21`, consumed at `src/main/updater.ts:623-631` and `:912-930`.
- Updater logging: electron-updater's logger is replaced with a redacting diagnostic logger — described as the app's only on-machine visibility into electron-updater (`src/main/updater.ts:2195-2197`); diagnostic markers written per check attempt (`:510-511`).

### A5. Local builds + pinned dev jumps (macOS developer features)

- Local-build switching (macOS only): picks an arbitrary local `.app`, serves it over a loopback generic feed (`startLocalBuildFeed`), sets `allowDowngrade` + disables differential download (`src/main/updater.ts:1671-1720`); tracked as a distinct update `source: 'local'`.
- Pinned jumps: §A3 above; teardown restores the release feed and resets `allowPrerelease` so background checks never inherit the pin (`restoreReleaseUpdateSource`, `src/main/updater.ts:215-226`).
- Dismissing an offered local/pinned update tears down its feed so deferred release checks resume (`dismissAvailableUpdate`, `src/main/updater.ts:2122-2137`).

### A6. Update nudges (server-driven campaign)

- Polls `https://onfabrica.dev/whats-new/nudge.json` every 30 min (poll constant `NUDGE_POLL_INTERVAL_MS`, `src/main/updater.ts:110`; fetch + strict validation `src/main/updater-nudge.ts:10-61`).
- A nudge carries `{id, minVersion?, maxVersion?}`; applies only to versions inside the range and not pending/dismissed (`shouldApplyNudge`, `src/main/updater-nudge.ts:76-89`). Applied nudges trigger an immediate background check carrying the campaign id; dismissal is persisted (`src/main/updater.ts:2052-2115`).

### A7. macOS install mechanics

- Download start defers to `beginMacUpdateDownload()`; quit-and-install defers until the staged installer is ready (`deferMacQuitUntilInstallerReady`, `isMacInstallerReady`, `markMacQuitAndInstallInFlight` — imports at `src/main/updater.ts:24-30`, used at `:2035-2044`).
- `quittingForUpdate` guard set *before* native `quitAndInstall` so the dock `activate` handler cannot reopen the old version while ShipIt replaces the .app bundle (`src/main/updater.ts:181-182`, `:733-734`, exposed via `isQuittingForUpdate` `:1798-1800`).
- Commit semantics: macOS stays uncommitted until `isMacInstallerReady()` so late native errors can still recover; exit watchdog armed at commit (`src/main/updater.ts:825-830`).
- Pre-quit cleanup runs with a 2.5s timeout budget so a wedged shutdown can't strand the installer waiting on the process (#4438 rationale; `runBeforeUpdateQuitCleanup`, `src/main/updater.ts:1010-1048`).

### A8. Linux root-package handling (deb/rpm)

- On systems where the app was installed as a system package, `quitAndInstall` routes through DebUpdater/RpmUpdater spawnSync semantics; install is committed immediately on normal return (`src/main/updater.ts:807-813`).
- Pre-install re-proof of the retained `.deb`/`.rpm` (hash re-validation against the release digest) before teardown — a user-writable path is about to be handed to a root package manager (`proveRetainedLinuxPackage` + `revalidateRetainedLinuxPackage`, `src/main/updater.ts:1882-1923`; invoked at `:722-728`).
- Failure recovery card: retained-package classification, redacted stderr, sudo/package-manager availability reasons, Copy-command / Show-package actions (`LINUX_PACKAGE_RECOVERY_MESSAGES` `src/main/updater.ts:1809-1826`; status builder `:936-977`; actions `:1966-2007`).

### A9. Headless `fabrica serve` updates

- Install modes: `interactive | supervised-headless-serve | unsupported-headless-serve` (`resolveUpdateInstallMode`, `src/main/updater.ts:680-685`, type `:101-104`).
- Unsupported serve hosts defer both download and install with explicit copy telling the operator to update via their service manager (`deferHeadlessServeInstall`, `src/main/updater.ts:657-678`).
- Supervised hosts persist a handoff record the CLI supervisor consumes on relaunch (`requestServeUpdateHandoff` at `:752-772`; MacUpdater caveat — `autoRunAppAfterInstall=false` there because MacUpdater ignores quitAndInstall args, `:2188-2193`).
- Remote/mobile clients drive the same pipeline via `checkForRemoteServerUpdate` / `downloadRemoteServerUpdate` / `installRemoteServerUpdate` (`src/main/updater.ts:1197-1235`) with support snapshot `getRemoteServerUpdaterSnapshot` (`:1188-1195`).

---

## B. Packaging Config (electron-builder)

Single source: `config/electron-builder.config.cjs` (631 lines, CommonJS). Invoked from package.json scripts: `build:unpack --dir`, `build:win --win`, `build:mac:release --mac`, `build:linux AppImage deb` (`package.json:80-85`; CI uses direct `electron-builder --config config/electron-builder.config.cjs …` invocations, e.g. `release-mac-build.yml:142`, `release-cut.yml:985-997`).

### B1. Identity & channels

- `appId: 'com.autoscalers.fabrica'` (`config/electron-builder.config.cjs:49`), `productName: 'Fabrica'` (`:94`).
- Dev-channel builds inject `extraMetadata.version` = the stamped dev version (hourly/daily/adhoc env vars `FABRICA_MAC_HOURLY|DAILY|ADHOC` select channel; `FABRICA_LOCAL_BUILD_VERSION` for local validation builds) (`config/electron-builder.config.cjs:22-35`, `:95-99`).
- In-source warning that dev-channel builds must carry the *release* identity — same bundle id, Developer ID signature, notarization ticket — or Squirrel.Mac refuses to swap them over an installed app and macOS treats each build as a new app (`config/electron-builder.config.cjs:19-21`).

### B2. Publish block

```js
publish: {
  provider: 'github',
  owner: 'Auto-Scalers',
  repo: devChannelRepo ?? 'fabrica',          // :42-48, :500-505
  releaseType: devChannelRepo ? 'prerelease' : 'release'
}
```
(`config/electron-builder.config.cjs:500-505`). Note the repo name here is lowercase `fabrica` while runtime code uses `Fabrica-app` — GitHub is case-insensitive for these URLs, but a rebrand must normalize both.

### B3. What ships (files / asar / extraResources)

- `files:` excludes all repo-only trees (src/config/docs/mobile/native/skills/tests/examples/…) from app.asar with per-exclusion "Why" comments (`config/electron-builder.config.cjs:103-148`).
- `asarUnpack:` CLI + agent-hook dirs, forked daemon entries, plugin host, computer sidecar, parcel-watcher entry, chunks, resources, and runtime deps needing real files (`ws`, `tweetnacl`, `zod`, `yaml`, `sherpa-onnx*`) — rationale comments at `:150-196`.
- `commonExtraResources`: relay bundle (`out/relay` → `relay`), bundled plugins (`resources/plugins/launch`), skill freshness metadata (`resources/skills`) (`:63-77`); plus feature-wall media per platform.
- Per-platform extras:
  - **win**: `bin/fabrica.cmd` + native CLI launcher `fabrica.exe`, agent-browser exe, computer-use runtime.ps1, sherpa-onnx win-x64 (`:293-314`).
  - **mac**: `bin/fabric` shim, serve-sim full package (helper resolves relative to dist/), `Fabrica Computer Use.app` resource, notification-status helper forced into `Contents/MacOS` because macOS 26 UNUserNotificationCenter aborts for executables launched out of Resources (#7929; `:364-396`).
  - **linux**: `bin/fabrica`, agent-browser, computer-use runtime.py, sherpa-onnx linux (`:428-445`).
- Packaged runtime node_modules closure copied to Resources/node_modules so bare `require()` works outside pnpm's symlink farm (`:73-76`, via `createPackagedRuntimeNodeModuleResources` from `config/packaged-runtime-node-modules.cjs`).

### B4. Targets & platform packaging specifics

- mac targets: dmg + zip, both x64+arm64 (`:397-406`); dmg artifact name `fabrica-macos-${arch}.${ext}` (`:411-413`).
- win target NSIS: artifact `fabrica-windows-setup.${ext}`, desktop shortcut always, custom NSIS include `config/nsis/daemon-host-uninstall.nsh` which stops/removes the relocated terminal daemon under LOCALAPPDATA on real uninstall but is guarded by `${isUpdated}` so it never runs during an update's uninstallOldVersion (`:316-325`).
- linux targets: AppImage + deb (+ rpm in CI; `--linux AppImage deb rpm` at `release-cut.yml:991,997`); executableName `fabrica` deliberately ≠ Ubuntu GNOME's system `fabrica` package (`:414-417`); StartupWMClass pinned for dock grouping (`:421-427`); deb depends python3/gi/atspi/xdotool/xclip/xvfb for headless browser panes (`:459-467`); after-install/remove scripts symlink the CLI onto PATH for headless hosts (`:468-473`, scripts at `resources/linux/packaging/after-install.sh`, `after-remove.sh`); arm64 AppImage named `fabrica-linux-arm64.${ext}` via `FABRICA_LINUX_ARM64_RELEASE=1` (`:27`, `:450-452`).
- `npmRebuild: true` with a custom `beforeBuild` targeted rebuild — dual-arch macOS correctness (arm64 runner must not ship arm64 node-pty in the x64 DMG) (`:492-499`).
- `forceCodeSigning: isMacRelease` — release builds fail if signing unavailable rather than silently downgrading to ad-hoc artifacts (`:408-410`).

### B5. afterPack verification gauntlet (`config/electron-builder.config.cjs:197-285`)

1. Linux glibc floor check of bundled native binaries (regression guard for #9902 node-pty GLIBC_2.34 crash) (`:201-203`).
2. macOS build-compatibility metadata written (version/commit/arch) (`:216-234`).
3. Runtime node_modules pruning + verification (`:235-236`).
4. Skills CLI runtime verification incl. booting packaged daemon-entry under plain Node when arch-compatible; cross-arch slices still assert file layout (`:240-263`).
5. Packaged plugin resources inspection (`:264-266`).
6. Unix launcher chmod 0o755 + serve-sim helper chmods + agent-browser binary chmod (`:267-277`, helpers `:508-536`).
7. macOS helper apps signed *inside* afterPack before the outer app seal (§C2).

---

## C. Signing & Notarization

### C1. macOS (Apple Developer ID + notarytool)

- Release env secrets: `MAC_CERTS` / `MAC_CERTS_PASSWORD` (CSC_LINK), `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (`release-mac-build.yml:75-82`, `:143-149`).
- Pre-build gate: `verify-macos-release-env.mjs` (`release-mac-build.yml:75-82`) and entitlements lint `pnpm verify:macos-entitlements` (`:86-87`; script `config/scripts/verify-macos-entitlements.mjs`, referenced `package.json:36`).
- Builder flags: `hardenedRuntime: isMacRelease` and `notarize: isMacRelease` — local/dev validation builds skip both; in-source rationale documents TCC anchoring on identifier+team surviving updates only with notarization tickets (24 builds/day otherwise revokes grants faster than users can re-grant) (`config/electron-builder.config.cjs:351-363`).
- Helper signing inside afterPack: `Fabrica Computer Use.app` (deep-signed with entitlements plist + runtime + timestamp on release path; identity resolution order env → CSC_NAME → keychain lookup; missing identity throws on release) and `fabrica-notification-status` binary (`--options runtime --timestamp` on release) (`config/electron-builder.config.cjs:538-594`, codesign args `:596-609`, identity discovery `:611-631`).
- Entitlements plists: `resources/build/entitlements.mac.plist`, `entitlements.computer-use.mac.plist` (builder references at `:328-329`, `:604`).
- Info.plist extensions (usage descriptions, Bonjour services): `config/electron-builder.config.cjs:330-350`.

### C2. Windows (SignPath Foundation, two-stage manual-approval flow)

SignPath cannot deep-sign inside NSIS installers, so shipping signed inner binaries requires a two-stage pipeline (rationale `windows-signing-rehearsal.yml:1-14`; production flow `release-cut.yml:1175+`):

1. **Stage 1 — inner PE files**: electron-builder runs `--win --publish never` (`release-cut.yml:985`); unsigned PE files are staged and uploaded as workflow artifacts (`:1260-1274`), submitted via `signpath/github-action-submit-signing-request@v2` (`:1274+`) with Slack approval ping including source ref/sha (`:1304-1331`); signed inner binaries downloaded back (`:1352`).
2. **Repack**: signed binaries restored into `dist/win-unpacked` (with elevate.exe SignPath-copy swap logic, `:1407-1440`); NSIS installer built from prepackaged unpacked dir while preserving `latest.yml` across the repack (`:1453-1467`).
3. **Stage 2 — installer**: unsigned installer uploaded and submitted to SignPath (`:1471-1543`); signed installer returned (`:1559-1583`).
4. **Post-signing fixups**: `generate-windows-blockmap.mjs` regenerates `fabrica-windows-setup.exe.blockmap` (signing invalidates electron-builder's blockmap), `blockMapSize` patched into `latest.yml` (`:1587-1610`; script `config/scripts/generate-windows-blockmap.mjs`).
5. **Verification gates**: installer signature must be `Valid` with subject `CN=SignPath Foundation` (`:1622`, `:1729`); every inner binary in the shipped installer verified SignPath-Foundation-signed ("All N inner binaries … signed" gate `:1750`).
6. Final upload of installer + blockmap + latest.yml to the draft release (`:1782`).
- Constraints: SignPath origin verification requires GitHub-hosted runners — Blacksmith excluded from provenance, which is why the mac build lives in a separate workflow dispatched by `build-mac` (`release-cut.yml:1002-1006` timeout budget comment, `:1832-1835`; `release-mac-build.yml:27-30`).
- Publisher name configured builder-side since packager can't infer it: `signtoolOptions.publisherName: 'SignPath Foundation'` (`config/electron-builder.config.cjs:286-292`).
- Rehearsal workflow mirrors stage 1+2 without publishing (`windows-signing-rehearsal.yml:33-35` GH-hosted requirement, steps `:84-222`).
- Shared action: `.github/actions/install-signpath-module/action.yml` (installed at `release-cut.yml:1205-1207`).

---

## D. Release Scripts, CI Workflows, Version-Bump Flow

### D1. `release-cut.yml` — single entry point (1,972 lines)

Header contract: replaces old local `pnpm release:*` scripts; releases always reproducible from CI; flow = resolve ref SHA → read latest stable → compute next version from kind (rc | patch | minor | major) → refuse stable regressions (the only guard electron-updater needs) → write package.json, commit, tag, push → fast-forward main if ref was main tip → build/publish artifacts from tag (`.github/workflows/release-cut.yml:3-19`).

- Inputs: `kind` (rc default), `ref` (default main), `dry_run`, `version_suffix` (e.g. `perf` → `1.2.3-rc.4.perf`), explicit `version` leapfrog (`:21-53`).
- Scheduled RC cuts: PT-window gating allows only hours 03 and 15 America/Los_Angeles, tolerating late GitHub schedule delivery (`:244-267`); idempotency via `[rc-slot:YYYY-MM-DD-HH]` marker grepped in main's log plus latest-RC-tag fallback (`:238-295`).
- Stuck-draft recovery first: `publish-complete-draft-releases.mjs` publishes any complete RC draft from prior runs before deciding whether to cut another tag (`:316-323`; script `config/scripts/publish-complete-draft-releases.mjs` + test).
- Version math hardening (extensive incident notes inline): latest stable picked by tag shape `^v\d+\.\d+\.\d+$` excluding `-rc.` and non-desktop prefixes like `mobile-v*` (wedge incidents 2026-04-27, 2026-05-04 run 25304336767, 2026-06-04 documented at `:339-360`); prerelease-suffix stripping before numeric bump (`:364-381`); highest-RC-for-base history query via `config/scripts/release-rc-history.mjs` (`:394-396`); perf suffix ordering rule (sorts above its base rc.N but below rc.N+1) (`:398-403+`).
- Version bump commit written to package.json, tagged, pushed; main fast-forwarded only when releasing exact main tip (`:16-18`, `:137-146`).
- Draft lifecycle: `create-release` creates the draft via `create-draft-release.mjs` (`:793-815`); every build job re-verifies the release stayed draft after its uploads (mac `release-mac-build.yml:151-173`; matrix jobs `release-cut.yml:1794-1808`) so a partial release can never become public.
- Build matrix (`:972-1006`): windows-2022 (`--win --publish never`, hands to SignPath), ubuntu-latest x64 and ubuntu-24.04-arm (`--linux AppImage deb rpm --publish always`); 360-minute timeout sized around SignPath waits (1h inner + 4h installer).
- Mac build delegated: `build-mac` dispatches `release-mac-build.yml` through `run-release-mac-build-workflow.mjs` (`:1827-1855`).
- Publish gate: `publish-release` verifies still-draft, runs `verify-release-required-assets.mjs <tag>` (checks latest*.yml manifests exist AND every asset they reference is present/uploaded/non-zero-size — `config/scripts/verify-release-required-assets.mjs:90-126`), then flips draft→published deriving `--prerelease` from tag shape (not from whatever electron-builder left — 2026-04-27 RC-marked-latest incident noted) (`:1857-1925`).
- Post-publish: tag-scoped e2e dispatch with retries (`:1927-1951`); Homebrew bump invoked for recovered RC drafts and for published tags (`:1953-1972`).

### D2. `release-mac-build.yml`

Blacksmith `blacksmith-6vcpu-macos-15` runner (`:30`); telemetry build identity classified from tag shape into literal `stable|rc` consumed by electron-vite `define` (`IS_OFFICIAL_BUILD` transport gate) — refuses non-matching tags (`:92-111`); `pnpm build:release` chain (`package.json:76`) with `FABRICA_BUILD_IDENTITY`, diagnostics token URL `https://www.onfabrica.dev/diagnostics/token`, PostHog write key (`:113-121`); fault-injection gates for file-watcher and SSH-relay watcher process isolation before packaging (`:123-134`); publish step `FABRICA_MAC_RELEASE=1 electron-builder --mac --publish always` (`:136-149`); post-publish telemetry-constants verification in app.asar (`:178-179`).

### D3. Dev-channel build workflows (hourly/daily/adhoc — all macOS)

- **Hourly** `hourly-mac-build.yml`: cron `'0 * * * *'` + dispatch (`:39-42`); publishes to `Auto-Scalers/fabrica-hourly` using a dedicated GitHub App token (`HOURLY_RELEASE_APP_ID/PRIVATE_KEY`, provisioned by `setup-hourly-release-token.sh`; two mints — one for reads/build, one post-notarization for publish/prune) (`:16-34`, `:89-90`, `:235-240`); publish command `FABRICA_MAC_HOURLY=1 electron-builder --mac --publish always` with `FABRICA_HOURLY_BUILD_VERSION` (`:293-308`); manifest-published verification + retention pruning; base version resolved from the highest *shipped* main-repo stable/RC (drafts excluded) (`:101-205`).
- **Daily** `daily-mac-build.yml`: single UTC cron `'15 14 * * *'` (early morning Pacific) (`:47-49`); same token architecture, repo `Auto-Scalers/fabrica-daily` (`:21-27`).
- **Adhoc** `adhoc-mac-build.yml`: dispatch-only branch builds for unlanded work; refuses PR refs and unreachable commits (release credentials must never sign foreign code) (`:106-148`); concurrency serialized per branch (`:70-72`); 7-day retention (`:81`); repo `Auto-Scalers/fabrica-adhoc` (`:15-18`).
- Version stamping scripts: `createHourlyBuildVersion` strips `-rc.N` tails so hourlies sort BELOW their base RC/stable and can't be offered to RC users by ordinary checks (`config/scripts/hourly-build-version.mjs:12-34`); per-base build numbering from release titles (`:49-60`); human title `1.4.163 • 01 • Jul 31, 1:54PM • e698241` shown in GitHub list and in-app picker (`:62-76`); daily/adhoc twins `daily-build-version.mjs`, `adhoc-build-version.mjs`; shared base resolver bumps patch only when the top candidate was actually shipped (`config/scripts/dev-channel-base-version.mjs:31-52`).

### D4. Release policy enforcement — `release-policy.yml`

On `release.published|edited`: only `github-actions[bot]` may publish tags matching `^vX.Y.Z$` (stable) or `^vX.Y.Z-rc.N(.suffix)?$` / `mobile(-android)?-vX.Y.Z` (prerelease) (`.github/workflows/release-policy.yml:26-37`). Prerelease flag re-asserted from tag shape and `make_latest` corrected (`:69-81`); unauthorized releases get drafted, deleted, tag ref deleted, and latest stable restored (`restoreLatestStable`, `:40-67`, `:83-98`). This protects the atom feed that the updater's preflight mines.

### D5. Homebrew distribution

- `homebrew-bump.yml` (callable + dispatchable): computes sha256 of `fabrica-macos-{arm64,x64}.dmg` from the release, renders the channel cask template, PRs into tap `Auto-Scalers/homebrew-fabrica` via buf0-bot GitHub App installation token, squash-merges immediately (no branch protection on tap) (`.github/workflows/homebrew-bump.yml:1-19`, `:94-110`, `:140-199`). Stable tags → `Casks/fabrica.rb`; RC tags → `Casks/fabrica@rc.rb` (`:65-92`).
- Cask templates live in-repo: `Casks/fabrica.rb` (version 1.3.24 at scan time, `url …/releases/download/v#{version}/fabrica-macos-#{arch}.dmg` verified against `github.com/Auto-Scalers/fabrica/`, homepage `https://onfabrica.dev/`, `livecheck strategy :github_latest`) (`Casks/fabrica.rb:1-17`).
- `auto_updates true` so brew defers to the in-app electron-updater (`:19-24`); CLI binary symlinked onto PATH from `Contents/Resources/bin/fabrica` (`:30-35`); zap paths include `~/Library/Caches/com.autoscalers.fabrica.ShipIt` (Squirrel updater cache) and `~/.fabrica` user data (`:37-48`).

### D6. Update-survival E2E + mobile distribution

- `win-update-e2e.yml`: installs one released NSIS build, updates to another on a disposable windows-2022 runner (the oneClick uninstall would delete a real developer install — hence CI-only, `:1-10`), asserts daemon survival / terminal interactivity / zero console flashes; harness `tests/tools/win-update-e2e/run.mjs` (`:119-133`); push-scoped trigger on the feature branch for iteration (`:18-24`). Companion `win-crash-survival-e2e.yml`, `win-update-survival-e2e.yml`.
- Mobile rides the same repo's releases with distinct tag shapes: android on `mobile-android-v*` tags creating `mobile-android-v<version>` releases (`.github/workflows/mobile-android-release.yml:6-17`); iOS counterpart `mobile-ios-release.yml`. The release-policy regex and homebrew filter explicitly exclude these shapes (`release-policy.yml:32-34`, `homebrew-bump.yml:13-19`).

---

## E. What Matters for After-Rebrand Distribution (Fabrica brand)

Hard-coded distribution identity — every item below is a rebrand touchpoint, each cited:

1. **GitHub repo coordinates are baked into the updater at three independent layers**:
   - Runtime feed URLs: `releases/latest/download` + atom feed + tag regex all name `Auto-Scalers/Fabrica-app` (`src/main/updater.ts:1440`, `src/main/updater-prerelease-feed.ts:5-14`).
   - Builder publish target `owner: 'Auto-Scalers', repo: devChannelRepo ?? 'fabrica'` (`config/electron-builder.config.cjs:500-505`) plus the four channel repos in `src/shared/release-channel.ts:24-27`.
   - CI guards gate on `github.repository == 'Auto-Scalers/fabrica'` so forks no-op (`release-cut.yml:68`, `release-mac-build.yml:26`, `release-policy.yml:18`).
   A repo rename/reorg silently strands every shipped client unless the *installed base* keeps a feed that still resolves (GitHub redirects renamed repos' release assets, but the atom-feed regex and API calls should be audited — the tag regex is literal: `updater-prerelease-feed.ts:13-14`).
2. **appId / bundle id**: `com.autoscalers.fabrica` (`config/electron-builder.config.cjs:49`). Keeping it across the rebrand preserves macOS update swaps, TCC grants (identifier+team anchored per `:351-363`), and ShipIt state; changing it creates a parallel app that won't update over old installs and re-prompts every permission. Decision needed, not just a find/replace.
3. **Signing identities**: Apple Developer ID secrets (`MAC_CERTS`, `APPLE_TEAM_ID` etc.) and SignPath organization/policy (`SIGNPATH_API_TOKEN`, org id, policy slugs in both workflows; publisherName `SignPath Foundation`). Rebrand may require new cert subject names → update `publisherName` (`electron-builder.config.cjs:290-292`) AND the signature-verification string-matches (`CN=SignPath Foundation` checks at `release-cut.yml:1429,1622,1729-1750` would need to follow).
4. **Web endpoints outside GitHub**: nudge config `https://onfabrica.dev/whats-new/nudge.json` (`src/main/updater-nudge.ts:12`) and diagnostics token URL `https://www.onfabrica.dev/diagnostics/token` (`release-mac-build.yml:120`). Domain strategy for "Fabrica" brand determines whether these move.
5. **Homebrew tap**: `Auto-Scalers/homebrew-fabrica`, cask tokens `fabrica` / `fabrica@rc`, buf0-bot app id 2590194 scoped to that tap (`homebrew-bump.yml:140-154`, `:65-92`; cask homepage `onfabrica.dev` `Casks/fabrica.rb:12`). New brand ⇒ new tap/casks or a redirect story.
6. **No staging percentages anywhere**: electron-updater's `stagingPercentage` mechanism is unused — zero matches for `stagingPercentage|staging` across `src/` and `config/`. Rollout control instead = (a) RC channel as soft staging (opt-in persisted override), (b) hourly/daily/adhoc repos as developer canaries, (c) publish-window last-good pinning protecting against partial publishes (`updater.ts:1394-1405`). If After-Rebrand wants gradual rollout, this is greenfield work; the generic-feed architecture makes server-side percentage routing straightforward (serve different `latest*.yml` by cohort).
7. **Draft-gated publishing discipline** is load-bearing for update safety: releases stay draft until ALL platform artifacts + manifests verified (`verify-release-required-assets.mjs:90-126`, `release-cut.yml:1895-1902`); the updater's readiness preflight is the client-side mirror of the same invariant (`updater-prerelease-feed.ts:124-150`). Preserve both when re-plumbing.
8. **Windows blockmap regeneration after signing** (`release-cut.yml:1587-1610`) must survive any change to signing order — differential updates depend on blockmap matching the SIGNED bytes.
9. **Dev-channel version semantics** (hourly sorts below its base RC via `-rc.N` stripping, `config/scripts/hourly-build-version.mjs:28-33`) prevent accidental cross-channel promotion; keep these ordering rules if channels survive the rebrand.
10. **Existing-install migration surface**: userData under `~/.fabrica` + Electron dirs keyed off productName/appId (`Casks/fabrica.rb:40-48`, zap list); NSIS uninstall daemon cleanup under LOCALAPPDATA (`config/electron-builder.config.cjs:321-325`); ShipIt cache path. A rename of productName/appId orphans these paths — plan a data-migration step in the production architecture.
11. **Telemetry build identity** rides the literal strings `stable|rc` injected at build time and verified post-build in app.asar (`release-mac-build.yml:92-111`, `:178-179`; verify script `config/scripts/verify-telemetry-constants.mjs`). Channel vocabulary is embedded in analytics — renaming channels has analytics migration cost.

---

## F. Scan-Coverage Statement

**Read in full (file-level):**
- `package.json` (317 lines)
- `config/electron-builder.config.cjs` (631 lines)
- `src/main/updater.ts` (2,329 lines, both halves)
- `src/main/electron-updater-loader.ts` (10)
- `src/shared/release-channel.ts` (223)
- `src/main/updater-nudge.ts` (89)
- `src/main/updater-release-builds.ts` (108)
- `src/main/updater-prerelease-feed.ts` (lines 1-150 of 271 — remainder is the readiness aggregation consumed via `fetchNewerReleaseTagsWithReadiness`; behavior documented from call sites)
- `.github/workflows/release-policy.yml` (98), `release-mac-build.yml` (179), `win-update-e2e.yml` (145), `homebrew-bump.yml` (199)
- `.github/workflows/release-cut.yml` — lines 1-400, 790-1009, 1790-1972 read directly; middle section (400-790 version math detail, 1010-1790 Windows SignPath steps) mapped via targeted grep with line-cited extraction of every SignPath/blockmap/verification step (rg hits at :985, :1002-1006, :1205-1207, :1260-1274, :1304-1331, :1352, :1407-1467, :1471-1583, :1587-1610, :1622, :1729-1750, :1782)
- `Casks/fabrica.rb` (49)

**Targeted grep (key lines extracted, not full reads):**
- `hourly-mac-build.yml`, `daily-mac-build.yml`, `adhoc-mac-build.yml` (cron/token/publish/ref-vetting lines cited above)
- `windows-signing-rehearsal.yml` (structure lines)
- `config/scripts/hourly-build-version.mjs` full; `dev-channel-base-version.mjs` key functions
- `config/scripts/verify-release-required-assets.mjs`, `generate-windows-blockmap.mjs` (existence + role)
- `src/main/updater-fallback.ts` exports; `src/shared/updater-windows-signature-check.ts` classification functions
- Channel override wiring: `attach-main-window-services.ts:191`, `types.ts:3515`, `client-ui-schemas.ts:252`
- `mobile-android-release.yml` trigger/tag shape

**Repo-wide searches:** `electron-updater|autoUpdater|setFeedURL|publish|feedURL|stagingPercentage` across `src/` + `config/`; `stagingPercentage|staging` (zero matches); `releaseChannelOverride` across main+shared.

**Skipped (out of scope for this task):**
- `Casks/fabrica@rc.rb` content (structure mirrors fabrica.rb per homebrew-bump.yml:72-77)
- Full bodies of `daily-mac-build.yml`/`adhoc-mac-build.yml` beyond cited sections (near-clones of hourly per header comments)
- `tests/tools/win-update-e2e/run.mjs` internals, remaining e2e/perf workflows (not distribution pipeline)
- `src/renderer/src/components/UpdateCard.tsx` UI internals (renderer-side display only; status protocol covered via updater.ts sendStatus)
- `src/main/local-builds/*` internals beyond their integration points in updater.ts
- `resources/icon-source/generate.sh`, icon pipeline (cosmetic, tracked elsewhere)

**Not found (explicit negative results):** any `stagingPercentage` usage; any non-GitHub update feed provider; any auto-update on Linux other than deb/rpm/AppImage flow described.

