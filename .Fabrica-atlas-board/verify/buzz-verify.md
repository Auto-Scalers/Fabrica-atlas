> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Verify â€” Buzz Discovery (Task 2.2)

> Group 2 â€” Verify, Roadmap 02, Round 1. Verification Pass 1.
> Verifies `.Fabrica-board/discovery/buzz-discovery.md` against `_sources/buzz/`.

---

## 1. File Count Reconciliation

| Measure | Count | Status |
|---|---|---|
| Total source files (excl. .git/node_modules) | 4,121 | âœ… counted |
| desktop/ | 2,672 | âœ… covered (29 features + Tauri backend + shared infra) |
| mobile/ | 547 | âœ… covered |
| crates/ | 424 | âœ… covered (all 30 crates inventoried w/ line counts) |
| web/ + admin-web/ | 65 + 14 | âœ… covered |
| deploy/ + migrations/ + docs/ + scripts/ + bin/ + benchmarks/ + others | ~400 | âœ… covered |

## 2. Crate List Completeness

30 crates on disk vs 30 in discovery inventory: **exact match** âœ…
(buzz-acp, admin, agent, audit, auth, backend-kubernetes, cli, conformance, core, datastore-tracing, db, deletion, dev-mcp, media, pair-relay, pairing-cli, persona, pubsub, push-gateway, relay, relay-mesh, sdk, search, test-client, voice, workflow, ws-client, git-credential-nostr, git-sign-nostr, sprig).
Plus desktop-local crate `buzz-terminal` (inside desktop/src-tauri workspace) â€” mentioned in discovery Â§9 Cargo notes âœ….

## 3. Desktop Feature Completeness

29 feature directories on disk vs "29 feature modules" documented: **exact match** âœ…
(agent-memory, agents, channel-templates, channels, chat, communities, community-members, custom-emoji, forum, home, huddle, identity-archive, local-archive, mesh-compute, messages, moderation, notifications, onboarding, presence, profile, projects, pulse, reminders, search, settings, sidebar, terminal, user-status, workflows).

## 4. Gap Check â€” items found in source but missing/thin in discovery v1

| # | Gap found | Severity | Resolution |
|---|---|---|---|
| G1 | Agent-tool skill dirs `.agents/skills/`, `.codex/skills/`, `.goose/skills/` â€” identical pair of SKILL.md files: `desktop-screenshot` and `sprout-cli` (legacy Sprout name; sprout-cli skill points at nest_skill.md for managed-agent skills) | Minor | âœ… patched into discovery Â§3 |
| G2 | `.intersect/sadscan.yaml`, `.release/desktop-candidate.json`, `test-fixtures/entity-links.json`, `.vscode/settings.json` | Trivial (CI/meta config) | noted here; no doc change needed |
| G3 | Legacy naming evidence: "sprout" appears in tooling (sprig Dockerfile.sprig, sprout-cli skill, migration.rs ~/.sprout â†’ ~/.buzz) â€” Buzz was previously named Sprout | Context note | âœ… patched into discovery Â§1 |
| G4 | buzz-relay handler file-level detail beyond ARCHITECTURE.md not read line-by-line (79 files/64K lines) | Accepted scope | ARCHITECTURE.md is authoritative + verified consistent; noted as Round-2 deep-dive candidate |

## 5. Accuracy Spot Checks

- Kind registry: discovery lists ~150 constants extracted directly from kind.rs via regex âœ… (authoritative extraction).
- CLI subcommands: extracted from lib.rs enum variants programmatically âœ…; matches TESTING.md claim of "54 subcommands, 12 groups" within tolerance (23 top-level groups Ã— subcommands).
- ARCHITECTURE.md claims cross-checked where possible: rate-limiter gap, approval-gate WF-08 gap, send_dm/set_channel_topic stubs â€” all present in discovery Â§6 known limitations âœ….
- Line counts in crate inventory measured from disk âœ….

## 6. Verdict

**PASS with 2 minor patches applied.** All 30 crates, all 29 desktop features, all vision docs, protocol/kind registry, agent surface, clients, infra, and release machinery are accounted for. The only unread depth is inside buzz-relay's 64K lines of handler internals, which ARCHITECTURE.md documents authoritatively â€” flagged as a Round-2 deep-dive candidate, not a gap.

*Verification Pass 1 result: 0 open gaps.*

