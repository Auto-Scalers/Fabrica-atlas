# Integrations — Existing System Reference

> **Focus system #6.** Describes what Fabrica ALREADY has for SaaS connector management (GitHub, GitLab, Linear, Jira, etc.). Companion ideas live in `ideas.md` (section: Integrations).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-auth-onboarding.md`, `fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

The Integrations surface manages connections to external SaaS providers used by the Tasks panel, source-control, and automations. It is the **connection-management + credential layer** for all external trackers/CRMs.

**How it works:** The Integrations area is where you connect Fabrica to outside services (GitHub, Jira, etc.) and where it safely stores the login credentials for those connections. The Tasks panel, source control, and automations all rely on these connections, so this is the central "wiring closet" for everything external.

## 2. Architecture (what exists)

- **UI**: `IntegrationsPane`; onboarding `IntegrationsStep`; `IntegrationStatusPill` (`Fabrica-features.md:476,529,573`).

  **How it works:** There is a settings pane for integrations, a step during first-time setup to connect them, and a small status pill that shows at a glance whether each connection is working.

- **`IntegrationsStep`** derives GitHub/Linear task-source statuses from preflight store (`fa-auth-onboarding.md:228`).

  **How it works:** During onboarding, this step reads what you already connected and shows the status of your GitHub/Linear task sources before you finish setup.

- **Integrated providers**: GitHub, GitLab, Jira, Linear, Azure DevOps, Bitbucket, Gitea (`fabrica-app-discovery.md:13,131`; `Fabrica-features.md:715-727`).

  **How it works:** These seven services are the ones Fabrica can already connect to; each gets its own client code and credential handling.

- **`linear/`**: SDK client + keychain tokens + issue-context fanout + relations + MCP issue list (`fabrica-app-discovery.md:128`).

  **How it works:** The Linear connection uses an official SDK, stores its token in the system keychain (the OS credential store), broadcasts issue context where needed, tracks relations between issues, and exposes an issue list to agents through MCP.

- **`jira/`**: REST client, ADF→markdown, attachment caching; `azure-devops/` PR/status; `bitbucket/`/`gitea/` PR mapping (`fabrica-app-discovery.md:131`).

  **How it works:** The Jira connection speaks Jira's REST API, converts its rich document format to markdown, and caches attachments. Separate small modules handle Azure DevOps pull-request status and Bitbucket/Gitea pull-request mapping.

- **IPC volume**: `gh` 28 channels, `gitlab` 7, `jira` ~14, `linear` 6+24 preload sites; preload usage `gh`×56, `linear`×24, `jira`×23 (`fa-ipc-watchers.md:90,163-167`).

  **How it works:** Fabrica opens many internal channels to each provider (GitHub 28, GitLab 7, Jira ~14, Linear 6 plus 24 preloaded sites) and preloads data aggressively (GitHub called 56 times, Linear 24, Jira 23) so the UI feels populated immediately.

- **`source-control/` forge-provider abstraction** with `hosted-review` creation (backoff/pacing, PR templates, linked issues) (`fabrica-app-discovery.md:128`).

  **How it works:** A unified "forge" layer wraps the different git hosts so that opening a pull/merge request uses the same code path everywhere, with polite pacing and linked issues.

## 3. Reference designs (MC / buzz)

- **[MC]** Service Catalog: 64 services across 16 categories, `authType` oauth2/api-key/none, encrypted credential vault (AES-256-GCM), connect/test, financial safety budgets (`mc-service-catalog.md`; `mission-control-discovery.md:352`). Adapter layer for provider-specific sync (cleaner than Fabrica's connector sprawl) (`fa-runtime-structured-read.md:8`, `mc-adapters-linelevel.md`).

  **How it works:** Mission Control lists 64 services in 16 categories, each tagged with how it authenticates, and stores credentials in a strongly encrypted vault (AES-256-GCM). It also enforces "financial safety budgets" so an agent can't overspend on a paid API. An adapter layer normalizes each provider's sync — a cleaner pattern than Fabrica's many separate connectors, and a candidate to adopt.

- **[buzz]** (none — buzz "integrations" are nostr relays/communities, not SaaS connectors.)

  **How it works:** buzz's notion of "integration" is connecting to decentralized Nostr relays and communities, not SaaS apps like Jira, so there is no SaaS connector design to borrow from buzz here.

## 4. Hard constraint

Preserve every existing integration. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
