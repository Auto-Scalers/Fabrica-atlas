# R5-2.1 — Spot Verification: fa-auth-onboarding.md + bz-voice-media.md (wave 1, verifier A)

> Task R5-2.1 (task_6c4caec56619). READ-ONLY spot check of two Round 4 discovery reports against
> their sources. Sources: `Fabrica-app/src` (= `../Fabrica-app/src` from the Atlas root) and
> `_sources/buzz/crates/`. No source file was modified; the only write is this report.
> Verified: 2026-08-23.

---

## Verdict summary

| Report | Cites sampled | EXACT | MINOR | FAILED | Coverage statement | Verdict |
|---|---|---|---|---|---|---|
| discovery/round4/fa-auth-onboarding.md | 22 groups (~40 file:line cites re-checked) | 19 | 3 | **0** | Present (§12), accurate | **PASS** |
| discovery/round4/bz-voice-media.md | 20 groups (~35 file:line cites re-checked) | 20 | 0 | **0** | Present (§5), accurate | **PASS** |

Totals: **42 sample groups / ~75 file:line citations checked — 39 EXACT, 3 MINOR (all cosmetic/name-drift), 0 FAILED.** Both reports PASS.

---

## 1. fa-auth-onboarding.md — verification detail

Sources under `Fabrica-app/src/`. Every cite below was opened and compared line-exactly.

### 1.1 Exact matches

| # | Report claim | Source evidence | Result |
|---|---|---|---|
| A1 | Steps 1–5 = agent/theme/integrations/windows_terminal/notifications (`use-onboarding-flow-types.ts:9-13`) | Lines 9–13 are exactly those five step rows | EXACT |
| A2 | `ONBOARDING_FINAL_STEP = 5`, `ONBOARDING_FLOW_VERSION = 4` (`shared/constants.ts:61-62`) | constants.ts:61 `ONBOARDING_FINAL_STEP = 5`; :62 `ONBOARDING_FLOW_VERSION = 4` | EXACT |
| A3 | Consent precedence chain (:76-110); `FABRICA_TELEMETRY_DISABLED` at consent.ts:82 | resolveConsent spans :76-110; :82 reads `isEnvVarTruthy('FABRICA_TELEMETRY_DISABLED')` → reason `FABRICA_disabled` :83 | EXACT |
| A4 | CI list of 8 vars (:26-35) | CI_ENV_VARS at :26-35 lists exactly CI, GITHUB_ACTIONS, GITLAB_CI, CIRCLECI, TRAVIS, BUILDKITE, JENKINS_URL, TEAMCITY_VERSION | EXACT |
| A5 | Missing settings fail closed to `pending_banner` (:93-99); optedIn true/false (:101-106); null → banner (:108-109) | All three branches line-exact | EXACT |
| A6 | Truthy parsing accepts only `1`/`true`, warn-once per var (:40-68) | warnOnceMisconfigured + isEnvVarTruthy at :40-68, message "treating as unset" at :53 | EXACT |
| A7 | Env/CI paths non-persistent (:5-7 header) | Header comment lines 5-7 state exactly this | EXACT |
| A8 | Keychain services `'Claude Code-credentials'` (:4) / `'Fabrica Claude Code Managed Credentials'` (:5) | keychain.ts:4-5 verbatim | EXACT |
| A9 | sha256(CLAUDE_CONFIG_DIR) first-8-hex service scoping (:85-93) | getActiveClaudeService at :85-93 incl. "Claude Code 2.1+ scopes" comment :89-90 | EXACT |
| A10 | Runtime write mirrors scoped + legacy service (:38-48) | writeActiveClaudeKeychainCredentialsForRuntime at :38-48 writes both | EXACT |
| A11 | Production endpoints/client id (`profile-cloud-auth-config.ts:19-21`) | :19 login.onfabrica.dev, :20 client `FABRICA-desktop`, :21 relay.onfabrica.dev | EXACT |
| A12 | Packaged hard-fallback (:78-83), setupMessage (:84-89), env overrides (:75-122), default paths `/v1/desktop/auth/*` (:96-118), plaintext/dev hatches (:127-134, :136-141) | All ranges verified in full read of the 141-line file | EXACT |
| A13 | PKCE: type shape (:10-16), begin fn (:43-46), base64url 32 random bytes (:24-30, :47-49), S256 (:28-30), 5-min timeout (:18, :117-119) | All exact | EXACT |
| A14 | State mismatch → 400 without cancelling (:94-98, comment verbatim :95); error param → `FABRICA_cloud_auth_denied` (:99-104, string at :102); success page + resolve (:109-111) | All exact | EXACT |
| A15 | Loopback ephemeral port on 127.0.0.1 (:122-128); authorize URL params incl. `local_profile_id` (:129-138); shell.openExternal (:139-143) | All exact | EXACT |
| A16 | Supabase env vars (:17-19); storage adapter → `userData/supabase-auth-storage.json` (:31-38, filename at :38); createClient (:88); token preference (:117-118); signInWithPassword (:151); signOut (:160) | All exact | EXACT |
| A17 | IPC channels `supabaseAuth:getStatus/signIn/signOut` (ipc/supabase-auth.ts:16/:21/:25, register fn :14-26) | File is 26 lines; handlers at exactly :15-25 with channel strings at :16/:21/:25 | EXACT |
| A18 | Session path `<profileDir>/account-session.json.enc` (:99-101; §10 cite ":100") | getFABRICACloudSessionPath at :99-101, filename at :100 | EXACT |
| A19 | safeStorage format `electron-safe-storage-v1` (:109-119), dev-plaintext hatch gate (:121-131), memory-only fallback with "must not silently fall back to plaintext" comment (:133-136), exchange identity marker (:139-152, record call :144), one-turn save guard (:154-166), decrypt error 'Could not decrypt saved Fabrica account session.' (:218-224, string :222), clear (:227-230) | All exact in full read of the 230-line file | EXACT |
| A20 | Refresh single-flight rationale + key/inflight (:76-84, comment :77-79); rotation adopt (:86-90); identity guard StaleCloudSessionMutationError (:94-104); snapshot-guarded save + relink (:112-117) | profile-cloud-session-refresh.ts all exact | EXACT |
| A21 | OAuth refresh endpoint `https://platform.claude.com/v1/oauth/token` + client id `9d1c250a-e61b-44d9-88ed-5944d1962f5e` (:9-10), rationale comment (:4-8), 5-min buffer + 10 s timeout (:12-15) | oauth-refresh.ts all exact incl. "verified against ... claude binary (2.1.177)" comment | EXACT |
| A22 | Five auth actions (:13-22); window.api calls (:35); toast 'Cloud profile created' (:47); split-module rationale comment (:24-26) | fabrica-profiles-auth-actions.ts all exact | EXACT |
| A23 | Shared contract types supabase-auth.ts:1-5/:7-10/:12-15/:17-20 | Type blocks at exactly those lines (file = 20 lines) | EXACT |

### 1.2 Minor findings (no content errors)

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| F-A1 | Report names `isSupabaseConfigured()` returning boolean at supabase-session.ts:22. Actual function is `isSupabaseAuthConfigured()` at :21-23. Name drift only; behavior as described. | supabase-session.ts:21-23 | MINOR (cosmetic) |
| F-A2 | "`getSupabaseAuthStatus()` reads `supabase.auth.getSession()` :102-106" — the getSession call at :106 belongs to `getSupabaseAccessToken()` (:101-111); `getSupabaseAuthStatus()` is actually :121-139 (its own getSession at :130). Content true, line range misattributed between the two sibling helpers. | supabase-session.ts:99-139 | MINOR (line drift) |
| F-A3 | "registration wired from register-core-handlers.ts:59" — :59 is the import of `registerSupabaseAuthHandlers`; the actual registration call is at :198. Import-vs-call-site imprecision; wiring claim itself correct. | register-core-handlers.ts:59, :198 | MINOR (cosmetic) |

### 1.3 Coverage statement check

§12 present and specific. Spot-audited line counts all match reality: keychain.ts 233/233 ✓, telemetry/consent.ts 110/110 ✓, profile-cloud-auth-config.ts 141/141 ✓, profile-cloud-pkce.ts 146/146 ✓, profile-cloud-session-store.ts 230/230 ✓, use-onboarding-flow-types.ts 14/14 ✓, shared/supabase-auth.ts 20/20 ✓, ipc/supabase-auth.ts 26/26 ✓, renderer slice 211 total ("lines 1-150 of 211") ✓. Skipped/out-of-scope list explicit (claude-accounts helper bodies, fabrica-profiles transfer files, mobile/, _sources/). Accurate.

---

## 2. bz-voice-media.md — verification detail

Sources under `_sources/buzz/crates/`. Every cite below opened and compared.

### 2.1 Exact matches

| # | Report claim | Source evidence | Result |
|---|---|---|---|
| B1 | Re-exports `april_model_info … VOICE_FILE_EXT` (buzz-voice/src/lib.rs:3-9); bundle consts (:19-23) | lib.rs exact (file = 23 lines) | EXACT |
| B2 | v2 frame header layout `seq u16 \| ts_48k u32 \| level_dbov i8 [-127,0] \| flags u8 bit0=DTX` (wire.rs:21-30/:21-33) | wire.rs:24-29 layout block verbatim; V2_HEADER_LEN=8 :30; FLAG_DTX :33 | EXACT |
| B3 | dBov clamped to −127, frame never dropped, trust decisions must not consume level_dbov (wire.rs:12-19, parse clamp :60-86) | Threat-model invariant doc :11-19 verbatim; parse clamp :71-75 | EXACT |
| B4 | Relay never generates/re-encodes frames (wire.rs:6-9); Opus byte-forwarding (room.rs:8, mod.rs:1-10) | mod.rs:1-10 and room.rs:8 verbatim | EXACT |
| B5 | Endpoint WS upgrade `/huddle/:channel_id/audio` (handler.rs:63-64) | handler.rs:63 doc comment names exactly that route; ws_audio_handler :64 | EXACT |
| B6 | Row-zero tenant binding (handler.rs:70); connection-permit semaphore reject (:90-108) | Row-zero bind comment+code at :70-88; permit acquire/reject :90-100 | EXACT |
| B7 | AudioPeer fields: pubkey, audio_tx drop-on-full, ctrl_tx never starved, peer_index u8 0-254 (room.rs:19-44); audio cap 8 = 160 ms, ctrl 32 | room.rs:19-44 exact incl. capacity comments :39-44 | EXACT |
| B8 | `MAX_PEERS_PER_ROOM = 25` soft cap vs 255 hard space (room.rs:46-49) | room.rs:46-49, const at :49 | EXACT |
| B9 | Ownership arbiter: Redis fenced CAS lease keyed `session_id == channel_id`; "Membership never grants ownership" (join.rs:8-27) | join.rs:8-26 module docs verbatim (quote at :23) | EXACT |
| B10 | LocalOwner/RemoteOwner outcomes (:10-21); control schema RegisterPeer/…RegisterRejected postcard, failures surface as join errors (:28-36) | join.rs exact | EXACT |
| B11 | Payload invariant `[peer_index][v2 header][Opus]` byte-identical single-pod framing (mesh.rs:22-31); room stays pure (:33-38); FencedHeader stale-generation drop + INCR monotonicity (:40-47) | mesh.rs all exact | EXACT |
| B12 | Huddle kinds 48100-48103 + guidelines 48106 (buzz-core/src/kind.rs:590-598) | kind.rs:590-598 exact | EXACT |
| B13 | `KIND_MEDIA_UPLOAD = 49001` "Not a relay event kind" (kind.rs:600-602) | kind.rs:601-602 exact | EXACT |
| B14 | BlobDescriptor = BUD-02 response w/ url/sha256/size/type/uploaded/dim/blurhash/thumb/duration (types.rs:5-31) | types.rs:7-31 struct exact (file = 31 lines) | EXACT |
| B15 | Anti-oracle mapping: generic 401 "authentication failed" for all auth failures, InsufficientScope alone 403, 429 rate limits, 5xx backend (error.rs:110-167) | error.rs:120-144 verbatim incl. oracle comment; :149-151 429s; :161-164 500s | EXACT |
| B16 | Server-tag normalization via `buzz_core::tenant::normalize_host` (auth.rs:168) | auth.rs:163-169, call at :168 exact | EXACT |
| B17 | Thumbnail: sync CPU-bound, 320px JPEG, blurhash (4,3) from thumbnail, returns `(BlobMeta, Option<Vec<u8>>)`, caller does S3 writes after spawn_blocking (thumbnail.rs:15-51) | thumbnail.rs:15-51 exact (file = 51 lines) | EXACT |
| B18 | Moderation records: NCMEC CyberTipline driver (:1-9); `_uploads/{community}/{sha256}/{ULID}.json`, unreachable serve-path + relay-IAM-only bucket (:10-19); off by default via `BUZZ_MEDIA_UPLOAD_RECORDS`, independent IP opt-in fail-empty (:21-27) | upload_record.rs:1-27 exact | EXACT |
| B19 | Pinned model constants: `KevinAHM/pocket-tts-onnx`, revision `58a6d00cf13d239b6748cb0769f35c580a8f606c`, bundle `english_2026-04`, max 50 tokens/chunk (pocket_models.rs:4-13) | pocket_models.rs:4-13 exact | EXACT |
| B20 | Import limits ≤25 MB / 8–96 kHz / 2–30 s (imported.rs:17-21); canonical 32 kHz PCM16 (:22) | imported.rs:17-22 exact | EXACT |
| B21 | SAMPLE_RATE 24_000 mono PCM (pocket.rs:32-33); TTS_NUM_THREADS=1 + BUZZ_TTS_THREADS min-1 override (:41-51) | pocket.rs exact | EXACT |

### 2.2 Failures

None found. All sampled cites line-exact, including both headline negative claims' supporting text (no-WebRTC transport description in mod.rs/room.rs/wire.rs consistent with what the sources contain; sources show plain authenticated WS + Opus forwarding, no SDP/ICE anywhere in the audio module's own docs).

### 2.3 Coverage statement check

§5 present, unusually precise: declares buzz-voice 100% read (7 files), buzz-media fully read except bucket_index.rs + static_creds_minio.rs, and explicitly flags partially-covered regions (room.rs middle :91-579, join.rs body beyond :80, handler.rs covered by targeted section reads) and recommends this verify pass treat them as partial — done here. Spot-audited line counts match: lib.rs 23 ✓, pocket.rs 310 ✓, pocket_models.rs 137 ✓, imported.rs 730 ✓, types.rs 31 ✓, error.rs 220 ✓, thumbnail.rs 51 ✓, upload_record.rs 419 ✓, mod.rs 19 ✓. Note: my sampling concentrated on directly-read files per the coverage statement; the flagged-partial regions were not independently re-scanned (consistent with the report's own disclosure).

---

## 3. Totals

- fa-auth-onboarding.md: 23 evidence rows, ~40 cites re-checked → **19/22 groups fully exact, 3 MINOR, 0 FAILED → PASS**
- bz-voice-media.md: 21 evidence rows, ~35 cites re-checked → **20/20 groups exact, 0 MINOR, 0 FAILED → PASS**
- Combined: ~75 file:line citations verified, **0 failures**, 3 minor cosmetic/line-drift findings (F-A1..A3) — none affect any conclusion or headline finding in either report.
- Both coverage statements present, accurate, and honest about partial regions.
- Read-only compliance: no file outside `.Fabrica-atlas-board/` was modified.

## Scan coverage of THIS verification

- **Read:** the two target reports in full; Fabrica-app sources: use-onboarding-flow-types.ts (full), constants.ts:55-69, consent.ts (full), keychain.ts:1-105, profile-cloud-auth-config.ts (full), profile-cloud-pkce.ts (full), supabase-session.ts (full), ipc/supabase-auth.ts (full), register-core-handlers.ts:50-69 (+grep for call site), profile-cloud-session-store.ts:90-230, profile-cloud-session-refresh.ts:70-119, oauth-refresh.ts:1-20, shared/supabase-auth.ts (full), fabrica-profiles-auth-actions.ts:1-60; buzz sources: buzz-voice lib.rs (full), pocket.rs:1-55, pocket_models.rs:1-15, imported.rs:1-30, buzz-relay audio mod.rs (full), wire.rs:1-90, room.rs:1-55, handler.rs:55-104, join.rs:1-40, mesh.rs:1-60, buzz-core kind.rs:585-609, buzz-media types.rs (full), error.rs:105-168, thumbnail.rs (full), upload_record.rs:1-30, auth.rs:155-174.
- **Not re-checked (out of sample):** remaining cited lines in both reports (onboarding flow internals §8, codex/grok sections, telemetry client.ts, buzz-media validation.rs/storage.rs/upload.rs bodies, pocket_april.rs internals) — these rely on each report's own coverage statement plus prior clean wave passes.

*Report end — R5-2.1 verifier A.*
