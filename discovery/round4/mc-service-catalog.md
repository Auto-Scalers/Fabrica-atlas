# R4-1.8 — mission-control Service Catalog Inventory (line-level)

> Task: ATLAS R4-1.8 (Group 1, Round 4) — READ-ONLY inventory of the mission-control Field-Ops service catalog.
> Source root: `_sources/mission-control/mission-control` (frozen; never modified).
> Worker session: run_43e01c767919 / ctx_385ff1264f4a / task_5dbbbe597084. Date: 2026-08-23.

---

## 1. Where the catalog lives and how it loads

- **Catalog file**: `data/field-ops/service-catalog.json` — 1,849 lines, version `"1.0.0"`, `lastUpdated: 2026-03-18T00:00:00.000Z` (`data/field-ops/service-catalog.json:1-3`).
- **Loader**: `getServiceCatalog()` reads it via `readFile(fieldOpsPath("service-catalog.json"), "utf-8")`, parses as `ServiceCatalogFile`, and returns an **empty fallback catalog** `{ version: "1.0.0", lastUpdated: "", services: [] }` on any read/parse error (`src/lib/data.ts:635-642`).
- **Count correction**: the catalog contains exactly **64 services** (verified by JSON parse of `catalog.services` and by counting top-level `"id"` keys at 6-space indent — 64 hits; see §7). The R4-1.3 figure of "~66" is an over-count; recommend the verification pass corrects it.
- **HTTP surface**: `GET /api/field-ops/catalog` serves it with `id`, `category`, `search`, `excludeSaved` filters plus an `isSaved` annotation against the user's saved `services.json`; search matches name/description/tags/capabilities/category; category counts are computed from the full unfiltered catalog (`src/app/api/field-ops/catalog/route.ts:14-69`, filters :20-52, annotation :54-58, counts :60-64).
- **Category metadata**: 16 categories defined with label/icon/color in `SERVICE_CATEGORIES` (`src/lib/service-categories.ts:29-46`), lookup via `getCategoryInfo()` (`service-categories.ts:48-50`).

### Catalog entry schema (fields per service)

Canonical example: `twitter` entry, `data/field-ops/service-catalog.json:5-36`.

| Field | Purpose | Evidence (twitter entry) |
|---|---|---|
| `id` | URL-safe slug; user services link back via `services.json` `catalogId` | :6 |
| `name` | Display name | :7 |
| `description` | UI description | :8 |
| `category` | One of the 16 categories | :9 |
| `mcpPackage` | npm name of an external MCP server package (may be `""`) | :10 |
| `authType` | `"oauth2"` \| `"api-key"` \| `"none"` | :11 |
| `riskLevel` | `"high"` \| `"medium"` \| `"low"` | :12 |
| `capabilities` | string[] — advertised operations | :13 |
| `configFields` | credential fields: key/label/type(text/password)/required/placeholder/helpText | :14-19 |
| `setupGuide` | steps[], docsUrl, estimatedMinutes, pricing | :20-33 |
| `icon` | Lucide icon name | :34 |
| `tags` | freeform strings used by catalog full-text search | :35 |

Same shape typed at `src/lib/types.ts:501` and `:653` (`mcpPackage: string`); Zod-enforced for custom services at `src/lib/validations.ts:437` (`z.string().min(1).max(500)`) with optional variant at `validations.ts:455`.

---

## 2. How execution actually routes — adapter-first, NO runtime MCP

Central finding for the adapter-coverage-gap question:

1. **Adapter resolution**: execute API looks up an adapter by the service's `id`, then its `catalogId`: `resolvedAdapter = getAdapter(service.id)` … `if (!resolvedAdapter && service.catalogId) resolvedAdapter = getAdapter(service.catalogId)` (`src/app/api/field-ops/execute/route.ts:210-218`). Same dual lookup in prepare (`execute/prepare/route.ts:96-97`) and test (`services/test/route.ts:66-68`) routes.
2. **Registry**: adapters self-register into `Map<string, ServiceAdapter>` keyed by `adapter.serviceId`; overwrite-on-reregister (`src/lib/adapters/registry.ts:13,17-20`); lookup `getAdapter()` at `registry.ts:22-25`. Exactly **six** adapters register:
   - `twitter` — `twitter-adapter.ts:230` (serviceId) / `:406` (registerAdapter)
   - `linkedin` — `linkedin-adapter.ts:153` / `:280`
   - `gmail` — `gmail-adapter.ts:190` / `:331`
   - `stripe` — `stripe-adapter.ts:45` / `:157`
   - `reddit` — `reddit-adapter.ts:356` / `:616`
   - `ethereum-wallet` — `ethereum-adapter.ts:500` / `:745`
3. **No-adapter fallback is MANUAL, not MCP**: task moved to `status:"executing"`, response `mode:"manual"`, message "No adapter available. Task moved to executing for manual completion." (`execute/route.ts:221-248`; quotes at :239/:246).
4. **`mcpPackage` is inert metadata**: case-insensitive grep for `mcp` across `src/app/api/field-ops/execute/`, `src/lib/adapters/`, `src/lib/data.ts` → zero matches. `mcpPackage` is only copied on save-from-catalog (`save-from-catalog/route.ts:33`), stored via services API (`services/route.ts:58`), seeded in demo data (`seed-demo/route.ts:375,390,405`), and displayed/edited in the UI (`field-ops/services/page.tsx:200,212,650`). No code anywhere spawns or calls an MCP server; the packages are setup-guide pointers for wiring the equivalent external server.
5. **Connection testing mirrors this**: without an adapter, `/api/field-ops/services/test` returns `valid:true, adapterName:null`, "No automated adapter available for connection testing." (`services/test/route.ts:70-79`). With an adapter it requires vault credentials and runs `healthCheck` (contract `adapters/types.ts:129-132`: read-only, no side effects, within 5 seconds).
6. **Wallet-signing detour (ethereum)**: `signingMode === "wallet"` refuses server-side execution and redirects to browser-signing `POST /api/field-ops/execute/prepare` (`execute/route.ts:250-259`; routes exist under `src/app/api/field-ops/execute/prepare/` and `.../submit-signature/`).
7. **Dry-run + staleness gates**: payload validation precedes everything (`execute/route.ts:261-271`); `dryRun` short-circuits before real calls (:273-293); services idle 3+ days get idempotent re-validation (:295-318).
8. **Financial roll-up**: `/api/field-ops/financials` marks financial catalog categories, cross-references saved services' `catalogId`s against the catalog, resolves `getAdapter(service.id) ?? getAdapter(service.catalogId ?? "")`, and uses each adapter's optional `getFinancials()` (`financials/route.ts:25,32-52,97`; interface `adapters/types.ts:140-143`; registry helper `listFinancialAdapters()` `registry.ts:42-47`).

**Net result: only 6 of 64 catalog services (9.4%) have native automated execution inside mission-control. The other 58 have no automated execution path** — operator wires the named MCP package externally or completes tasks manually.

---

## 3. Full service inventory (all 64)

Legend for **Route**: `ADAPTER` = a native adapter is registered under this exact id (automated execution); `MCP-meta` = no adapter; the listed `mcpPackage` is setup metadata only; `none` = no adapter AND empty `mcpPackage`. Line refs point to each entry's `"id"` line in `data/field-ops/service-catalog.json`.

| # | id | Name | Category | Auth | Capabilities (advertised operations) | Risk | Route / mcpPackage | Line |
|--:|---|---|---|---|---|---|---|--:|
| 1 | twitter | X | social-media | oauth2 | create-posts, search, analytics, reply, delete | medium | ADAPTER + @mbelinky/x-mcp-server | 6 |
| 2 | linkedin | LinkedIn | social-media | oauth2 | post-updates, company-pages, analytics, messaging | medium | ADAPTER + mcp-linkedin | 38 |
| 3 | facebook | Facebook Pages | social-media | oauth2 | page-posts, comment-moderation, insights, scheduling | medium | MCP-meta: facebook-mcp-server | 68 |
| 4 | instagram | Instagram | social-media | oauth2 | analytics, engagement-tracking, content-insights | medium | MCP-meta: instagram-mcp | 98 |
| 5 | bluesky | Bluesky | social-media | api-key | post, reply, search, feed-management | medium | MCP-meta: bluesky-mcp | 127 |
| 6 | ayrshare | Ayrshare (Multi-Platform) | social-media | api-key | multi-platform-post, scheduling, analytics, auto-hashtags | medium | MCP-meta: ayrshare-mcp | 154 |
| 7 | gmail | Gmail | email-communication | oauth2 | send-email, read-email, manage-labels, attachments, search | medium | ADAPTER + gmail-mcp | 181 |
| 8 | slack | Slack | email-communication | api-key | send-messages, channel-management, threads, file-sharing | medium | MCP-meta: slack-mcp | 215 |
| 9 | discord | Discord | email-communication | api-key | send-messages, moderation, bot-commands, channel-management | medium | MCP-meta: discord-mcp | 244 |
| 10 | youtube | YouTube | content-publishing | oauth2 | upload-videos, shorts, analytics, transcripts, channel-management | high | MCP-meta: youtube-mcp-server | 273 |
| 11 | wordpress | WordPress | content-publishing | api-key | create-posts, edit-pages, media-upload, categories, comments | high | MCP-meta: wordpress-mcp | 303 |
| 12 | figma | Figma | design-creative | oauth2 | design-extraction, component-inspect, layout-info, design-tokens | medium | MCP-meta: figma-mcp-server | 333 |
| 13 | canva | Canva | design-creative | api-key | design-creation, templates, brand-kit, export | medium | MCP-meta: canva-mcp-server | 360 |
| 14 | dalle-imagegen | DALL-E / Image Generation | design-creative | api-key | text-to-image, image-editing, variations, multiple-models | medium | MCP-meta: imagegen-mcp | 387 |
| 15 | stripe | Stripe | ecommerce-payments | api-key | payment-review, refunds, invoices, disputes, analytics | high | ADAPTER (health-check only) + stripe-mcp | 415 |
| 16 | shopify | Shopify | ecommerce-payments | api-key | order-management, shipment-tracking, inventory, products, analytics | high | MCP-meta: shopify-mcp | 444 |
| 17 | google-search-console | Google Search Console | analytics-seo | oauth2 | search-performance, indexing-status, core-web-vitals, keyword-tracking | medium | MCP-meta: mcp-server-gsc | 473 |
| 18 | google-analytics | Google Analytics 4 | analytics-seo | oauth2 | traffic-analytics, user-engagement, conversion-tracking, real-time-data | medium | MCP-meta: ga4-mcp | 503 |
| 19 | semrush | SEMrush | analytics-seo | api-key | keyword-research, domain-analytics, backlinks, traffic-estimation, competitive-intel | medium | MCP-meta: semrush-mcp | 534 |
| 20 | ahrefs | Ahrefs | analytics-seo | api-key | backlink-analysis, keyword-research, traffic-estimation, site-audit | medium | MCP-meta: ahrefs-mcp | 561 |
| 21 | hubspot | HubSpot | crm-sales | oauth2 | contacts, companies, deals, email-logging, pipeline-management | high | MCP-meta: hubspot-mcp | 588 |
| 22 | pipedrive | Pipedrive | crm-sales | api-key | leads, deals, pipelines, organizations, activities | medium | MCP-meta: mcp-server-pipedrive | 616 |
| 23 | linear | Linear | project-management | api-key | issue-tracking, project-management, milestones, team-updates, cycles | medium | MCP-meta: linear-mcp | 642 |
| 24 | notion | Notion | project-management | oauth2 | page-management, databases, todos, search, content-creation | medium | MCP-meta: notion-mcp | 669 |
| 25 | asana | Asana | project-management | api-key | task-management, projects, workflows, team-collaboration | medium | MCP-meta: mcp-server-asana | 697 |
| 26 | trello | Trello | project-management | api-key | board-management, cards, checklists, labels, automation | medium | MCP-meta: trello-task-manager-mcp | 724 |
| 27 | vercel | Vercel | cloud-hosting | api-key | deployments, project-management, analytics, environment-variables | high | MCP-meta: vercel-mcp | 752 |
| 28 | cloudflare | Cloudflare | cloud-hosting | api-key | workers, dns-management, cache, pages, edge-compute | high | MCP-meta: cloudflare-mcp | 780 |
| 29 | github | GitHub | cloud-hosting | api-key | repositories, issues, pull-requests, code-search, actions | high | MCP-meta: github-mcp | 809 |
| 30 | supabase | Supabase | cloud-hosting | api-key | database-queries, table-management, migrations, logs, auth | high | MCP-meta: supabase-mcp | 837 |
| 31 | google-drive | Google Drive | file-storage | oauth2 | file-search, upload, download, folder-management, sharing | high | MCP-meta: google-drive-mcp | 866 |
| 32 | dropbox | Dropbox | file-storage | oauth2 | file-management, upload, download, folder-operations, sync | high | MCP-meta: dropbox-mcp | 895 |
| 33 | google-ads | Google Ads | advertising | oauth2 | campaign-analysis, performance-data, conversion-tracking, keyword-management | high | MCP-meta: google-ads-mcp | 923 |
| 34 | facebook-ads | Facebook / Meta Ads | advertising | oauth2 | campaign-management, ad-optimization, a-b-testing, analytics, audience-targeting | high | MCP-meta: facebook-ads-mcp-server | 955 |
| 35 | zendesk | Zendesk | customer-support | api-key | ticket-management, help-center, customer-search, analytics, response-drafting | medium | MCP-meta: zendesk-mcp | 984 |
| 36 | freshdesk | Freshdesk | customer-support | api-key | ticket-management, contacts, agents, companies, conversations | medium | MCP-meta: freshdeck-mcp (sic — likely upstream typo) | 1014 |
| 37 | google-calendar | Google Calendar | scheduling | oauth2 | create-events, availability-check, attendee-management, recurring-events | high | MCP-meta: google-calendar-mcp | 1042 |
| 38 | calendly | Calendly | scheduling | api-key | scheduling, availability, event-types, bookings | medium | MCP-meta: calendly-mcp | 1071 |
| 39 | brave-search | Brave Search | web-research | api-key | web-search, local-search, news-search, image-search | low | MCP-meta: brave-search-mcp | 1098 |
| 40 | firecrawl | Firecrawl | web-research | api-key | web-scraping, site-crawling, structured-extraction, markdown-conversion | medium | MCP-meta: firecrawl-mcp | 1124 |
| 41 | pdf-reader | PDF Reader | document-processing | none | text-extraction, ocr, parallel-processing, metadata | low | MCP-meta: pdf-reader-mcp (no auth required) | 1150 |
| 42 | openai | OpenAI API | ai-automation | api-key | text-generation, image-generation, embeddings, analysis | medium | MCP-meta: openai-mcp | 1173 |
| 43 | ethereum-wallet | Ethereum / Base Wallet | ecommerce-payments | api-key | send-eth, send-usdc, read-balance, erc20-transfers | high | ADAPTER + no mcpPackage | 1201 |
| 44 | reddit | Reddit | social-media | oauth2 | post-to-subreddit, comment, reply, search, monitor-mentions | medium | ADAPTER + no mcpPackage | 1231 |
| 45 | tiktok | TikTok | social-media | oauth2 | upload-video, analytics, trending-sounds, video-management | medium | none | 1266 |
| 46 | pinterest | Pinterest | social-media | oauth2 | create-pin, boards, analytics, audience-insights | medium | none | 1296 |
| 47 | telegram | Telegram Bot | email-communication | api-key | send-message, channels, groups, inline-keyboards, media | medium | none | 1326 |
| 48 | resend | Resend | email-communication | api-key | send-transactional, templates, domains, webhooks, batch-send | medium | none | 1355 |
| 49 | convertkit | ConvertKit (Kit) | email-communication | api-key | subscribers, broadcasts, sequences, forms, tags, automations | medium | none | 1384 |
| 50 | beehiiv | Beehiiv | email-communication | api-key | newsletters, subscribers, analytics, monetization, referral-program | medium | none | 1411 |
| 51 | lemonsqueezy | Lemon Squeezy | ecommerce-payments | api-key | products, orders, subscriptions, checkouts, webhooks, license-keys | high | none | 1439 |
| 52 | gumroad | Gumroad | ecommerce-payments | api-key | products, sales, customers, analytics, offers | high | none | 1468 |
| 53 | quickbooks | QuickBooks Online | ecommerce-payments | oauth2 | invoices, expenses, reports, customers, payments, tax-reports | high | none | 1495 |
| 54 | twilio | Twilio (SMS) | email-communication | api-key | send-sms, voice, verify, messaging-service, whatsapp | medium | none | 1526 |
| 55 | whatsapp-business | WhatsApp Business | email-communication | api-key | send-message, templates, media, contacts, interactive-messages | high | none | 1556 |
| 56 | intercom | Intercom | customer-support | api-key | conversations, contacts, articles, tickets, events | medium | none | 1586 |
| 57 | docusign | DocuSign | customer-support | oauth2 | send-envelope, templates, signing, status-check, reminders | high | none | 1615 |
| 58 | medium | Medium | content-publishing | api-key | publish-post, drafts, user-publications, tags | medium | none | 1646 |
| 59 | substack | Substack | content-publishing | api-key | publish-post, drafts, subscribers, analytics | medium | none | 1675 |
| 60 | ghost | Ghost (Self-hosted) | content-publishing | api-key | create-post, pages, members, tags, newsletters | medium | none | 1703 |
| 61 | posthog | PostHog | analytics-seo | api-key | events, feature-flags, experiments, dashboards, cohorts | low | none | 1733 |
| 62 | mixpanel | Mixpanel | analytics-seo | api-key | events, funnels, retention, user-profiles, segmentation | low | none | 1762 |
| 63 | zapier | Zapier (Webhooks) | ai-automation | api-key | trigger-zap, webhooks, data-transfer, multi-step-workflows | medium | none | 1789 |
| 64 | make | Make (Integromat) | ai-automation | api-key | trigger-scenario, webhooks, data-mapping, scheduling | medium | none | 1818 |

Note the catalog's structural split: entries 1–42 all carry an `mcpPackage` and full `setupGuide` blocks; entries 43–64 (added later, ids at lines 1201–1818) have empty `mcpPackage` values except where noted, shorter setup guidance, and only 6 of these 22 have any adapter. Every id is unique across the 64 (verified — no duplicate id keys).

---

## 4. Notable services in detail

### 4a. The six adapter-backed services (the entire native coverage)

| Service | Adapter file | serviceId line | supportedOperations (code) | Catalog capabilities (advertised) | Extra surface |
|---|---|---|---|---|---|
| X / Twitter | `adapters/twitter-adapter.ts` | :230 | post-tweet, reply-tweet, delete-tweet (:232) | create-posts, search, analytics, reply, delete | register :406; OAuth 1.0a user-context signing |
| LinkedIn | `adapters/linkedin-adapter.ts` | :153 | create-post (:155) | post-updates, company-pages, analytics, messaging | register :280 |
| Gmail | `adapters/gmail-adapter.ts` | :190 | send-email (:192) | send-email, read-email, manage-labels, attachments, search | register :331 |
| Stripe | `adapters/stripe-adapter.ts` | :45 | [] — "Health check only for now" (:47) | payment-review, refunds, invoices, disputes, analytics | register :157; getFinancials-capable |
| Reddit | `adapters/reddit-adapter.ts` | :356 | post-text, post-link, comment, delete (:358) | post-to-subreddit, comment, reply, search, monitor-mentions | register :616 |
| Ethereum wallet | `adapters/ethereum-adapter.ts` | :500 | read-balance, send-eth, send-usdc (:502) | send-eth, send-usdc, read-balance, erc20-transfers | register :745; getFinancials; wallet-signing prepare flow |

Key mismatch pattern: **catalog `capabilities` and adapter `supportedOperations` do not use a shared vocabulary** except for ethereum-wallet's three overlapping ops. Stripe advertises five catalog capabilities but its adapter executes nothing (`supportedOperations: []`, health-check only). Twitter/LinkedIn/Gmail/Reddit adapters each implement a strict subset of the advertised capabilities. This means the catalog over-promises relative to what the engine can automate.

### 4b. ethereum-wallet — richest adapter

- Largest adapter file (~24KB); supports Sepolia/Base/Ethereum reads and USDC/ETH transfers (`supportedOperations` at `ethereum-adapter.ts:500-502`).
- Two signing modes: server-side "vault" vs browser "wallet" mode that bounces execution to `/api/field-ops/execute/prepare` + `submit-signature` (`execute/route.ts:250-259`).
- Implements optional `getFinancials()` for the financials dashboard balance/revenue roll-up (`financials/route.ts:97`; interface `types.ts:140-143`).

### 4c. stripe — registered but execution-inert

`stripe-adapter.ts:47` sets `supportedOperations: []` with comment "Health check only for now" — connection testing works (`services/test/route.ts` path), but any Stripe field-task execution falls to validatePayload on an empty op set / manual fallback. All five catalog payment-review/refund/invoice capabilities are unimplemented in-code.

### 4d. pdf-reader — the only authType "none"

`data/field-ops/service-catalog.json:1150-1155`: `authType:"none"`, riskLevel `"low"` — document processing with no credentials; still no adapter (manual/MCP-meta route).

### 4e. zapier / make — webhook escape hatches

Lines 1789 and 1818: generic automation bridges (`trigger-zap`, `trigger-scenario`) — notable because they can proxy all other un-adapted services externally, softening the 58-service gap in practice.

### 4f. ayrshare — one catalog entry covering many networks

Line 154: multi-platform posting (Facebook/Instagram/LinkedIn/X via one API) — overlaps 8+ individual social entries; relevant if Fabrica wants broad social coverage with a single integration.

### 4g. freshdesk mcpPackage typo

Line 1014 entry names package `freshdeck-mcp` — likely an upstream typo worth flagging before any transformation copies this data.

---

## 5. Distribution statistics

Auth types (from JSON `authType` per entry):

| authType | Count | Share |
|---|--:|--:|
| api-key | 42 | 65.6% |
| oauth2 | 21 | 32.8% |
| none | 1 (pdf-reader) | 1.6% |

Risk levels:

| riskLevel | Count |
|---|--:|
| high | 20 (incl. all payments/hosting/ads/storage + youtube, wordpress, hubspot, google-calendar, docusign, whatsapp-business, quickbooks) |
| medium | 40 |
| low | 4 (brave-search :1098, pdf-reader :1150, posthog :1733, mixpanel :1762) |

Categories (`category` field; labels from `service-categories.ts:29-46`):

| Category id | Label | Count | ids |
|---|---|--:|---|
| social-media | Social Media | 9 | twitter, linkedin, facebook, instagram, bluesky, ayrshare, reddit, tiktok, pinterest |
| email-communication | Email & Communication | 9 | gmail, slack, discord, telegram, resend, convertkit, beehiiv, twilio, whatsapp-business |
| ecommerce-payments | E-Commerce & Payments | 6 | stripe, shopify, ethereum-wallet, lemonsqueezy, gumroad, quickbooks |
| analytics-seo | Analytics & SEO | 6 | google-search-console, google-analytics, semrush, ahrefs, posthog, mixpanel |
| content-publishing | Content & Publishing | 5 | youtube, wordpress, medium, substack, ghost |
| project-management | Project Management | 4 | linear, notion, asana, trello |
| cloud-hosting | Cloud & Hosting | 4 | vercel, cloudflare, github, supabase |
| customer-support | Customer Support | 4 | zendesk, freshdesk, intercom, docusign |
| design-creative | Design & Creative | 3 | figma, canva, dalle-imagegen |
| ai-automation | AI & Automation | 3 | openai, zapier, make |
| crm-sales | CRM & Sales | 2 | hubspot, pipedrive |
| file-storage | File Storage | 2 | google-drive, dropbox |
| advertising | Advertising | 2 | google-ads, facebook-ads |
| scheduling | Scheduling | 2 | google-calendar, calendly |
| web-research | Web & Research | 2 | brave-search, firecrawl |
| document-processing | Document Processing | 1 | pdf-reader |
| **Total** | | **64** | |

Adapter coverage: **6 / 64 = 9.4%** automated; 58 services route to manual completion or externally-wired MCP servers.

---

## 6. Adapter-coverage gap — implications for the Fabrica transformation

1. The catalog is a **sales/UI artifact**, not an execution contract: capabilities, setup guides, pricing and config fields are rich, but only 6 entries have any backing code (`adapters/` dir listing: exactly 6 `*-adapter.ts` files + `registry.ts` + `types.ts`).
2. Any Fabrica rebuild that promises the catalog's breadth must either (a) implement ~58 adapters, (b) build a real MCP-client execution layer (mission-control itself never calls MCP at runtime — §2.4), or (c) keep the manual-execution fallback UX.
3. The dual-lookup by `service.id` then `service.catalogId` (`execute/route.ts:213-218`) means custom user-created services can bind to catalog adapters via `catalogId` (`save-from-catalog/route.ts:19-33`) — a reuse seam worth preserving.
4. Capability vocabulary drift between catalog JSON and adapter code (§4a table) should be reconciled in any port.

---

## 7. Discrepancy register

| Item | Claimed elsewhere | Verified here |
|---|---|---|
| Catalog size | "~66 services" (R4-1.3 task row, Fabrica-atlas-tasks.md Group 1) | **64** (JSON parse count; 64 top-level `"id"` keys) |
| Native adapters | 6 | Confirmed 6 (§2.2 list) |
| "routes via MCP" framing | implied by mcpPackage presence | No runtime MCP anywhere; mcpPackage is metadata-only (§2.4) |

---

## 8. Scan coverage statement

**Read in full or relevant part (all cited):**
- `data/field-ops/service-catalog.json` — ALL 1,849 lines structurally parsed (all 64 service objects enumerated with id/name/category/authType/riskLevel/capabilities/mcpPackage/icon; representative full entries read verbatim incl. twitter :5-36); per-entry line anchors for all 64 `"id"` keys captured.
- `src/lib/adapters/types.ts` — full file (144 lines).
- `src/lib/adapters/registry.ts` — full file (47 lines).
- Adapter serviceId/supportedOperations/register lines grepped across all 6 adapter files (twitter, linkedin, gmail, stripe, reddit, ethereum).
- `src/app/api/field-ops/execute/route.ts` — lines 195-324 (adapter resolution, manual fallback, signing mode, validation, dry-run, staleness).
- `src/app/api/field-ops/services/test/route.ts` — lines 40-149.
- `src/app/api/field-ops/catalog/route.ts` — lines 20-64.
- `src/app/api/field-ops/financials/route.ts` — grep-cited lines 25,32-52,97.
- `src/lib/data.ts` — lines 628-652 (catalog loader).
- `src/lib/service-categories.ts` — full file (50 lines).
- Grep sweeps: `mcpPackage` across src/ (19 hits reviewed); case-insensitive `mcp` across execute/, adapters/, data.ts (0 hits).

**Not read line-by-line:** setupGuide step text and configField helpText of entries 2-64 (structure verified via parse; content sampled); adapter implementation bodies beyond the registry-relevant lines (covered by R4-1.3's dedicated adapters report); UI components under `components/field-ops/` beyond grep hits; `scripts/daemon/`.

**Nothing under `_sources/` or `Fabrica-app/` was modified.**
