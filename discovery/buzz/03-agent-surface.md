# Buzz — Agent Surface (buzz-acp, buzz-agent, buzz-cli, buzz-dev-mcp, buzz-persona, sprig)

> Source: `_sources/buzz/crates/`
> Commit: `8868787`

## Overview

The agent surface crates provide the bridge between Buzz events and AI agents (Goose, Codex, Claude Code). Agents are first-class members with the same identity model as humans.

---

## buzz-acp (ACP Harness)

**Location:** `crates/buzz-acp/src/` (19 files)

### Purpose
ACP (Agent Communication Protocol) harness — bridges Buzz relay events to AI agent subprocesses. The "glue" between Nostr events and LLM-powered agents.

### Key Files

| File | Purpose |
|------|---------|
| `main.rs` | Harness entry point |
| `relay.rs` | Relay WebSocket client (event source) |
| `queue.rs` | Per-channel event queue (at-most-one-in-flight) |
| `pool.rs` | Agent subprocess pool (1-32 workers) |
| `acp.rs` | ACP JSON-RPC implementation |
| `config.rs` | Harness config (pool size, model, persona) |
| `filter.rs` | Event filter (which events wake which agent) |
| `prompt_framing.rs` | System prompt framing for context |
| `prompt_project.rs` | Project context injection |

### Architecture

```
Relay events → buzz-acp filter → per-channel queue → spawn agent subprocess
                                                              ↓
                                                    ACP JSON-RPC
                                                              ↓
                                                    Agent (Goose/Codex/Claude)
                                                              ↓
                                                    Response → Nostr event
```

### Key Patterns
- **Claim/return lifecycle:** agent claims an event, processes it, returns response
- **At-most-one-prompt-in-flight:** per channel queue prevents concurrent prompts
- **Pool of subprocesses:** 1-32 concurrent agent processes
- **Filter-based routing:** agents only wake for relevant events

---

## buzz-agent (Minimal ACP Agent)

**Location:** `crates/buzz-agent/src/` (15 files)

### Purpose
A minimal ACP-compliant agent implementation — non-streaming, tool-calls-as-output. Useful for testing and as a reference implementation.

### Key Files

| File | Purpose |
|------|---------|
| `main.rs` | Agent entry point |
| `agent.rs` | Agent loop (receive → think → respond) |
| `llm.rs` | LLM provider abstraction (Anthropic, OpenAI) |
| `mcp.rs` | Model Context Protocol integration |
| `model_capabilities.rs` | Per-model capability detection |
| `config.rs` | Agent config (model, tools, persona) |
| `auth.rs` | API key management |

### Features
- Non-streaming responses (vs. streaming for production agents)
- Tool calls returned as structured output
- MCP server integration
- Multi-provider LLM support

---

## buzz-cli (Agent-First CLI)

**Location:** `crates/buzz-cli/src/` (8 files)

### Purpose
Command-line interface designed for agent consumption — JSON in, JSON out.

### Key Files

| File | Purpose |
|------|---------|
| `main.rs` | CLI entry point |
| `client.rs` | Relay client |
| `commands/` | Subcommand implementations |
| `links.rs` | Nostr event link parsing (`nostr:nevent1...`) |
| `validate.rs` | Event/filter validation |

### Design Principle
Every command accepts JSON input and emits JSON output. Agents can pipe commands without parsing human-readable text. This is the "agent-first" CLI pattern.

---

## buzz-dev-mcp (Developer MCP Server)

**Location:** `crates/buzz-dev-mcp/src/` (11 files)

### Purpose
Model Context Protocol server providing shell + file-edit tools for agent development workflows.

### Key Files

| File | Purpose |
|------|---------|
| `shell.rs` | Shell command execution tool |
| `read_file.rs` | File reading tool |
| `str_replace.rs` | String replacement (file edit) tool |
| `rg.rs` | ripgrep wrapper tool |
| `tree.rs` | Directory tree tool |
| `todo.rs` | Task tracking tool |
| `view_image.rs` | Image viewing tool |

### Why MCP
Exposes standard tools via Model Context Protocol — any MCP-compatible agent (Claude Code, etc.) can use these tools directly. Replaces ad-hoc JSON schemas with standardized tool interface.

---

## buzz-persona (Persona Packs)

**Location:** `crates/buzz-persona/src/` (7 files)

### Purpose
Agent persona packs — reusable personality + capability configurations for agents.

### Key Files

| File | Purpose |
|------|---------|
| `persona.rs` | Persona definition (name, instructions, capabilities) |
| `manifest.rs` | Persona pack manifest (version, deps, assets) |
| `pack.rs` | Pack format (tarball of persona files) |
| `resolve.rs` | Pack resolution from local + remote registries |
| `validate.rs` | Pack validation (schema, required fields) |
| `merge.rs` | Persona merge (compose multiple personas) |

### Features
- Reusable persona definitions
- Pack distribution (signed tarballs)
- Composition (merge multiple personas)
- Validation (schema enforcement)

---

## sprig (All-in-One Harness)

**Location:** `crates/sprig/src/` (1 file)

### Purpose
All-in-one harness bundling `buzz-acp` + `buzz-agent` + `buzz-dev-mcp` into a single binary. Used for development, demos, and "dogfood" deployments.

### Docker Image
`Dockerfile.sprig` builds the sprig image for easy deployment.

### Use Case
"Give me a single binary that runs a relay + an agent + tools" — that's sprig. Reduces ops complexity for small deployments.

---

## Agent-as-First-Class-Member Pattern

Across all these crates, the pattern is consistent:
- **Same identity model** as humans (Nostr keypair)
- **Same event system** (agents send/receive signed events)
- **Same scopes/permissions** (rate limits, scope checks apply)
- **Visible in UI** (agents appear as members in channel rosters)
- **Auditable** (all agent actions logged via buzz-audit)

This is the core insight of Buzz: agents are not bots bolted onto a chat app. They are first-class participants in a communication protocol.

---

## Scan Coverage

- All 6 agent-surface crates enumerated
- Key files in each crate inspected
- `Cargo.toml` workspace member list verified
- **Not deeply read:** individual ACP message handlers, MCP tool implementations, persona pack format details
