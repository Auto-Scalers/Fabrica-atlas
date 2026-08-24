# R4-1.13 — Fabrica-app Auth / Account / Onboarding Deep Dive

> Round 4 discovery report · Task R4-1.13 (task_e20e93421cc2 / ctx_48147c8bf7dd) · READ-ONLY scan of `Fabrica-app/` (referred to below as `FA/`). All line numbers verified against working-tree files on 2026-08-23.
>
> Paths are relative to the `Fabrica-app/` repo root unless prefixed `atlas:/` (the Atlas board itself).

## 0. Executive Summary

Fabrica-app has **three separate authentication planes**, frequently confused with each other:

| Plane | What it authenticates | Protocol / storage | Entry points |
|---|---|---|---|
| A. Fabrica Cloud account ("FABRICA profiles") | User cloud identity, org membership, artifacts publishing, mobile pairing, relay director tokens | Browser OAuth 2.0 Authorization Code + PKCE (`S256`) against `https://login.onfabrica.dev`; per-profile session persisted as Electron `safeStorage`-encrypted JSON | Settings "Fabrica Account" pane, Artifacts panes, Mobile pane, DevTools pane |
| B. Supabase relay auth | Optional direct relay token for the runtime relay broker | Email+password `signInWithPassword`; token file at `userData/supabase-auth-storage.json` | IPC channels `supabaseAuth:*`; consumed by relay HTTP client + auth coordinator |
| C. Provider (agent) accounts | Per-provider CLI credentials so TUI agents run authenticated inside worktrees | Claude: macOS Keychain services (+ plaintext `.credentials.json` fallback on Linux/Win), FABRICA-owned OAuth refresh; Codex: per-account mirrored `CODEX_HOME/auth.json`; Grok: read-only auth-session freshness check | claude-accounts / codex-accounts / grok-accounts main modules |

Onboarding is a **5-step wizard** (`agent -> theme -> integrations -> windows_terminal -> notifications`, FA/src/renderer/src/components/onboarding/use-onboarding-flow-types.ts:9-13) with versioned resume remapping (flow version 4, FA/src/shared/constants.ts:62). Telemetry consent is a **fail-closed discriminated union** resolved through one pure function where env kill-switches outrank user settings (FA/src/main/telemetry/consent.ts:76-110).

**After-Rebrand headline:** brand strings live in *security-critical* places — macOS Keychain service names (FA/src/main/claude-accounts/keychain.ts:4-5), production OAuth endpoints/client-id constants (FA/src/main/fabrica-profiles/profile-cloud-auth-config.ts:19-21), env-var names (`FABRICA_TELEMETRY_DISABLED` consent.ts:82; `FABRICA_CLOUD_*` profile-cloud-auth-config.ts:75-122), and error codes (`FABRICA_cloud_auth_denied` profile-cloud-pkce.ts:102). Renaming these is NOT cosmetic: keychain service renames orphan stored credentials; endpoint renames break packaged-build fallbacks. See section 10.

---

## 1. Plane B (smallest): Supabase relay auth

### 1.1 Shared contract types

- `SupabaseAuthStatus = { configured, signedIn, email? }` — FA/src/shared/supabase-auth.ts:1-5.
- `SignInSupabaseArgs = { email, password }` — supabase-auth.ts:7-10; result `{ ok, error? }` :12-15; sign-out result :17-20.
- No signup type exists anywhere in this plane — there is **no account-creation flow**; only sign-in/sign-out/status.

### 1.2 Main-process session module

FA/src/main/runtime/relay/supabase-session.ts:

- Client creation gated on env vars `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_ANON_KEY`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (:17-19), `isSupabaseConfigured()` returns boolean :22.
- Because supabase-js has no localStorage in the Electron main process, a custom storage adapter persists the session to `join(app.getPath('userData'), 'supabase-auth-storage.json')` (:31-38).
- `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {...})` :88.
- `getSupabaseAuthStatus()` reads `supabase.auth.getSession()` :102-106.
- Relay token selection: `getRelayAuthToken(fallback)` prefers the Supabase access token over a fallback relay token (:117-118).
- Login is email+password only: `supabase.auth.signInWithPassword({ email, password })` (:147-151); logout via `supabase.auth.signOut()` (:156-160).

### 1.3 IPC surface and consumers

- Handlers registered in FA/src/main/ipc/supabase-auth.ts:14-26 — channels `supabaseAuth:getStatus` (:16), `supabaseAuth:signIn` (:21), `supabaseAuth:signOut` (:25); registration wired from FA/src/main/ipc/register-core-handlers.ts:59.
- Consumers: FA/src/main/runtime/relay/relay-session-broker.ts:18 and relay-http-client.ts:5 import `getRelayAuthToken`; relay-auth-coordinator.ts:3/:259-261 uses `getSupabaseAccessToken()` when the epoch is current.
- Rebrand flag: this is the only place a third-party auth vendor (Supabase) appears; migration could swap it for the Plane A relay-token endpoint (see 2.7) and delete the plane entirely.

---

## 2. Plane A: Fabrica Cloud account (FABRICA profiles)

This is the app's real "account system". Main-process module: FA/src/main/fabrica-profiles/ (49 files); shared types: FA/src/shared/fabrica-profiles.ts; renderer slice: FA/src/renderer/src/store/slices/fabrica-profiles.ts + fabrica-profiles-auth-actions.ts.

### 2.1 Auth configuration (endpoints, client, env overrides)

FA/src/main/fabrica-profiles/profile-cloud-auth-config.ts:

- `FABRICACloudAuthConfig` shape lists 11 endpoints incl. authorize/session/refresh/capabilities/profile/org/logout/relay-token + relayDirectorUrl + clientId + scope (:3-16).
- Defaults: scope `openid profile email offline_access` (:18), production base `https://login.onfabrica.dev` (:19), client id `FABRICA-desktop` (:20), relay director `https://relay.onfabrica.dev` (:21).
- Packaged-ness (not NODE_ENV) is the production signal for gating dev escape hatches (:25-31).
- URL hygiene: only https allowed unless loopback host AND unpackaged (:33-51).
- `getFABRICACloudAuthConfig()` (:66-125): packaged builds hard-fallback to the production constants (:78-83) because packaged bundles never get launch-time env injection; unconfigured => `setupMessage: 'Fabrica Cloud sign-in is not configured for this build.'` (:84-89). Every endpoint individually overridable via `FABRICA_CLOUD_AUTHORIZE_URL`, `..._SESSION_URL`, `..._REFRESH_URL`, `..._CAPABILITIES_URL`, `..._PROFILE_URL`, `..._ORG_URL`, `..._LOGOUT_URL`, `..._RELAY_TOKEN_URL`, plus `FABRICA_CLOUD_API_URL`, `FABRICA_CLOUD_AUTH_URL`, `FABRICA_RELAY_URL`, `FABRICA_CLOUD_CLIENT_ID`, `FABRICA_CLOUD_AUTH_SCOPE` (:75-122). Default paths under the API base: `/v1/desktop/auth/{authorize,session,refresh,capabilities,profile,org,logout,relay-token}` (:96-118).
- Plaintext-session dev hatch `FABRICA_CLOUD_ALLOW_PLAINTEXT_SESSION=1` requires non-production AND unpackaged (:127-134); dev-auth hatch `FABRICA_CLOUD_DEV_AUTH=1` likewise (:136-141).

### 2.2 Login flow: browser OAuth + PKCE over a loopback listener

FA/src/main/fabrica-profiles/profile-cloud-pkce.ts:

- `beginFABRICACloudPkceFlow(config, localProfileId)` returns `{ code, codeVerifier, nonce, redirectUri, state }` (:10-16, :43-46).
- Verifier/nonce/state = base64url of 32 random bytes each (:24-30, :47-49); challenge = S256 (:28-30). 5-minute auth timeout (:18, :117-119).
- Loopback HTTP server binds an ephemeral port on 127.0.0.1 (:122-128) and answers `/auth/callback`; mismatched state gets 400 but deliberately does NOT cancel the login ("stray loopback probes must not be able to cancel the user's login") (:94-98); `error` param cancels with code `FABRICA_cloud_auth_denied` (:99-104); success writes the branded callback success page from profile-cloud-callback-page.ts and resolves (:109-111).
- Authorize URL carries `client_id, response_type=code, redirect_uri, scope, nonce, state, code_challenge, code_challenge_method=S256` and a non-standard extra `local_profile_id` binding the cloud session to the local profile (:129-138); opened via `shell.openExternal` (:139-143).

Orchestration in FA/src/main/fabrica-profiles/profile-cloud-service.ts:

- `connectCurrentFABRICAProfile(userDataPath)` (:54): dev-auth shortcut path first (:58-66); unconfigured short-circuit (:68-74); then PKCE flow -> `exchangeFABRICACloudAuthCode(config, {...code, localProfileId})` -> `saveFABRICACloudSessionExchange(...)` -> `linkFABRICAProfileToCloud(...)` (:77-83). Cancellation (`FABRICA_cloud_auth_timeout|_denied`) maps to status `'cancelled'` (:40-41, :92-97); other failures to `'failed'` with message (:98-103).
- Sign-out `signOutCurrentFABRICAProfile` (:106-131): tombstones the cloud-session identity BEFORE network logout so an in-flight refresh cannot re-save after explicit sign-out (:112-119); revokes server-side session best-effort (:120-122); clears local session (:123); unlinks profile (:124).
- `createCloudLinkedFABRICAProfile` creates a new profile already linked to cloud (:133+); org selection via `selectCurrentFABRICAProfileOrg` (:189).

### 2.3 Session storage / token encryption

FA/src/main/fabrica-profiles/profile-cloud-session-store.ts:

- Session object: `{ accessToken, refreshToken, expiresAt, capabilities, organizations? }` (:20-26); strict validator checks all fields incl. `capabilities.flags` and org rows (:62-97).
- Persisted per-profile at `<profileDir>/account-session.json.enc` (:99-101); directory helper in profile-storage-paths.ts.
- Write priority: Electron `safeStorage.encryptString` when OS encryption available -> format `electron-safe-storage-v1` (:109-119); else dev plaintext ONLY if the config hatch allows (`dev-plaintext-v1`) (:121-131); else **memory-only** — production never silently falls back to disk plaintext ("refresh tokens must not silently fall back to plaintext") (:133-136).
- Read path validates format/version, decrypts, re-validates shape, repopulates memory cache (:168-225); unsupported/undecryptable => status `decrypt-failed` with user-facing error strings like 'Could not decrypt saved Fabrica account session.' (:218-224).
- `saveFABRICACloudSessionExchange` records a successful-login identity marker before saving (:139-152); `saveFABRICACloudSessionIfCurrent` guards against a stale async refresh resurrecting a signed-out/org-switched session by sharing one main-process turn between check and save (:154-166).
- `clearFABRICACloudSession` drops memory entry and deletes file (:227-230).
- Low-level file writer is `writeSecureJsonFile` from FA/src/shared/secure-file.ts (imported :4).

### 2.4 Refresh, rotation, single-flight, reconnect semantics

FA/src/main/fabrica-profiles/profile-cloud-session-refresh.ts:

- Proactive refresh skew 60 s (:17, :27-29); auth failure = `FABRICACloudRequestError` with 401/403 (:31-35).
- Refresh is **single-flight per (userDataPath, profileId)** because refresh tokens rotate and a duplicate POST can trip server reuse detection and revoke the whole family (:37, :76-84 comment, :80-126).
- Rotation safety: concurrent caller detects another rotation by comparing stored refreshToken and adopts the winner's result (:86-90); identity (cloudUserId/cloudProfileId/organizationId) must be unchanged or `StaleCloudSessionMutationError` (:94-104); save uses the mutation-snapshot guard (:112-116); relinks profile to refreshed cloud identity (:117).
- On refresh failure the loser-safe clear only wipes storage if the FAILED refresh token is still current (:49-69).
- `readFreshFABRICACloudSession` (:128-152) and `forceRefreshFABRICACloudSession` (:154-172) both degrade to `reconnect-required` on auth failure; `runWithFreshFABRICACloudSession` wraps any operation with one automatic refresh-retry, then clears the session only for a post-refresh **401** — a 403 is surfaced as a failed operation instead of destroying a valid session (:174-213, esp. comment :202-205).
- HTTP client + retry tests: profile-cloud-client.ts (+ .test.ts), profile-cloud-service-refresh.test.ts, profile-cloud-service-auth-retry.test.ts.

### 2.5 Org membership & capabilities

- Org summaries carried inside the session (`organizations?: FABRICACloudOrgSummary[]`, session-store.ts:25) with role strings (:81-97).
- Dedicated clients/services: profile-cloud-org-members-client.ts + -service.ts (+ tests); selection logic profile-cloud-org-selection.ts.
- Capabilities flags refreshed via profile-cloud-capability-refresh.ts and the `/v1/desktop/auth/capabilities` endpoint (auth-config.ts:105-107).
- Session exchange response type: profile-cloud-session-exchange.ts.

### 2.6 Profile index, project transfer, UI scoping

- Local profile registry: profile-index-store.ts (+ test); persistence deadline profile-persistence-deadline.ts.
- Per-project state/transfer: profile-project-presence.ts, -session-state.ts, -session-transfer.ts, -transfer-payload.ts, -transfer.ts, -source-removal.ts, -state-file.ts, -worktree-identity.ts (all with tests where listed).
- Renderer-facing visibility rules: profile-ui-scope.ts (+test).

### 2.7 Relay director tokens

- The config exposes a dedicated `relayTokenEndpoint` (`/v1/desktop/auth/relay-token`, auth-config.ts:116-118) — i.e., Plane A can mint relay credentials, making Plane B (Supabase) redundant long-term. Consumers of relay auth (relay-http-client/relay-auth-coordinator) currently prefer Supabase token when present (supabase-session.ts:117-118).

---

## 3. Plane C-1: Claude provider accounts (claude-accounts)

Module: FA/src/main/claude-accounts/ — service.ts (login, credential capture, Keychain storage, selection, rate-limit refresh per its header comment :2), keychain.ts, oauth-refresh.ts, runtime-auth-service.ts, runtime-selection.ts, managed-auth-path.ts, live-pty-gate.ts, claude-duplicate-account.ts, environment.ts, runtime-paths.ts, windows-command-invocation.ts (+ tests incl. claude-login-completion.oracle.test.ts).

### 3.1 macOS Keychain storage

FA/src/main/claude-accounts/keychain.ts:

- Two services: active-account `'Claude Code-credentials'` (:4) and FABRICA-managed per-account store `'Fabrica Claude Code Managed Credentials'` (:5). Account field = OS user for the active service (:81-83) or the accountId for managed entries (:64-79).
- Claude Code 2.1+ scopes keychain items by config dir: service name gets `-` + first 8 hex of sha256(CLAUDE_CONFIG_DIR) (:85-93); readers probe both scoped and legacy service (:95-100).
- All operations shell out to `/usr/bin/security` (`find-generic-password`/`add-generic-password -U`/`delete-generic-password`) and are darwin-only no-ops elsewhere (:102-150); 3 s timeout with explicit child kill (:6, :180-233).
- Runtime-scoped write `writeActiveClaudeKeychainCredentialsForRuntime` mirrors credentials into BOTH the scoped service and the legacy active service (:38-48).

### 3.2 Login flow

FA/src/main/claude-accounts/service.ts:

- Interactive login is driven through the real CLI in an isolated temp config dir: `runClaudeCommand(['auth','login','--claudeai'], tempConfig, LOGIN_TIMEOUT_MS, ...)` (:597) with an AbortController (:581-586, :594); Windows temp dir via `mkdtempSync(join(tmpdir(),'FABRICA-claude-login-'))` (:653); WSL path resolves distro + creates `mktemp -d .../FABRICA-claude-login.XXXXXX` (:659-676, :924). Stdin kept open so hidden managed-login runs do not tear down (:1087).
- OAuth denial is detected by regex on output because Claude leaves the login process running after denial (:53-55); post-login the account email must resolve or login fails with 'Claude login completed, but Fabrica could not resolve the account email.' (:255, :341).
- Credential capture failure raises 'Claude login completed, but no OAuth credentials were captured.' (:724).
- Adoption path: if a user already ran `claude login` themselves (e.g., into a temp dir), Fabrica can adopt those credentials; on Linux/Windows credentials are plaintext `.credentials.json`, macOS uses the Keychain (:202-219 comment block). A one-way pre-login credential baseline RPC avoids clobbering a legacy Keychain value not observed before login (:117-118, :237-238 comments).

### 3.3 FABRICA-owned OAuth refresh

FA/src/main/claude-accounts/oauth-refresh.ts:

- Token endpoint `https://platform.claude.com/v1/oauth/token`, public client id `9d1c250a-e61b-44d9-88ed-5944d1962f5e` — verified against installed claude 2.1.177 (:9-10 with rationale comment :4-8).
- FABRICA owns the refresh so single-use refresh tokens rotate atomically instead of being scraped back after the CLI rotates them (:6-8). 5-minute expiry buffer matching the CLI (:12-14); 10 s request timeout (:15).
- `isOauthTokenExpiring` treats missing/NaN expiresAt as needs-refresh (:65-75); `applyRefreshedToken` merges only fields present in the response and persists rotated refresh_token (:83-114); refresh posts form-urlencoded grant_type=refresh_token through Chromium net.fetch so env-proxy bridge applies (:139-151); non-OK statuses logged WITHOUT tokens (:152-159); never throws — null means "keep existing credentials" (:116-123, :163-169).
- Proxy bootstrap via ensureElectronProxyFromEnvironment (:133-136).

### 3.4 Selection / runtime plumbing

- runtime-selection.ts picks which stored account a session runs as; runtime-auth-service.ts exposes auth state; managed-auth-path.ts locates the managed credentials path; live-pty-gate.ts gates interactive logins behind a visible PTY; claude-duplicate-account.ts clones an account entry; windows-command-invocation.ts wraps command invocation for Windows; environment.ts/runtime-paths.ts supply CLAUDE_CONFIG_DIR-style envs.

---

## 4. Plane C-2: Codex provider accounts (codex-accounts)

Module: FA/src/main/codex-accounts/ — service.ts, runtime-home-service.ts, codex-auth-identity.ts, codex-credential-absence-grace.ts, host-codex-managed-home-ownership.ts, legacy-shared-auth-migration.ts, legacy-shared-config-compatibility.ts, managed-codex-auth-readiness.ts, runtime-selection.ts, wsl-codex-command.ts, fs-utils.ts (+ tests).

Key mechanics (from runtime-home-service.ts):

- Per-account **mirrored CODEX_HOME**: each managed account gets a self-contained home where `auth.json` lives and codex refreshes it in place, "so two accounts never race one auth.json"; WSL accounts keep a per-distro lane (:310-313).
- State tracked per runtime home includes which managed account the mirrored auth.json belongs to (null = follows system-default ~/.codex), the last auth.json contents FABRICA wrote (a later diff signals out-of-band change: Codex token refresh or external login to adopt), and WSL-awareness because per-distro homes must not share the host baseline (:173-207).
- Transient auth.json read/parse failures must not deselect an account (:186); a missing/unreadable file is usually codex rotating it, assessed via `credentialAbsenceGrace.assess(join(perAccountHome,'auth.json'))` (:358-368).
- Host managed-home ownership asserted via assertOwnedHostCodexManagedHomePath (:75); WSL env segments from pty/codex-home-wsl-env (:34).
- Returning null tells the PTY/env layer to inject NO managed CODEX_HOME (:246); readiness checks in managed-codex-auth-readiness.ts.
- Legacy migration: legacy-shared-auth-migration.ts moves shared legacy auth into per-account homes (runtime-home-service-per-account-migration.test.ts), with compatibility shims in legacy-shared-config-compatibility.ts.
- Service surface (service.ts): class-based, e.g. `addAccount(target?)` :283 and `addAccountFromHome(...)` :293 — i.e., Codex accounts are added by driving a login or adopting an existing HOME's credentials rather than browser PKCE.

---

## 5. Plane C-3: Grok provider accounts (read-only status)

FA/src/main/grok-accounts/status.ts: `getGrokAccountStatus()` reads the Grok auth session via `readGrokAuthSession()` from ../rate-limits/grok-auth (:2, :5) and derives freshness via `isGrokAccessTokenFresh`. No write/login path lives here — Grok login happens inside the agent TUI; Fabrica only observes token freshness for status UI.

---

## 6. Local account runtime resolution

FA/src/shared/local-account-runtime.ts: `resolveLocalAccountRuntimeTarget(...)` (:15) with type `LocalAccountRuntimeTarget` (:4) and distro normalization (:37) — maps (provider, host, distro) to the correct local runtime target so per-provider credentials land in the right environment (native vs WSL distro).

---

## 7. Account UI surfaces (renderer)

### 7.1 Store actions

FA/src/renderer/src/store/slices/fabrica-profiles-auth-actions.ts:

- Five auth actions: `createCloudLinkedFABRICAProfile`, `connectCurrentFABRICAProfile`, `refreshCurrentFABRICAProfileAuth`, `signOutCurrentFABRICAProfile`, `selectFABRICAProfileOrg` (:13-22); split into its own module because the combined slice exceeded the line budget (:24-26).
- All call `window.api.FABRICAProfiles.*` (:35, :78, :123) and update `FABRICAProfileAuthStatus` plus profile list state; user feedback via sonner toasts: 'Cloud profile created' (:47), 'Reconnect this profile' (:51, :135), 'Fabrica Cloud sign-in is not configured' (:92-93), 'Profile connected' (:105), 'Failed to connect profile' (:101), 'Failed to refresh profile auth' (:139). Connection is guarded against double-click via `FABRICAProfileConnecting` (:73-76).

### 7.2 Settings panes and gates

- FA/src/renderer/src/components/settings/FabricaAccountSettingsPane.tsx:39-42 — the main account pane; reads `FABRICAProfileAuthStatus`, wires connect + fetchAuthStatus.
- Artifacts gating: settings/ArtifactsSettingsPane.tsx:20-23; artifacts/ArtifactsPage.tsx:18-20 with identity recheck at :93 (`artifactAccountIdentity(...)` must match requested identity); artifacts/ArtifactPublishButton.tsx:37-39 — publish requires connected cloud account.
- Mobile pairing: settings/MobilePane.tsx:44 and components/mobile/MobilePage.tsx:40 gate on `FABRICAProfileAuthStatus?.state === 'connected'`; connection options in settings/MobilePairingConnectionOptions.tsx:54-57.
- DevToolsPane.tsx:133-137 exposes auth status/connect/refresh for debugging.
- Sign-out confirmation dialog: components/fabrica-profiles/FabricaProfileSignOutConfirmDialog.tsx (+ test).
- Status shape has states `configured/local/reconnect-required/connected` per the tests (FabricaAccountSettingsPane.test.tsx:66/:92/:105, ArtifactsSettingsPane.test.tsx:48/:87/:96/:111).

---

## 8. Onboarding wizard

Location: FA/src/renderer/src/components/onboarding/ (~40 files). Orchestrator hook: use-onboarding-flow.ts; UI shell: OnboardingFlow.tsx + OnboardingFooter.tsx + OnboardingSkipConfirmationDialog.tsx.

### 8.1 Steps and skip rules

- Canonical steps (use-onboarding-flow-types.ts): step numbers 1-5 = agent, theme, integrations, windows_terminal, notifications (:1-14).
- Integrations step auto-skips when `gh` CLI already installed (use-onboarding-flow.ts:28-32); windows_terminal step skips off-Windows (:34-36); skipped steps are removed from the stepper dots, not rendered dead (:317-324), and resume resolves forward past them (:51-66).
- Final step constant `ONBOARDING_FINAL_STEP = 5` and flow version `ONBOARDING_FLOW_VERSION = 4` (FA/src/shared/constants.ts:61-62).
- Completing notifications closes onboarding and opens the Add Project modal ('Opening Add Project...' :541-547); "Skip to project setup" does the same handoff from any optional step (:588-656, esp. :613-640) after saving visible preferences (theme revert to entry theme :157-165; agent choice saved even when skipping :166-169).

### 8.2 Resume / versioned migration

- `remapOpenOnboardingLastCompletedStep` maps older flow versions onto current steps: v4 passthrough; completed>=4 => final; v3 resumes min(4, lastCompleted) since step 4 was notifications pre-Windows-terminal (:109-112); v2 maps old agent-setup step positions (:113-122); generic fallback remaps 3/4 to 2 and >=5 to 3 (:123-132).
- Show gate: App lazily mounts `<OnboardingFlow>` only when `onboarding !== null && onboarding.closedAt === null` (should-show-onboarding.ts:5-7).
- Step persistence hook: use-onboarding-flow-persistence.ts (`persistStep`, `usePersistCurrentStep` imported :13); skipped-through progress persists at the next visible page (:550-566, comment :552).

### 8.3 Per-step behavior

- AgentStep.tsx (+test): agent catalog pick with detected-agent auto-select on first mount only (:461-476) re-running PATH detection because session cache can be poisoned (:468 comment); click-time telemetry captures mind-changes incl. collapsed-disclosure origin (:286-309).
- ThemeStep.tsx (+ThemeStep.test.ts, theme-chrome-preview.tsx): live preview applies document theme immediately (:353-355) with unmount-only revert via lifecycle root ref (:434-441).
- IntegrationsStep.tsx: GitHub/Linear task-source statuses derived from preflight store (:68-89) with snapshot telemetry at exit (:443-459).
- WindowsTerminalStep.tsx (+windows-terminal-onboarding-telemetry.ts): Windows-specific terminal setup snapshot events.
- NotificationStep.tsx: notification preferences (enable/sound via getNotificationSoundOptions :15, macOS permission card :19).
- FeatureSetupInlineTerminal / OnboardingInlineCommandTerminal: inline command execution for feature setup (runtime in onboarding-feature-setup.ts).
- GhosttyDiscoveryRow.tsx: discovery of ghostty config.
- Dismiss targets: onboarding-dismiss-target.ts.

### 8.4 Onboarding telemetry

Events emitted by the flow (all through renderer track()): `onboarding_started` with resumed_from_step (StrictMode double-invoke guarded :403-419), `onboarding_step_viewed` (:423-429), `onboarding_step_completed` with duration_ms + advanced_via (:498-530), `onboarding_task_sources_snapshot` (:443-459), `onboarding_windows_terminal_snapshot` (:510-520, :629-639), `onboarding_agent_picked` (:296-306), `onboarding_step_skipped` (:620-625). Related shared modules: FA/src/shared/onboarding-tour-telemetry-events.test.ts, contextual-tours.ts, feature-wall-setup-steps.ts; main-side cohort classification: src/main/telemetry/onboarding-cohort-classifier.ts + onboarding-feature-setup-validator.test.ts.

---

## 9. Telemetry & consent gates

### 9.1 Consent resolver (main, pure)

FA/src/main/telemetry/consent.ts:

- Precedence: (1) `DO_NOT_TRACK` truthy -> disabled/do_not_track (:77-80); (2) `FABRICA_TELEMETRY_DISABLED` truthy -> disabled/FABRICA_disabled (:81-84); (3) ANY CI env present from a fixed list of 8 vars (CI, GITHUB_ACTIONS, GITLAB_CI, CIRCLECI, TRAVIS, BUILDKITE, JENKINS_URL, TEAMCITY_VERSION) -> disabled/ci (:26-35, :85-90); (4) stored `settings.telemetry.optedIn === true|false` (:101-106); missing settings fail CLOSED to `pending_banner` (:93-99); null optedIn = existing-user pending banner (:108-109).
- Truthy parsing accepts only `1`/`true`; anything else warns once per var ("treating as unset") (:40-68).
- Env/CI paths are non-persistent — they never mutate the stored preference (:5-7 header).
- State type shared across IPC: FA/src/shared/telemetry-consent-types.ts:11-17 (`enabled | disabled{reason} | pending_banner`) chosen so the Privacy pane can pattern-match reasons without re-deriving rules (:4-9).

### 9.2 Transport client (main)

FA/src/main/telemetry/client.ts:

- One posthog-node client (:11, :39) with host `https://us.i.posthog.com` (:104); `$process_person_profile:false` attached per capture — no PostHog person per install_id (:5-6); install id from install-id.ts.
- Batching flushAt 20 / flushInterval 10 s (:105-106); boot-time opt-out flips SDK `optedOut` so even direct SDK capture drops (:113-114, :119-122); consent re-resolved live from settings (:183); shutdown gate drops late IPC tracks during flush (:169, :299-306).
- Supporting modules: burst-cap.ts (rate limiting), classify-error.ts, validator.ts + validator-warn-cache (payload validation), cohort-classifier.ts, client-lifecycle.test.ts.
- Renderer bridge: FA/src/renderer/src/lib/telemetry.ts — `track()` fire-and-forget over IPC (:29-37), `setOptIn` (:41), `getConsentState` (:55), `acknowledgeBanner` (:67).

### 9.3 Consent UI surfaces

- First-launch banner: components/TelemetryFirstLaunchSurface.tsx + FirstLaunchBanner.tsx (pending_banner flow; acknowledgeBanner IPC above).
- Privacy pane: components/settings/PrivacyPane.tsx renders helper text per disabled-reason and hosts the opt-in toggle.
- Separate consent system (unrelated to telemetry): plugin capability consent — FA/src/shared/plugins/plugin-consent-fingerprint.ts, plugin-consent-request.ts, plugin-consent-state.ts, plugin-capability-gate.ts (+tests) fingerprint consent grants so changed manifests re-prompt.

---

## 10. After-Rebrand brand-migration flags (accounts domain)

Ranked by blast radius. "Brand string" = any user-visible or externally-stable identifier containing Fabrica/FABRICA.

1. **macOS Keychain service names (breaking, data-losing if naive)** — `'Claude Code-credentials'` is third-party-canonical and must NOT change (keychain.ts:4); `'Fabrica Claude Code Managed Credentials'` (:5) is ours — renaming it orphans every stored managed account unless a migration copies items under the old service first. Same for the sha256-scoped suffix scheme (:85-93).
2. **Production OAuth endpoints + client id** — `login.onfabrica.dev`, `relay.onfabrica.dev`, client `FABRICA-desktop` (profile-cloud-auth-config.ts:19-21). Packaged builds hard-fallback to these (:78-83), so a rebrand MUST ship new constants in the same release the server switches; env overrides exist but packaged builds cannot rely on them (:76-77 comment).
3. **Env-var contract** — `FABRICA_CLOUD_API_URL/_AUTH_URL/_AUTHORIZE_URL/_SESSION_URL/_REFRESH_URL/_CAPABILITIES_URL/_PROFILE_URL/_ORG_URL/_LOGOUT_URL/_RELAY_TOKEN_URL/_CLIENT_ID/_AUTH_SCOPE`, `FABRICA_RELAY_URL` (:75-122), `FABRICA_CLOUD_ALLOW_PLAINTEXT_SESSION` (:132), `FABRICA_CLOUD_DEV_AUTH` (:140), `FABRICA_TELEMETRY_DISABLED` (consent.ts:82), plus Supabase `SUPABASE_*`/`NEXT_PUBLIC_SUPABASE_*` (supabase-session.ts:17-19). Renaming breaks CI/dev docs and any operator scripts; consider accepting BOTH names during transition.
4. **IPC channel names** — `supabaseAuth:getStatus|signIn|signOut` (ipc/supabase-auth.ts:16/:21/:25) and the whole `window.api.FABRICAProfiles.*` preload surface (fabrica-profiles-auth-actions.ts:35/:78/:123). Channel renames require synchronized main/preload/renderer changes; grep for literal strings.
5. **Error codes / message keys** — `FABRICA_cloud_auth_denied`, `_timeout`, `_callback_failed`, `_loopback_unavailable`, `_browser_open_failed` (pkce.ts:102, :118, :113, :125, :141; matched by service.ts:40-41) are semantic codes, not display text — safe to keep, but i18n keys like 'auto.store.slices.FABRICA.profiles.*' are generated from source strings and will churn.
6. **Temp dir prefixes & storage paths** — `FABRICA-claude-login-*` temp dirs (service.ts:653, :669), `account-session.json.enc` filename (session-store.ts:100), `supabase-auth-storage.json` (supabase-session.ts:38): renaming file paths strands existing sessions on upgrade; keep filenames, change only surrounding dirs if needed.
7. **Telemetry event/prop vocabulary** — PostHog events (`onboarding_started`, `onboarding_step_viewed`, ...) and reasons (`FABRICA_disabled`) feed dashboards; reason enum rename would split historical cohorts (telemetry-consent-types.ts:15).
8. **User-facing copy** — setupMessage 'Fabrica Cloud sign-in is not configured for this build.' (:87), decrypt error 'Could not decrypt saved Fabrica account session.' (session-store.ts:222), toast copy in 7.1, callback success page (profile-cloud-callback-page.ts). Lowest risk; go through i18n locale files (renderer/src/i18n/locales).

Non-issues for rebrand: PKCE/state/nonce logic, refresh single-flight, consent precedence — all brand-agnostic.

---

## 11. Architecture observations

- Plane A is unusually rigorous for a desktop app: mutation tombstones + snapshot-guarded saves prevent post-sign-out resurrection (session-refresh.ts:49-69; service.ts:112-119); single-flight rotation prevents token-family revocation (:76-84); loser-safe clears prevent concurrent-wipe bugs (:52-69).
- Provider-account design diverges per provider by necessity: Claude = OS keychain + owned OAuth refresh; Codex = filesystem home mirroring with adoption of out-of-band logins; Grok = observation only. Any unification layer must preserve these three models.
- Onboarding carries its own mini state machine with versioned migrations (8.2) — a pattern worth keeping under After-Rebrand since stored `OnboardingState.flowVersion` persists in user settings.
- Consent architecture is centralized enough that adding a new kill-switch is a one-function change (consent.ts:76+), and fail-closed defaults are enforced at three layers (resolver :93-99, SDK optOut :113-114, memory-only session fallback session-store.ts:133-136).

---

## 12. Scan coverage statement

**Scanned in full (read line-by-line):** shared/supabase-auth.ts (20/20 lines); main/ipc/supabase-auth.ts (26/26); main/fabrica-profiles/profile-cloud-auth-config.ts (141/141); profile-cloud-pkce.ts (146/146); profile-cloud-session-store.ts (230/230); profile-cloud-session-refresh.ts (213/213); profile-cloud-service.ts (lines 40-149 of 234 + export map via grep); claude-accounts/keychain.ts (233/233); claude-accounts/oauth-refresh.ts (170/170); telemetry/consent.ts (110/110); shared/telemetry-consent-types.ts (17/17); renderer/store/slices/fabrica-profiles-auth-actions.ts (lines 1-150 of 211); onboarding/use-onboarding-flow.ts (706/706); onboarding/use-onboarding-flow-types.ts (14/14); onboarding/should-show-onboarding.ts (7/7); renderer/lib/telemetry.ts (grep-level: exports + track/setOptIn/getConsentState/acknowledgeBanner bodies at :29-37/:41/:55/:67).

**Scanned via targeted grep (exports, signatures, key comments, cited lines verified):** runtime/relay/supabase-session.ts (37 matches incl. all cited lines); relay-session-broker.ts / relay-http-client.ts / relay-auth-coordinator.ts (import/call sites); ipc/register-core-handlers.ts:59; codex-accounts/runtime-home-service.ts (~25 cited/comment lines across :34-:368); codex-accounts/service.ts (export/class surface :283/:293); claude-accounts/service.ts (~30 signature/logic lines incl. all quoted errors); grok-accounts/status.ts (full function head :2-24); shared/local-account-runtime.ts (export surface); shared/constants.ts:61-62/:147; telemetry/client.ts (~20 cited lines); renderer/lib/telemetry.ts; store slice usage grep across components (70 matches reviewed for account UI surfaces: MobilePage, ArtifactsPage, ArtifactPublishButton, ArtifactsSettingsPane, DevToolsPane, FabricaAccountSettingsPane, MobilePane, MobilePairingConnectionOptions, FabricaProfileSignOutConfirmDialog); onboarding directory file inventory (40 files listed; NotificationStep/AgentStep/ThemeStep/IntegrationsStep/WindowsTerminalStep/inline terminals covered via their integration points in use-onboarding-flow.ts rather than full reads).

**Directory inventories enumerated (names only, not full reads):** src/main/fabrica-profiles/ (49 files), src/main/claude-accounts/ (21), src/main/codex-accounts/ (22), src/main/grok-accounts/ (2), src/main/telemetry/ (22), components/onboarding/ (40), components/fabrica-profiles/ (3), src/main/providers/ (inventoryed; assessed OUT OF SCOPE — it is a PTY/filesystem/git provider abstraction, NOT auth; only its name overlaps this task).

**Skipped / explicitly out of scope:** full reads of remaining fabrica-profiles project-transfer/org-member files (covered structurally, section 2.6); claude-accounts/runtime-auth-service.ts, runtime-selection.ts, managed-auth-path.ts, live-pty-gate.ts, claude-duplicate-account.ts internals (role documented from module map + service.ts call sites, bodies unread); codex legacy migration file bodies; mobile/ app-side auth (separate codebase under FA/mobile/); _sources/mission-control and _sources/buzz (different task family); tests read only where they document behavior cited above.

*Report end — R4-1.13.*

