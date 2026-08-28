# Integrations — Existing System Reference

> **Focus system #6.** Describes what Fabrica ALREADY has for SaaS connector management (GitHub, GitLab, Linear, Jira, etc.). Companion ideas live in `ideas.md` (section: Integrations).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-auth-onboarding.md`, `fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

The Integrations surface manages connections to external SaaS providers used by the Tasks panel, source-control, and automations. It is the **connection-management + credential layer** for all external trackers/CRMs.

## 2. Architecture (what exists)

- **UI**: `IntegrationsPane`; onboarding `IntegrationsStep`; `IntegrationStatusPill` (`Fabrica-features.md:476,529,573`).
- **`IntegrationsStep`** derives GitHub/Linear task-source statuses from preflight store (`fa-auth-onboarding.md:228`).
- **Integrated providers**: GitHub, GitLab, Jira, Linear, Azure DevOps, Bitbucket, Gitea (`fabrica-app-discovery.md:13,131`; `Fabrica-features.md:715-727`).
- **`linear/`**: SDK client + keychain tokens + issue-context fanout + relations + MCP issue list (`fabrica-app-discovery.md:128`).
- **`jira/`**: REST client, ADF→markdown, attachment caching; `azure-devops/` PR/status; `bitbucket/`/`gitea/` PR mapping (`fabrica-app-discovery.md:131`).
- **IPC volume**: `gh` 28 channels, `gitlab` 7, `jira` ~14, `linear` 6+24 preload sites; preload usage `gh`×56, `linear`×24, `jira`×23 (`fa-ipc-watchers.md:90,163-167`).
- **`source-control/` forge-provider abstraction** with `hosted-review` creation (backoff/pacing, PR templates, linked issues) (`fabrica-app-discovery.md:128`).

## 3. Reference designs (MC / buzz)

- **[MC]** Service Catalog: 64 services across 16 categories, `authType` oauth2/api-key/none, encrypted credential vault (AES-256-GCM), connect/test, financial safety budgets (`mc-service-catalog.md`; `mission-control-discovery.md:352`). Adapter layer for provider-specific sync (cleaner than Fabrica's connector sprawl) (`fa-runtime-structured-read.md:8`, `mc-adapters-linelevel.md`).
- **[buzz]** (none — buzz "integrations" are nostr relays/communities, not SaaS connectors.)

## 4. Hard constraint

Preserve every existing integration. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
