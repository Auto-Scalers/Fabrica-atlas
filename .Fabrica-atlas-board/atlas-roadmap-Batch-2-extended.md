# General Insights — From Altari.ai Guides

> Derived from reading Altari's 49 free guides. Ideas, strategies, and implementation details applicable to Fabrica across all areas.

---

## How to Use This File

Each insight includes:
- **Source guide** — which Altari guide it came from
- **Insight** — what we learned
- **Implementation for Fabrica** — specific, actionable steps
- **Priority** — high / medium / low

---

## Insights

### 1. The "Encode Your Business" Method (Guide: Encode Your Business)
- **Source:** Guide #1 — "Encode Your Business" (9 min read)
- **Insight:** Altari's core methodology: map every recurring job in a business into plain .md files organized by department. Each file contains: Purpose, Trigger, Inputs, Steps, Output, Done when, Edge cases. 7 departments, 137 jobs total. Agents read the files, then run them. The key principle: "Prompts evaporate. Files compound."
- **Implementation for Fabrica:**
  - **Plugin marketplace taxonomy:** Adopt the 7-department model (Sales, Deals, Marketing, Operations, Intelligence, Customer, Back Office) as the category structure for the Fabrica plugin marketplace. This is more comprehensive than simple tag-based categorization.
  - **Plugin documentation template:** Use their 7-section file format (Purpose, Trigger, Inputs, Steps, Output, Done when, Edge cases) as the standard template for Fabrica plugin documentation. Every plugin ships with a clear spec file.
  - **Onboarding flow:** Build a "Business Encode" wizard in Fabrica that helps users map their own jobs into the system, then recommends plugins for each job. This becomes the "free audit" lead magnet.
  - **Agent configuration:** Each Fabrica agent could read a "job file" that defines what it does, when it runs, what inputs it needs, and what "done" looks like. This makes agents self-documenting.
- **Priority:** HIGH

### 2. Job Grading Rubric (Guide: Encode Your Business)
- **Source:** Guide #1
- **Insight:** 4-question scoring system for prioritizing what to automate: (1) Does it repeat? (2) Are there rules? (3) Is it digital in/out? (4) Is a miss cheap? Score 0-2 per question, total out of 8. Jobs scoring 6-8 = automate first. 3-5 = automate with human checkpoint. 0-2 = stays with humans.
- **Implementation for Fabrica:**
  - **ROI calculator input:** Use this rubric in Fabrica's audit/scanner tool. Users answer 4 questions about a workflow, get an automation score, and see which Fabrica plugins handle it.
  - **Plugin recommendations:** When a user describes a workflow, score it using the rubric and recommend the highest-scoring plugins.
  - **Content marketing:** Write a Fabrica guide titled "The 4-Question Test: Which of Your Jobs Should AI Handle First?" — directly inspired by (not copied from) this framework.
- **Priority:** HIGH

### 3. Ship One Department at a Time (Guide: Encode Your Business)
- **Source:** Guide #1
- **Insight:** The biggest mistake is trying to automate everything at once. Pick one department, encode 5-10 jobs, run for 2 weeks, then expand. "Every improvement is permanent. A better objection library makes every future deal smarter."
- **Implementation for Fabrica:**
  - **Onboarding UX:** Guide new users to start with ONE department/plugin set, not the whole marketplace. Show a "Start with Sales" or "Start with Operations" path.
  - **Progressive disclosure:** Don't overwhelm users with 50+ plugins on first load. Start with a curated "starter pack" for their department.
  - **Retention hook:** Once users encode one department, the compound effect keeps them. The system gets smarter over time.
- **Priority:** MEDIUM

### 4. Plain Files Over Platforms (Guide: Encode Your Business)
- **Source:** Guide #1
- **Insight:** Altari uses plain .md files instead of apps/platforms. "No app, no platform, no lock-in. Every AI tool worth using can read a folder of text files." This is philosophically aligned with Fabrica's local-first values.
- **Implementation for Fabrica:**
  - **Plugin specs as files:** Plugin configurations should be human-readable plain text, not opaque database entries. Users can inspect, edit, version-control their agent configs.
  - **Export/portability:** Users can export their entire agent setup as a folder of files. This aligns with Fabrica's "local-first, no lock-in" value.
  - **Open format:** Define an open spec for Fabrica job files that other tools can read. This makes Fabrica the "encoding layer" for business automation.
- **Priority:** HIGH

### 5. The Approval Gate Framework (Guide: The AI Teammate Playbook)
- **Source:** Guide #3 — "The AI Teammate Playbook"
- **Insight:** Jobs ranked by hours saved vs damage risk. Green (low damage, high hours) = hand over immediately. Yellow (high damage) = approval gate required. Red (irreversible) = never unsupervised. The gate: "Does it send, publish, delete, spend money, or touch production? If yes, last click is yours."
- **Implementation for Fabrica:**
  - **Agent permission levels:** Every Fabrica agent has a permission tier: Auto (green), Review-required (yellow), Manual-only (red). Configurable per agent.
  - **Approval UI:** When an agent hits a yellow-tier action, show a "Review before sending" modal with the proposed action, one-click approve/reject.
  - **Default safety:** New agents start in yellow mode. Users explicitly upgrade to green after trust is earned.
  - **Plugin ratings:** Rate plugins by risk level. "This plugin handles email (yellow)" vs "This plugin handles reporting (green)".
- **Priority:** HIGH

### 6. The Agent Brief Template (Guide: The AI Teammate Playbook)
- **Source:** Guide #3
- **Insight:** The difference between an agent that works and one you abandon is the brief. Template has 7 sections: ROLE, CONTEXT, TOOLS, THE JOB, DEFINITION OF DONE, BOUNDARIES, CADENCE. People consistently leave out "definition of done" and "boundaries" — the two most important sections.
- **Implementation for Fabrica:**
  - **Plugin configuration template:** Every Fabrica plugin uses this 7-section format for its config. ROLE = what the agent is. CONTEXT = user's business. TOOLS = what it connects to. JOB = outcome, not clicks. DONE = what success looks like. BOUNDARIES = what it can't do without approval. CADENCE = when it runs.
  - **Onboarding wizard:** Walk users through filling out each section for their first agent. The template ensures nothing is missed.
  - **Agent library:** Ship pre-configured agents with complete briefs. User just fills in CONTEXT (their business) and TOOLS (their integrations).
- **Priority:** HIGH

### 7. Teach by Demonstration (Guide: The AI Teammate Playbook)
- **Source:** Guide #3
- **Insight:** Instead of describing a process in text, do it live with the agent watching. Narrate decisions as you go: "I'm skipping this because...", "this always goes in the Q3 folder". The agent saves the path as a reusable skill. This transfers judgment, not just steps.
- **Implementation for Fabrica:**
  - **"Watch me do it" mode:** First time a user sets up a workflow, they do it manually while Fabrica watches. Fabrica saves the path as a reusable agent config.
  - **Decision logging:** The agent doesn't just record clicks — it records the reasoning behind each decision. "I skipped this because X" becomes a rule in the agent's config.
  - **Skill library:** Users build a library of "demonstrated skills" that compound over time. Each new skill builds on previous ones.
- **Priority:** HIGH

### 8. Safety Rules for Agents (Guide: The AI Teammate Playbook)
- **Source:** Guide #3
- **Insight:** (1) Assume shared access — all agents on the same machine share logins. (2) Start on your own work, not a client's. (3) Approval on anything irreversible. (4) Read the first 10 runs properly, not summaries. (5) Passwords/2FA come back to you by design.
- **Implementation for Fabrica:**
  - **Security model:** Document that local-first means agents share the same machine permissions. Build a "sandbox mode" for testing agents safely.
  - **First-run review:** After an agent's first 10 runs, prompt user to review and adjust. "How did your agent do? Review its first 10 actions."
  - **Credential handling:** Never store API keys in agent configs. Always route through a secure vault or ask the user at runtime.
- **Priority:** HIGH

### 9. The Revenue Stack Pattern (Guide: The $500k App Stack)
- **Source:** Guide #5 — "The $500k App Stack"
- **Insight:** Successful AI apps use a 4-layer stack: Build (Claude Code + Cursor), Run (Supabase + Claude API + Vercel), Charge (RevenueCat + Superwall), Grow (TikTok UGC + AppsFlyer + Mixpanel). Key rule: "Charge before the value" — quiz → paywall → reveal.
- **Implementation for Fabrica:**
  - **Plugin monetization model:** Fabrica plugins could use the same pattern. Free preview → paywall → full access. RevenueCat handles subscriptions.
  - **Landing page stack:** Fabrica-web already uses Vercel. Add Supabase for auth (already planned). This matches the proven stack.
  - **Growth playbook:** When Fabrica launches, use TikTok UGC clips showing agents in action. "Watch my AI handle my email" is inherently filmable.
- **Priority:** MEDIUM

### 10. The 30-Minute Idea Test (Guide: The $500k App Stack)
- **Source:** Guide #5
- **Insight:** Before building anything: (1) Find a niche that already spends money on physical products. (2) Check if there's a subreddit/TikTok hashtag where people ask for this. (3) Describe in one sentence: "[Action] and get [outcome they pay for]". (4) Competitors with revenue = proof of demand, not a problem.
- **Implementation for Fabrica:**
  - **Plugin validation:** Before building a new Fabrica plugin, run this test: Does this niche spend money? Is there a community asking for this? Can we describe it in one sentence? Are there competitors?
  - **Marketplace curation:** Only list plugins that pass this test. Quality over quantity.
- **Priority:** LOW

### 11. Permanent Memory / Company Brain (Guide: Permanent Memory — Claude-Mem)
- **Source:** Guide #7 — "Permanent Memory"
- **Insight:** Claude-Mem gives Claude persistent memory via SQLite + vector search on the user's machine. Every session starts with context from previous sessions. Memories are structured (title, narrative, key facts, tags, files touched). Private by default — nothing leaves the machine.
- **Implementation for Fabrica:**
  - **Fabrica Brain:** Build a persistent memory layer into Fabrica. Every agent interaction is stored locally. New sessions start with full context. This IS the "Company Brain" feature from Altari's consulting offering — but as a product.
  - **Memory search:** Users can ask "What did we decide about pricing?" or "When did we last touch the onboarding flow?" and get instant answers from their own data.
  - **Privacy-first:** All memory stored locally on the user's machine. No cloud sync unless explicitly opted in. This aligns with Fabrica's local-first value.
  - **Decision log:** Every business decision is captured with reasoning. "What did we agree?" stops being a scroll through old chats.
- **Priority:** HIGH

### 12. The "Vibe Transfer" Pattern (Guide: Kimi K3 Prompt Pack)
- **Source:** Guide #8 — "The Kimi K3 Prompt Pack"
- **Insight:** Instead of copying a design, extract the "vibe" (spacing rhythm, type scale, palette temperature, motion, negative space) and apply it to your own content. "The result should feel like it belongs in the same portfolio, while being unmistakably its own design."
- **Implementation for Fabrica:**
  - **Design system:** When building Fabrica-web, study reference sites for their "vibe" (spacing, typography, motion) but write all original copy and content.
  - **Landing page iteration:** Use the screenshot loop: build → screenshot → paste back with critique → fix. "Make it feel more expensive" genuinely works as feedback.
  - **Brand consistency:** Define Fabrica's vibe once (dark/light, font pairing, accent color, motion style) and apply it everywhere.
- **Priority:** MEDIUM

### 13. The Iteration Loop (Guide: Kimi K3 Prompt Pack)
- **Source:** Guide #8
- **Insight:** First output gets 80%. The last 20% is a screenshot loop: (1) Screenshot, paste back with specific fixes. (2) Be a "rude art director" — "make it feel more expensive", "more whitespace", "break the grid somewhere". (3) QA pass: mobile, keyboard nav, reduced motion, text overflow.
- **Implementation for Fabrica:**
  - **Landing page process:** Use this exact iteration loop for Fabrica-web. Build → screenshot → critique → fix → QA. 3 rounds = ship quality.
  - **Plugin UI:** Apply the same loop to plugin configuration screens. Screenshot → critique → fix.
- **Priority:** MEDIUM

### 14. API Integration as Product Feature (Guide: WHOOP Dashboard)
- **Source:** Guide #10 — "The WHOOP Dashboard"
- **Insight:** Connect a real API (WHOOP) to Claude, pull 180 days of data, build a dashboard, then let users ask questions in plain English. The dashboard is the start — the real value is ongoing Q&A with your own data.
- **Implementation for Fabrica:**
  - **Plugin integrations:** Every Fabrica plugin that connects to an API (HubSpot, Stripe, Gmail, etc.) should follow this pattern: connect → pull historical data → build dashboard → let users ask questions.
  - **"Ask your data" feature:** After a plugin is connected, users can ask "What's my best-selling product?" or "Which leads converted last month?" in plain English.
  - **Onboarding flow:** Show users the value immediately: connect API → see data → ask question → get insight. The "aha moment" is the first answer.
- **Priority:** HIGH

### 15. The Company OS Pattern (Guide: The 48-Hour Run)
- **Source:** Guide #14 — "The 48-Hour Run"
- **Insight:** Build a "Company OS" — one folder with CLAUDE.md (brain), offers/, clients/, voice.md, pipeline.md, playbooks/. Every session starts already knowing your company. The dump: offer docs, pricing, past proposals, invoices, emails, call transcripts, testimonials. "Briefed once, forever."
- **Implementation for Fabrica:**
  - **Fabrica Company OS:** Build a feature where users dump their business docs into one folder. Fabrica reads everything and creates a "Company Brain" — CLAUDE.md equivalent that every agent inherits.
  - **Morning brief:** Every morning, Fabrica generates a "chief of staff brief": deals needing attention, overdue items, highest-revenue action for the day.
  - **Competitive advantage:** This is what Altari charges $70K+ to build as a consultancy. Fabrica could offer it as a self-serve product feature.
  - **Onboarding hook:** "Dump your docs, get your Company OS in 20 minutes" — compelling first-use experience.
- **Priority:** HIGH

### 16. Behavioral Discipline > Raw Intelligence (Guide: Fable Mode)
- **Source:** Guide #13 — "Fable Mode"
- **Insight:** Fable 5's superiority wasn't raw intelligence — it was habits. Median reply: 18 words (vs Opus 47). Almost 4 actions per block (vs Opus 1.4). "Half the talk. Triple the action." The style copies, the ceiling doesn't. Discipline is free.
- **Implementation for Fabrica:**
  - **Agent design principle:** Design Fabrica agents for action density, not verbose explanations. Short replies, more actions. "Done" beats "I'll get started."
  - **Configurable verbosity:** Let users choose agent communication style: brief (caveman), standard, or detailed.
  - **Quality metric:** Measure agents by actions-per-interaction, not words-per-interaction.
- **Priority:** HIGH

### 17. Voice Cloning for Content (Guide: The Clone Kit)
- **Source:** Guide #11 — "The Clone Kit"
- **Insight:** Train a small model on your message history to capture your voice. Then use it as a "voice guard" — generate examples of your writing style, feed them to a frontier model to write in your voice.
- **Implementation for Fabrica:**
  - **Plugin voice matching:** Let users provide 5-10 examples of their writing. Plugins generate content in their voice, not generic AI voice.
  - **Content workflow:** User provides sample → Fabrica learns voice → all generated content matches. "Sounds like me, not like ChatGPT."
  - **Privacy-first:** All voice training happens locally. No data leaves the machine.
- **Priority:** MEDIUM

### 18. Anti-AI-Tells for Content (Guide: The Humanizer)
- **Source:** Guide #12 — "The Humanizer"
- **Insight:** 33 documented AI writing tells: em dash overuse, "it's not just X, it's Y", rule of three, AI vocabulary (delve, tapestry, testament), copula avoidance, promotional filler, fake depth. Built on Wikipedia's "Signs of AI Writing" guide.
- **Implementation for Fabrica:**
  - **Built-in humanizer:** Add a "humanize" step to every Fabrica content generation pipeline. Auto-remove AI tells before output.
  - **Quality gate:** Every piece of content Fabrica generates passes through the humanizer before delivery.
  - **Marketing content:** All Fabrica's own marketing copy runs through the humanizer. "Our content doesn't sound like AI" is a selling point.
- **Priority:** HIGH

### 19. The Clone Pattern (Guide: Clone Any Coach)
- **Source:** Guide #17 — "Clone Any Coach"
- **Insight:** Pull YouTube content → transcribe → store in vector DB → extract persona profile → build chat clone. The clone speaks from the person's real content, not hallucinated. "Build this on yourself before someone builds a worse one."
- **Implementation for Fabrica:**
  - **Self-clone feature:** Let users build a "digital twin" of themselves. Feed it their emails, messages, content. The twin answers questions in their voice.
  - **Expert clones:** Users could clone industry experts (with permission) to get advice in their framework. "Ask Naval about pricing" → answers from Naval's real content.
  - **Fabrica as platform:** Position Fabrica as the platform where you build your AI clone — before someone else does.
- **Priority:** MEDIUM

### 20. MCP Connector Pattern (Guide: The Content Machine)
- **Source:** Guide #18 — "The Content Machine"
- **Insight:** Connect external tools (Higgsfield, Meta Ads, etc.) to Claude via MCP connectors. One-time setup, persistent connection. "Claude is the brain. The connector is the studio."
- **Implementation for Fabrica:**
  - **Plugin = MCP connector:** Every Fabrica plugin is essentially an MCP connector to an external service. Same pattern, same architecture.
  - **Connector marketplace:** Build a Fabrica connector marketplace where users browse available integrations. One-click connect.
  - **Revenue model:** Charge for premium connectors (Meta Ads, HubSpot, Stripe) while keeping basic ones free.
- **Priority:** HIGH

### 21. Long-Horizon Autonomy (Guide: Mythos Guide)
- **Source:** Guide #19 — "The Mythos Guide"
- **Insight:** Fable 5's edge: "The longer and more complex the task, the bigger its lead." 1M token context. Adaptive thinking. Built to run for hours without losing the plot. "Give it a goal and the tools, walk away, come back to finished work."
- **Implementation for Fabrica:**
  - **Agent autonomy levels:** Let users choose how autonomous their agents are: (1) Ask before every action, (2) Ask for irreversible actions only, (3) Full autonomy with logging.
  - **Long-running tasks:** Design Fabrica agents to handle multi-hour tasks: "Rebuild my entire content calendar for Q4" → agent works overnight → done by morning.
  - **Progress tracking:** Show users what their agents are doing in real-time. Transparency builds trust for autonomy.
- **Priority:** HIGH

### 22. Video Automation (Guide: Claude + Remotion Skill)
- **Source:** Guide #20 — "Never Open a Video Editor Again"
- **Insight:** Claude + Remotion = automated video production. Describe video in plain English → Claude writes React components → Remotion renders to MP4. Word-level captions, A/B test hooks, broadcast quality.
- **Implementation for Fabrica:**
  - **Plugin: Video creator:** A Fabrica plugin that generates short-form videos from text descriptions. "Create a 30-second product demo" → video rendered.
  - **Content repurposing:** Turn blog posts into video summaries automatically. One input → multiple formats.
  - **Social content:** Auto-generate Reels/TikToks from text content. "Turn this blog post into a Reel" → video + captions.
- **Priority:** LOW

### 23. Cross-Tool Revenue Leak Detection (Guide: Revenue Leak Dashboard)
- **Source:** Guide #21 — "30 Seconds. One Prompt. Every Revenue Leak."
- **Insight:** Most businesses run 5-15 tools that don't talk. Deals closed in HubSpot, never invoiced in Xero. Jobs done, never billed. $50k-$100k/year leaking. One prompt across two connectors reveals every gap.
- **Implementation for Fabrica:**
  - **Revenue leak plugin:** Build a Fabrica plugin that connects to 2-3 tools (CRM + accounting + project management) and finds gaps. "You closed 8 deals that were never invoiced."
  - **Landing page hook:** "Find your revenue leaks in 30 seconds" — compelling CTA that demonstrates immediate value.
  - **Free tool:** Offer the revenue leak scan as a free tool on the landing page. Users connect 2 tools → see leaks → sign up for Fabrica to fix them.
- **Priority:** HIGH

### 24. Infrastructure > Copy (Guide: Smartlead MCP)
- **Source:** Guide #22 — "Claude Has No Inbox"
- **Insight:** Cold email is two problems: writing a message (Claude solves this) and getting it delivered (infrastructure). "The best deliverability setup with mid copy will outperform the best copy on broken infrastructure every single time."
- **Implementation for Fabrica:**
  - **Plugin quality metric:** Rate plugins not just on what they do, but on how reliably they do it. "99% delivery rate" is a quality signal.
  - **Onboarding priority:** When a user sets up an email plugin, prioritize deliverability setup (warmup, domain health) before copy generation.
  - **Educational content:** "Why Your AI Emails Go to Spam" — guide that establishes Fabrica as the expert on infrastructure, not just copy.
- **Priority:** MEDIUM

### 25. Skill as Encapsulated Expertise (Guide: AI Sales OS)
- **Source:** Guide #25 — "The AI Sales OS"
- **Insight:** 9 skills replacing a full-time SDR ($60-90k/yr). Each skill is a SKILL.md file with: frontmatter, identity, pre-flight, step-by-step process, output format, hard rules. "Not prompts you paste into ChatGPT. Actual skills."
- **Implementation for Fabrica:**
  - **Fabrica skill format:** Define a standard Fabrica skill format inspired by this: frontmatter (name, description, allowed-tools), identity, pre-flight, process, output format, hard rules. This becomes the plugin specification.
  - **Skill library:** Build a library of Fabrica skills for each department. Users install skills, not just plugins.
  - **SDR replacement:** Position Fabrica's Sales skills as "Replace your $70K SDR with a $0 plugin" — quantified ROI.
  - **Deal rooms + client portals:** Build these features into Fabrica. They turn one-off projects into retainers.
- **Priority:** HIGH

### 26. The Advisor Skill Pattern (Guide: Private AI Board)
- **Source:** Guide #23 — "Your Private AI Board"
- **Insight:** Three advisor skills (Hormozi, Rubin, Naval) compiled from their public content. Each is a specialist invoked when you need that specific lens. They read your context and give advice grounded in your situation.
- **Implementation for Fabrica:**
  - **Fabrica advisor plugins:** Build advisor plugins for common business roles: "Pricing Advisor" (Hormozi-style), "Content Advisor" (Rubin-style), "Strategy Advisor" (Naval-style).
  - **Community marketplace:** Let users create and share their own advisor skills. "Clone yourself" as a Fabrica plugin.
  - **Weekly review pattern:** "Run all three advisors on your proposal before sending" — establishes Fabrica as essential workflow.
- **Priority:** MEDIUM

### 27. The 4-Layer AI Operating System (Guide: The AI Operating System)
- **Source:** Guide #29 — "The AI Operating System"
- **Insight:** 4 layers: (1) Always-On Automations (background agents, 24/7), (2) On-Demand Skills (specialists on your bench), (3) Live Dashboard (real-time business view), (4) Mobile Interface (usable from phone). Most people build 1-2 layers and wonder why it's not transformative.
- **Implementation for Fabrica:**
  - **Fabrica architecture = 4 layers.** This IS Fabrica's product architecture. Map it directly:
    - Layer 1: Always-On Agents (Fabrica agents running 24/7)
    - Layer 2: On-Demand Skills (plugin marketplace, slash commands)
    - Layer 3: Dashboard (Fabrica dashboard showing agent activity, metrics, alerts)
    - Layer 4: Mobile (Fabrica mobile app for approvals, alerts, briefings)
  - **Landing page structure:** Build the landing page around these 4 layers. "Always-On. On-Demand. Dashboard. Mobile. That's Fabrica."
  - **Feature prioritization:** Use the 4 layers as a feature checklist. If a feature doesn't fit into one of the 4 layers, it's not core.
- **Priority:** HIGH

### 28. The ROI Framework for Automation (Guide: The AI Operating System)
- **Source:** Guide #29
- **Insight:** For each process: Time cost = (hours/week) × (hourly rate) × 52. Error cost = annual cost of mistakes. Opportunity cost = what could this person do instead. Start with top 3 Low difficulty / High cost items. "The goal in month one is not to build the most impressive system. It's to save $50,000 in annual costs."
- **Implementation for Fabrica:**
  - **ROI calculator:** Use this exact formula in Fabrica's landing page calculator. Users input hours/week, hourly rate → get annual cost → see how Fabrica plugins reduce it.
  - **Onboarding flow:** After signup, walk users through building their ROI table. "What processes eat your time?" → rank by cost → recommend plugins for the top 3.
  - **Success metric:** "Fabrica saved you $X this month" — personalized ROI report sent monthly.
- **Priority:** HIGH

### 29. The Claude Code OS Pattern (Guide: The Claude Code OS)
- **Source:** Guide #27 — "The Claude Code OS"
- **Insight:** Run your entire business from one folder: CLAUDE.md (global instructions), skills/ (reusable agent modules), output/ (generated content), templates/ (prompt templates), memory/ (persistent context). Skills are triggered with `/skill-name`. Chain skills together: output of one becomes input of next.
- **Implementation for Fabrica:**
  - **Fabrica workspace = one folder.** Every Fabrica user gets a local workspace folder with: config (CLAUDE.md equivalent), plugins/, output/, templates/, memory/. This IS Fabrica's local-first architecture.
  - **Plugin chaining:** Let users chain plugins: "Research a prospect → draft email → send via Smartlead" — one workflow, multiple plugins.
  - **Memory persistence:** Every Fabrica session reads from and writes to the memory folder. Sessions compound over time.
  - **Slash commands:** Fabrica uses slash commands to trigger plugins. `/research`, `/draft-email`, `/proposal` — same pattern.
- **Priority:** HIGH

### 30. The Group Brain / Multi-User Knowledge (Guide: The Group Brain)
- **Source:** Guide #30 — "The Group Brain"
- **Insight:** Shared knowledge system for teams/masterminds. GROUP-CLAUDE.md (shared context), member expertise files, shared Obsidian vault, ingestion pipeline. Captures disagreements as "unresolved tension nodes." Pros-as-title format for notes.
- **Implementation for Fabrica:**
  - **Team features:** Build team support into Fabrica. Multiple users sharing one Company Brain. GROUP-CLAUDE.md equivalent for teams.
  - **Expertise mapping:** Each team member gets an expertise profile. When a question comes in, Fabrica routes to the right person's knowledge.
  - **Shared memory:** Team agents read from a shared memory, not just individual memory. "What does the team know about this client?"
  - **Disagreement capture:** When team members disagree, Fabrica captures both perspectives. Later, when data resolves the disagreement, Fabrica updates the knowledge.
- **Priority:** MEDIUM

### 31. The Agent Workforce Pattern (Guide: The 16-Agent AI Workforce)
- **Source:** Guide #33 — "The 16-Agent AI Workforce"
- **Insight:** 16 specialized agents, each with one job done well. Sales (9): Pluto, Emilio, Felix, Leonardo, Atlas, Artemis, Reply Classifier, Follow-Up Sequencer, Deal Note Extractor. Marketing (7): Picasso, Cicero, Harry, Iris, Metis, Cosmo, Newsletter Writer. Chains: Felix→Pluto→Emilio→Leonardo→Reply Classifier.
- **Implementation for Fabrica:**
  - **Plugin = one agent, one job.** Every Fabrica plugin does ONE thing well. Not a Swiss Army knife. A scalpel.
  - **Agent chains:** Let users chain plugins into workflows. "Find leads → research them → write emails → send → classify replies." Each plugin hands off to the next.
  - **Marketplace categories:** Organize plugins by the agent workforce model. "Sales Team" category with 9 plugins. "Marketing Team" category with 7.
  - **Free tier:** Offer 2-3 free plugins (like Pluto and Picasso) to get users hooked. Paid plugins for the full workforce.
- **Priority:** HIGH

### 32. The 37-Agent Marketing Org (Guide: The 37-Agent Marketing Org)
- **Source:** Guide #34 — "The 37-Agent Marketing Org"
- **Insight:** Complete AI marketing department: Content (8), Social (7), Demand Gen (7), SEO (6), Brand (5), Ops (4). Connected workflow: Keyword Strategist → Writer → Repurposing → Social Managers → Newsletter → Paid Media → ROAS Analyst → back to Keyword Strategist. System learns from its own performance.
- **Implementation for Fabrica:**
  - **Marketing plugin suite:** Build a complete Fabrica marketing suite: content creation, social scheduling, SEO analysis, paid media management, reporting. Each plugin = one agent.
  - **Connected workflows:** Plugins talk to each other. Content plugin outputs feed into social plugin. Social performance feeds into SEO plugin.
  - **Performance loop:** "System learns from its own performance" — plugins track what works and optimize future outputs.
  - **Phased rollout:** Month 1: Content. Month 2: Social. Month 3: SEO + Paid. Month 4: Full suite.
- **Priority:** HIGH

### 33. The Second Brain / Memory Architecture (Guide: Second Brain with Claude + Obsidian)
- **Source:** Guide #35 — "Second Brain with Claude + Obsidian"
- **Insight:** 3-layer architecture: (1) Context Layer (CLAUDE.md + memory directory), (2) Knowledge Graph (Obsidian vault + MCP bridge), (3) Ingestion Pipeline (brain-ingest: video/transcript → structured notes). Prose-as-title format. Self-improving graph.
- **Implementation for Fabrica:**
  - **Fabrica Memory = 3 layers.** This IS Fabrica's memory architecture:
    - Layer 1: Config file (CLAUDE.md equivalent) + memory/ directory
    - Layer 2: Local knowledge vault (Obsidian-style, searchable)
    - Layer 3: Ingestion pipeline (meetings/content → structured notes)
  - **Prose-as-title:** Every note in Fabrica's memory uses prose-as-title format. "Warm outbound converts 3x better" not "sales-notes.md."
  - **Brain-ingest integration:** Build meeting transcript processing into Fabrica. "Process this call" → structured notes → searchable memory.
  - **Self-improving:** Over time, Fabrica's memory gets smarter. Notes link to each other. Patterns emerge.
- **Priority:** HIGH

### 34. The 2-Agent Chain Pattern (Guide: The 2-Agent Outbound System)
- **Source:** Guide #32 — "The 2-Agent Outbound System"
- **Insight:** Pluto (research) + Emilio (email) chain. Research first, then write. "Most AI email tools produce generic copy because they have no real context." Context-first = 40-60% higher open rates.
- **Implementation for Fabrica:**
  - **Context-first principle:** Every Fabrica plugin that generates content must first gather context. Never generate from a blank slate.
  - **Plugin chaining UX:** Make it easy to chain 2-3 plugins. "Research this company → draft an email → humanize it." One-click chains.
  - **Quality signal:** "Powered by context-first AI" — differentiator from generic AI tools.
- **Priority:** HIGH

### 35. The Process Audit Framework (Guide: Company Process Audit Framework)
- **Source:** Guide #37 — "Company Process Audit Framework"
- **Insight:** 3-phase audit: Capture (inventory 12-15 processes), Rank (ROI calculation: annual hours × rate × automatable% × 0.7 haircut / build cost), Brief (one-page build brief). "Find the $200K automations instead of the $200 ones." Build effort: S (~$5K), M (~$20K), L (~$60K). ROI 15+ = Build now, 5-15 = Queue, under 5 = Skip.
- **Implementation for Fabrica:**
  - **Audit plugin:** Build a Fabrica plugin that runs this exact audit. Users answer questions → get ROI-ranked list → get build brief for #1. Companies pay $5-10K for this.
  - **ROI calculator on landing page:** Use the same formula. Users input hours/week, hourly rate → get annual savings → see which Fabrica plugins to build first.
  - **Onboarding flow:** New user onboarding = mini audit. "What processes eat your time?" → rank → recommend plugins.
  - **Consulting upsell:** Premium tier: "We run the full audit for you" — $500-1000 service that drives plugin sales.
- **Priority:** HIGH

### 36. The ChatGPT-to-Claude Migration Pattern (Guide: ChatGPT → Claude)
- **Source:** Guide #38 — "ChatGPT → Claude"
- **Insight:** 2-minute transfer: (1) Ask ChatGPT "Tell me absolutely everything you have come to know about me" with 30+ category headings, (2) Paste output to Claude with "Please remember all of this context", (3) Verify with personal context questions.
- **Implementation for Fabrica:**
  - **Migration tool:** Build a Fabrica plugin that migrates users from ChatGPT. "Transfer your ChatGPT memory to Fabrica" — one-click.
  - **Onboarding hook:** When a new user signs up, ask "Do you use ChatGPT? Transfer your memory in 2 minutes." Instant personalization.
  - **Category headings template:** Use the 30+ category headings as Fabrica's memory schema. Structure = organized memory.
- **Priority:** MEDIUM

### 37. The YOLO Mode / Autonomous Agent Pattern (Guide: Claude YOLO Mode)
- **Source:** Guide #40 — "Claude YOLO Mode"
- **Insight:** bypassPermissions flag removes all confirmation prompts. Safety: git checkpoint, narrow branch, sandbox/container. Three modes: Normal (all confirmations), Plan (read-only), YOLO (no confirmations). Hooks as middle ground: auto-approve reads, require confirmation for destructive actions.
- **Implementation for Fabrica:**
  - **Trust levels in Fabrica:** Give users 3 trust levels for plugins: Normal (ask permission), Plan (read-only), Auto (no confirmation). Let users choose per-plugin.
  - **Hooks system:** Let users set hooks: "Auto-approve reads, ask before writes, always ask before delete."
  - **Sandbox mode:** Run Fabrica agents in containers for safety. Users can go full-auto without risk.
  - **Progressive autonomy:** Start users in Normal mode. As they build trust, let them unlock Auto mode for specific plugins.
- **Priority:** MEDIUM

### 38. AI-Native vs AI-Enhanced Mental Model (Guide: Claude Code Foundations)
- **Source:** Guide #39 — "Claude Code Foundations"
- **Insight:** (Partial — article body not fully extractable due to client-side rendering) Two mental models: AI-Enhanced (using AI as a tool for existing tasks) vs AI-Native (building systems where AI is the foundation). 5-layer system for running business on autopilot. CLAUDE.md as business context. Compounding effect at week 12.
- **Implementation for Fabrica:**
  - **Position Fabrica as AI-Native, not AI-Enhanced.** "You're not using AI to do your old job faster. You're building a business that runs on AI." This is Fabrica's positioning.
  - **5-layer system:** The 4-layer AIOS from Guide 29 plus the CLAUDE.md context layer = 5 layers. Use as Fabrica's architecture.
  - **Compounding messaging:** "By week 12, Claude knows your business better than any human collaborator." Use in onboarding emails: "You're on week 3. By week 12, Fabrica will know your business inside out."
- **Priority:** HIGH

### 39. The Mobile-First Agent Pattern (Guide: Claude Remote Control)
- **Source:** Guide #41 — "Claude Remote Control"
- **Insight:** Start a Claude Code task on laptop, hand off to phone. Full local environment stays intact. Push notifications when tasks complete. Works from couch, coffee shop, anywhere. Session URL + QR code for quick mobile connect.
- **Implementation for Fabrica:**
  - **Fabrica mobile bridge:** Build exactly this. Start a task on desktop, continue on phone. QR code to connect. Push notifications when done.
  - **Phone-first approvals:** "Approve this proposal?" → push notification → tap to approve → done. No laptop needed.
  - **Session continuity:** Same session across devices. Start research at desk, review on phone, approve from couch.
  - **Landing page feature:** "Start on your laptop. Finish on your phone." Major selling point for non-technical founders who aren't always at a desk.
- **Priority:** HIGH

### 40. The Side-Question / Ephemeral Context Pattern (Guide: Claude BTW Mode)
- **Source:** Guide #42 — "Claude BTW Mode"
- **Insight:** /btw command lets you ask a side question mid-task without interrupting, adding noise to history, or burning tokens. Ephemeral Q&A. Reuses prompt cache (near-zero cost). Read-only.
- **Implementation for Fabrica:**
  - **Quick question mode:** Build a "quick question" feature in Fabrica. Ask a side question without disrupting the current workflow.
  - **Ephemeral context:** Side questions don't clutter the main conversation. Clean workspace.
  - **Cost efficiency:** Reuse prompt cache. Near-zero additional cost for side questions.
- **Priority:** LOW

### 41. The Sales Pipeline Skill Chain (Guide: 5 Skills for a $50K Pipeline)
- **Source:** Guide #43 — "5 Skills for a $50K Pipeline"
- **Insight:** 5 skills: lead-research-assistant (60s brief), cold-outreach (3-email sequence), sellthedream (prototype before proposal → 2-3x close rate), case-study (publishable proof), deal-tracker (daily pipeline review). Chain: research → outreach → discovery → prototype → close → case study. Total: under 2 hours per prospect.
- **Implementation for Fabrica:**
  - **Sales plugin bundle:** Build a Fabrica "Sales Pipeline" plugin bundle with these 5 plugins. Pre-chained workflow.
  - **sellthedream as killer feature:** "Build a prototype the same day as your discovery call" — this closes deals. Fabrica's killer sales feature.
  - **Deal tracker as daily ritual:** "Run /deal-tracker every morning" — Fabrica becomes part of the daily routine.
  - **Case study automation:** Close a deal → auto-generate case study → social proof for next 10 deals.
- **Priority:** HIGH

### 42. The Ads Intelligence Skill Pack (Guide: 5 Skills That Replace Your Ads Agency)
- **Source:** Guide #44 — "5 Skills That Replace Your Ads Agency"
- **Insight:** 5 skills: /spy (competitor ad library diff), /bulk-creative (20 ad variations in 10 min), /ads-score (6-dimension scoring), /ads-meta (186-point account audit), /ads-brief (creative brief for designers). Weekly workflow: Monday spy → Tuesday creative → Wednesday score → Friday audit. Replaces $3-8K/month agency.
- **Implementation for Fabrica:**
  - **Ads plugin bundle:** "Meta Ads Command Center" as a Fabrica plugin bundle. Spy + Create + Score + Audit + Brief.
  - **Weekly workflow automation:** Schedule the Monday→Tuesday→Wednesday→Friday workflow as a Fabrica automation.
  - **Pricing vs agency:** "$49/month vs $3-8K/month agency" — irresistible value prop.
  - **Competitive intelligence:** /spy plugin as a standalone product. "See what your competitors are running" — huge value.
- **Priority:** HIGH

### 43. The Full Creative Team Replacement (Guide: 7 Skills for Creative Teams)
- **Source:** Guide #45 — "7 Skills for Creative Teams"
- **Insight:** 7 skills: Voice DNA (extract voice profile), deep-research (MCP-powered with citations), Supermemory (persistent memory), ElevenLabs TTS (doc→podcast), Remotion Video (programmatic video), content-engine (1 piece→8 formats), ad-intelligence (competitor monitoring). Full pipeline at $122/month vs $270K/year headcount.
- **Implementation for Fabrica:**
  - **Creative suite:** Build a Fabrica "Creative Team" plugin bundle. Voice DNA + Research + Memory + TTS + Video + Content Engine + Ad Intel.
  - **Voice DNA as foundation:** Every content plugin reads the voice profile first. "Fabrica writes in YOUR voice."
  - **Content engine as daily tool:** One article → 8 platform formats. Fabrica's most-used plugin.
  - **Pricing:** "$29/month for the full creative suite vs $270K/year in headcount." Killer landing page stat.
- **Priority:** HIGH

### 44. The Complete GTM Pipeline (Guide: Claude Sales Prompt Pack)
- **Source:** Guide #46 — "Claude Sales Prompt Pack"
- **Insight:** 5 prompts for full pipeline: ICP→Apollo filters, Clay enrichment, research brief, cold email sequence, post-call proposal. $175/month stack (Apollo $49 + Clay $49 + Instantly $37 + Fireflies $19 + Claude $20) vs $220K/year headcount. Day 1-4 workflow: export leads → enrich → research → write → send. Proposals within 24 hours of discovery call.
- **Implementation for Fabrica:**
  - **GTM plugin bundle:** Build a "Full Pipeline" Fabrica plugin that chains all 5 steps. One workflow, end to end.
  - **Pricing comparison:** "$175/month vs $220K/year" — landing page stat. Make it prominent.
  - **Same-day proposals:** "Discovery call at 10am, proposal in their inbox by 5pm" — killer feature.
  - **Onboarding ritual:** "Run this pipeline on your first 10 prospects" — immediate value.
- **Priority:** HIGH

### 45. The 42-Agent Autonomous Sales Org (Guide: The 42-Agent Sales Org)
- **Source:** Guide #47 — "The 42-Agent Sales Org"
- **Insight:** 42 agents across 5 teams: Executive (CASO), Outreach (13: SDR Lead, Email, LinkedIn, Phone, Multi-Channel Sequencer, Follow-Up, Warm, International×3, Re-Engagement, Event, Referral), RevOps (8: CRM Architect, Data Quality, Pipeline Analyst, Competitive Intel, Forecast, Contract, Tech Stack Monitor, Attribution), Research & Intelligence (10: ICP Researcher, Prospect Profiler, Company Intel, News Monitor, Social Listening, Industry Analyst, Persona Modeller, Win/Loss Analyst, Account Intel, Signal Aggregator), Deal Desk & Enablement (10: Proposal Writer, Objection Handler, Pricing, Sales Coach, Content Librarian, Demo Customiser, Onboarding Coordinator, Executive Briefing, Case Study, Training Content). Start with 3 agents, scale to 42.
- **Implementation for Fabrica:**
  - **Sales org as plugin ecosystem:** Each of the 42 agents = a Fabrica plugin. Users build their sales org from plugins.
  - **Phased deployment:** "Start with 3 plugins, scale to 42" — lowers barrier to entry.
  - **CASO as orchestrator:** The Chief AI Sales Officer plugin orchestrates all other sales plugins. Central dashboard.
  - **Enterprise tier:** Full 42-agent deployment as a premium tier. "Your entire sales department for $X/month."
- **Priority:** HIGH

### 46. The 6-Phase Content Operating System (Guide: AI Content Operating System)
- **Source:** Guide #48 — "AI Content Operating System"
- **Insight:** 6 phases: (1) Knowledge Base (expertise.md, case-studies.md, faq.md, glossary.md, voice-profile.md), (2) Ideation Engine (weekly, 20 ideas ranked by search intent/authority/repurposability/timeliness), (3) Pillar Content (1 long-form/week), (4) Repurposing Engine (1→20+ assets: LinkedIn×5, Twitter×2, Instagram×3, Video×3, Email×1, Carousel×1, Podcast×1, Quotes×5-8, Outreach×1), (5) Publishing Pipeline (automated scheduling), (6) Feedback Loop (weekly metrics, monthly updates). "One piece in, 20+ assets out."
- **Implementation for Fabrica:**
  - **Content OS plugin:** Build a complete Fabrica Content OS plugin. 6 phases, one workflow.
  - **Knowledge base as foundation:** Every Fabrica user builds a knowledge base first. "This is what you know. This is your voice. Now let's create."
  - **Repurposing engine as daily tool:** One article → 20+ assets. Fabrica's most-used feature.
  - **Feedback loop:** Track what works, optimize what doesn't. "The system gets smarter every month."
  - **Pricing:** "$29/month for a full content department vs $200K+/year in headcount."
- **Priority:** HIGH

### 47. Phone→Desktop Dispatch (Guide: Claude Dispatch)
- **Source:** Guide #49 — "Claude Dispatch"
- **Insight:** Send a task from phone, Claude works on desktop, messages you when done. One continuous conversation syncs between devices. QR code pairing. Part of Claude Cowork. "You're walking into a meeting in 15 minutes. You text Claude: 'open the Acme proposal and pull the key points.'"
- **Implementation for Fabrica:**
  - **Fabrica Dispatch:** Build exactly this. Phone→Desktop task assignment. QR code to pair. Push notification when done.
  - **Meeting prep use case:** "I have a meeting in 15 minutes. Pull the key points from the proposal in my downloads." Instant value.
  - **Landing page feature:** "Text your computer. Get results." Simple, powerful selling point.
- **Priority:** HIGH

---

## Plugin-Specific Insights

> These were originally in plugins.md and have been merged here.

### P1. 7-Department Marketplace Taxonomy (Guide: Encode Your Business)
- **Source:** Guide #1 — "Encode Your Business"
- **Insight:** Altari organizes all business jobs into 7 departments: Sales (22 jobs), Deals (24), Marketing (23), Operations (19), Intelligence (17), Customer (14), Back Office (18). This is the most comprehensive business taxonomy we've seen — 137 jobs total, each with its own file.
- **Implementation for Fabrica-plugins:**
  - **Category structure:** Use these 7 departments as the primary category structure for the Fabrica plugin marketplace. More meaningful than generic tags.
  - **Plugin mapping:** Map every existing Fabrica plugin to one of these 7 departments. Plugins that don't fit → create new sub-categories.
  - **Discovery UX:** Users browse by department ("I need Sales plugins") not by tag ("show me all #automation plugins").
  - **Gap analysis:** Compare our plugin catalog against Altari's 137 jobs. Which jobs have no Fabrica plugin? Those are build opportunities.
- **Priority:** HIGH

### P2. Job-to-Plugin Mapping (Guide: Encode Your Business)
- **Source:** Guide #1
- **Insight:** Each of Altari's 137 jobs maps to a specific automation. For example, "reply-classification.md" → an agent that reads incoming replies and categorizes them. "proposal-generation.md" → an agent that drafts proposals from templates + CRM data.
- **Implementation for Fabrica-plugins:**
  - **Plugin = job solver.** Each Fabrica plugin should map to one or more specific jobs. The plugin's description should say "Solves jobs X, Y, Z from the [Department] department."
  - **Job-based search:** Users search for jobs ("I need help with proposal generation") not plugins ("show me proposal plugins").
  - **Plugin bundles:** Offer "Sales Department Bundle" = 5 plugins that cover the top 5 Sales jobs. Discount for buying the bundle.
- **Priority:** MEDIUM

### P3. Plugin Documentation Standard (Guide: Encode Your Business)
- **Source:** Guide #1
- **Insight:** Altari's job files use a 7-section format: Purpose, Trigger, Inputs, Steps, Output, Done when, Edge cases. This makes every job self-documenting and agent-readable.
- **Implementation for Fabrica-plugins:**
  - **Plugin spec format:** Every Fabrica plugin must include a `SPEC.md` file with these 7 sections. This becomes the standard.
  - **Agent-readable specs:** Fabrica agents read `SPEC.md` to understand what the plugin does, when to use it, and what "done" looks like.
  - **User-facing docs:** `SPEC.md` doubles as user documentation — same file, two audiences.
  - **Quality gate:** Plugins without a complete `SPEC.md` don't get listed in the marketplace.
- **Priority:** HIGH

### P4. Plugin Submission Process Insight (Guide: Encode Your Business)
- **Source:** Guide #1
- **Insight:** Altari's grading rubric (repetition, rules, digital in/out, cheap miss) can be inverted to evaluate plugin quality. A good plugin handles jobs that score 6-8 on the rubric.
- **Implementation for Fabrica-plugins:**
  - **Submission scoring:** When someone submits a plugin, score the jobs it handles using the 4-question rubric. High-scoring jobs = high-priority plugins.
  - **Quality metric:** "This plugin automates 5 jobs scoring 7/8 or higher" is a compelling quality signal.
  - **Marketplace sorting:** Sort plugins by average job score — highest-automation-potential first.
- **Priority:** MEDIUM

### P5. Plugin Permission Tiers (Guide: The AI Teammate Playbook)
- **Source:** Guide #3 — "The AI Teammate Playbook"
- **Insight:** Jobs ranked by risk: Green (auto-approve, low damage), Yellow (approval gate required), Red (never unsupervised). The gate: does it send, publish, delete, spend money, or touch production?
- **Implementation for Fabrica-plugins:**
  - **Risk rating system:** Every plugin gets a risk tier: 🟢 Auto (reporting, drafting), 🟡 Review (email, proposals), 🔴 Manual (payments, deletion).
  - **Marketplace display:** Show the risk tier on each plugin card. Users know before installing what level of oversight is needed.
  - **Default behavior:** 🟡 and 🔴 plugins require explicit user approval before executing irreversible actions.
  - **Bundle safety:** When users install a "Sales Bundle," show "3 green, 2 yellow, 0 red plugins included."
- **Priority:** HIGH

### P6. Plugin Config = Agent Brief (Guide: The AI Teammate Playbook)
- **Source:** Guide #3
- **Insight:** Agent brief template: ROLE, CONTEXT, TOOLS, THE JOB, DEFINITION OF DONE, BOUNDARIES, CADENCE. Missing "definition of done" and "boundaries" = agents that fail.
- **Implementation for Fabrica-plugins:**
  - **Config standard:** Every Fabrica plugin ships with a `config.md` using this exact 7-section format. This IS the plugin configuration.
  - **Two audiences:** `config.md` serves both the AI agent (reads it to know what to do) and the user (reads it to understand what the plugin does).
  - **Pre-filled configs:** Ship plugins with 5 of 7 sections pre-filled. User only fills CONTEXT (their business) and TOOLS (their integrations).
  - **Quality gate:** Incomplete `config.md` = plugin not listed. Enforce completeness.
- **Priority:** HIGH

### P7. "Watch Me Do It" Plugin Setup (Guide: The AI Teammate Playbook)
- **Source:** Guide #3
- **Insight:** Instead of configuring an agent via text, demonstrate the workflow live. The agent watches, records the path, and saves it as a reusable skill. "Teach by demonstration, not description."
- **Implementation for Fabrica-plugins:**
  - **Demo mode:** First time a user activates a plugin, they do the workflow manually while Fabrica watches. Fabrica saves the demonstrated path as the plugin's config.
  - **Decision capture:** The agent records not just actions but reasoning. "I skipped X because Y" becomes a rule.
  - **Skill accumulation:** Each demonstrated workflow adds to the user's skill library. Skills reference and build on each other.
- **Priority:** MEDIUM

### P8. Plugin Marketplace as "App Store" (Guide: The $500k App Stack)
- **Source:** Guide #5 — "The $500k App Stack"
- **Insight:** Successful apps use quiz → paywall → reveal. RevenueCat handles subscriptions. Superwall A/B tests paywalls. "Charge before the value."
- **Implementation for Fabrica-plugins:**
  - **Freemium plugins:** Free tier = limited usage (10 runs/day). Full access = subscription via RevenueCat.
  - **Plugin bundles as subscriptions:** "Sales Bundle" = $9.99/mo for 5 plugins. "Full Access" = $29.99/mo for all plugins.
  - **A/B test pricing:** Use Superwall-style experiments to find optimal plugin pricing.
  - **Free trials:** 3-day trial on weekly plans, no trial on annual. Test both orders.
- **Priority:** MEDIUM

### P9. Plugin = API Connector + Intelligence Layer (Guide: WHOOP Dashboard)
- **Source:** Guide #10 — "The WHOOP Dashboard"
- **Insight:** Connect an API → pull historical data → build dashboard → let users ask questions in plain English. The dashboard is the start; ongoing Q&A with your data is the real value.
- **Implementation for Fabrica-plugins:**
  - **Plugin architecture:** Every Fabrica plugin that connects to an API follows this pattern: (1) OAuth connect, (2) Pull historical data, (3) Build overview dashboard, (4) Enable natural language queries.
  - **Standard plugin template:** `connect → pull → display → query`. This is the universal plugin flow.
  - **Value demonstration:** After connecting, immediately show: "I found 6 months of data. Here are 3 insights." This proves value before the user does anything.
  - **Plugin quality metric:** "This plugin provides 5 pre-built queries and supports unlimited custom queries" — quantified value.
- **Priority:** HIGH

### P10. Plugin Memory Pattern (Guide: Permanent Memory)
- **Source:** Guide #7 — "Permanent Memory"
- **Insight:** Local SQLite + vector search for persistent memory. Structured records (title, narrative, key facts, tags, files). Private by default. Compounds over time.
- **Implementation for Fabrica-plugins:**
  - **Plugin state persistence:** Each plugin stores its history locally. "Show me what this plugin did last week" works because the data is there.
  - **Cross-plugin memory:** Plugins share a memory layer. The Sales plugin knows what the Support plugin learned about a customer.
  - **User-owned data:** All plugin memory stored in `~/.fabrica/plugins/[name]/data/`. Users can inspect, export, delete. Full transparency.
- **Priority:** HIGH

### P11. Higgsfield × Claude: 15 Seedance 2.0 Skills (Guide #31)
- **Source:** https://altari.ai/guide/higgsfield-seedance-skills
- **Insight:** 15 specialized video generation skills (Cinematic, 3D CGI, Cartoon, Anime, E-Commerce Ad, Product 360, Social Hook, Brand Story, Music Video, Fashion Lookbook, Food & Beverage, Real Estate, etc.). Each skill is a SKILL.md file with full production framework. Install once, describe concept, get production-ready video. Full pipeline: describe → Claude picks skill → generates 20+ line prompt → Playwright MCP opens Higgsfield → submits → video. 90 seconds from description to submission.
- **Implementation for Fabrica:**
  - **Video plugin marketplace:** Video generation skills as Fabrica plugins. Users pick the style they need, plugin handles the full pipeline.
  - **Skill = SKILL.md format:** Consistent plugin format. Every plugin has a SKILL.md with the production framework.
  - **MCP integration:** Plugins that connect to external services via MCP (Playwright for browser automation, direct API integrations).
  - **Chain with other plugins:** Video plugin chains with research plugin (research company → generate video for their product).
  - **Price point:** Video agencies charge $3-8K/month. Fabrica video plugins at $29-99/month undercuts dramatically.
- **Priority:** HIGH

### P12. The 16-Agent Workforce (Guide #33)
- **Source:** https://altari.ai/guide/16-ai-agent-workforce
- **Insight:** 16 specialized agents across Sales (9) and Marketing (7). Sales: Pluto (prospect researcher), Emilio (cold email), Felix (lead finder), Leonardo (LinkedIn outreach), Atlas (company researcher), Artemis (comment hunter), Reply Classifier, Follow-Up Sequencer, Deal Note Extractor. Marketing: Picasso (Instagram analyser), Cicero (content engine), Harry (hook generator), Iris (content intelligence), Metis (research & analysis), Cosmo (brand image generator), Newsletter Writer. Chains: Felix→Pluto→Emilio→Leonardo→Reply Classifier. Iris→Metis→Cicero→Harry→Picasso.
- **Implementation for Fabrica:**
  - **Plugin categories:** Organize Fabrica plugins into "Sales Team" and "Marketing Team" categories. Each plugin = one agent with one job.
  - **Workflow chains:** Pre-built workflow chains: "Outbound Chain" (find leads → research → write emails → send), "Content Chain" (identify topic → research → create → optimize → validate).
  - **Free tier hooks:** Offer 2-3 free plugins (Pluto, Picasso) to get users. Paid plugins for the full workforce.
  - **Voice profiles:** Plugins that learn your voice. Write in your style, not generic AI.
  - **Bulk processing:** Plugins that process CSVs in bulk. 50 prospects in 20-30 minutes.
- **Priority:** HIGH

### P13. The 37-Agent Marketing Org (Guide #34)
- **Source:** https://altari.ai/guide/37-ai-agents-marketing
- **Insight:** Complete AI marketing department: Content (8 agents), Social (7), Demand Gen (7), SEO (6), Brand (5), Ops (4). Connected workflow: Keyword Strategist → Writer → Repurposing → Social → Newsletter → Paid → ROAS → back to Keyword. System learns from its own performance.
- **Implementation for Fabrica:**
  - **Marketing suite:** Fabrica becomes a complete marketing department. One dashboard, all 37 agents as plugins.
  - **Department bundles:** Sell bundles: "Content Department" (8 plugins), "Full Marketing Org" (37 plugins). Discount for full suite.
  - **Performance feedback loop:** Plugins feed results back to each other. "This content performed well → create more like it."
  - **Pricing:** $49/mo for single department, $149/mo for full marketing org.
- **Priority:** HIGH

### P14. Second Brain + Obsidian Memory (Guide #35)
- **Source:** https://altari.ai/guide/second-brain-claude-obsidian
- **Insight:** 3-layer memory: (1) CLAUDE.md context layer + memory/ directory, (2) Obsidian vault + MCP bridge (semantic search), (3) brain-ingest pipeline (video/transcript → structured notes). Prose-as-title format. Self-improving graph over time.
- **Implementation for Fabrica:**
  - **Memory plugin:** Fabrica's memory system as a plugin. Users get CLAUDE.md equivalent, memory directory, and ingestion pipeline.
  - **Prose-as-title convention:** Standardize note naming in Fabrica. Every note is a claim, not a category.
  - **Brain-ingest integration:** "Process this meeting" plugin that turns transcripts into searchable, structured notes.
  - **Knowledge graph:** Visualize connections between notes. Show users how their knowledge compounds.
- **Priority:** HIGH

### P15. Sales Pipeline Skill Bundle (Guide #43)
- **Source:** https://altari.ai/guide/5-skills-50k-pipeline
- **Insight:** 5 skills: lead-research-assistant (60s brief), cold-outreach (3-email sequence), sellthedream (prototype before proposal → 2-3x close rate), case-study (publishable proof), deal-tracker (daily pipeline review). Chain: research → outreach → discovery → prototype → close → case study. Under 2 hours per prospect.
- **Implementation for Fabrica:**
  - **Sales plugin bundle:** Pre-chained workflow as a Fabrica "Sales Pipeline" bundle. 5 plugins, one install.
  - **sellthedream as killer feature:** "Build a prototype the same day as your discovery call" — closes deals.
  - **Deal tracker as daily ritual:** "Run /deal-tracker every morning" — Fabrica becomes daily habit.
  - **Chain UX:** One-click plugin chains. "Research → Email → Prototype → Close" — automated.
- **Priority:** HIGH

### P16. Ads Intelligence Skill Bundle (Guide #44)
- **Source:** https://altari.ai/guide/5-skills-replace-ads-agency
- **Insight:** 5 skills: /spy (competitor ad library diff), /bulk-creative (20 ad variations in 10 min), /ads-score (6-dimension scoring), /ads-meta (186-point account audit), /ads-brief (creative brief for designers). Weekly workflow: Monday spy → Tuesday creative → Wednesday score → Friday audit.
- **Implementation for Fabrica:**
  - **Ads plugin bundle:** "Meta Ads Command Center" as a Fabrica plugin bundle.
  - **Weekly automation:** Schedule Monday→Tuesday→Wednesday→Friday workflow as a Fabrica automation.
  - **Spy as standalone:** /spy plugin as a standalone product. "See what your competitors are running."
  - **Pricing:** "$49/month vs $3-8K/month agency" — irresistible value prop.
- **Priority:** HIGH

### P17. Full Creative Team Replacement (Guide #45)
- **Source:** https://altari.ai/guide/7-skills-creative-teams
- **Insight:** 7 skills: Voice DNA (extract voice profile), deep-research (MCP-powered with citations), Supermemory (persistent memory), ElevenLabs TTS (doc→podcast), Remotion Video (programmatic video), content-engine (1 piece→8 formats), ad-intelligence (competitor monitoring). $122/month vs $270K/year headcount.
- **Implementation for Fabrica:**
  - **Creative suite bundle:** "Creative Team" as a Fabrica plugin bundle. 7 plugins, $29/month.
  - **Voice DNA as foundation:** Every content plugin reads the voice profile first. "Fabrica writes in YOUR voice."
  - **Content engine as daily tool:** One article → 8 platform formats. Most-used plugin.
  - **Pricing:** "$29/month for the full creative suite vs $270K/year in headcount."
- **Priority:** HIGH

### P18. The 42-Agent Plugin Ecosystem (Guide #47)
- **Source:** https://altari.ai/guide/42-agent-sales-org
- **Insight:** 42 agents across 5 teams: Executive (CASO), Outreach (13), RevOps (8), Research & Intelligence (10), Deal Desk & Enablement (10). Start with 3 agents, scale to 42. Each agent = one job, one tool.
- **Implementation for Fabrica:**
  - **Plugin = agent:** Every Fabrica plugin is a specialized agent. 42 plugins = complete sales org.
  - **Phased deployment:** "Start with 3 plugins, scale to 42" — lowers barrier.
  - **CASO as orchestrator:** Central dashboard plugin that coordinates all sales plugins.
  - **Enterprise tier:** Full 42-plugin deployment as premium tier. "Your entire sales department."
- **Priority:** HIGH

### P19. Content OS Plugin (Guide #48)
- **Source:** https://altari.ai/guide/ai-content-operating-system
- **Insight:** 6-phase content system: Knowledge Base, Ideation Engine, Pillar Creation, Repurposing Engine (1→20+), Publishing Pipeline, Feedback Loop. Weekly ideation, monthly optimization. "One piece in, 20+ assets out."
- **Implementation for Fabrica:**
  - **Content OS plugin:** Complete 6-phase content system as one Fabrica plugin.
  - **Knowledge base foundation:** Users build knowledge base first. "This is what you know. This is your voice."
  - **Repurposing engine:** One article → 20+ assets. Most-used feature.
  - **Feedback loop:** Track what works, optimize. "The system gets smarter every month."
- **Priority:** HIGH

---

*Last updated: 2026-09-05*
