/**
 * seed-brewster.ts — Clear demo data and create the Brewster research project
 *
 * Usage: npx tsx scripts/seed-brewster.ts
 *
 * Creates 1 project, 1 goal, 4 milestones, and 14 research tasks with
 * proper dependencies, agent assignments, and Eisenhower classifications.
 */

import {
  saveTasks, saveGoals, saveProjects, saveBrainDump,
  saveActivityLog, saveInbox, saveDecisions,
} from "../src/lib/data";

const API = "http://localhost:3000/api";
const RESEARCH_DIR = "C:\\Users\\justs\\Documents\\Claude\\research\\Brewster";

async function post(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function put(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}${endpoint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

function outputNote(filename: string): string {
  return `IMPORTANT: Save your complete research output as a markdown file to ${RESEARCH_DIR}\\${filename}. Include a summary of key findings in your completion report for the inbox.`;
}

async function main() {
  console.log("=== Seeding Brewster Project ===\n");

  // ─── Step 1: Clear all data ──────────────────────────────────────────────
  console.log("1. Clearing existing data...");
  await saveProjects({ projects: [] });
  await saveTasks({ tasks: [] });
  await saveGoals({ goals: [] });
  await saveInbox({ messages: [] });
  await saveActivityLog({ events: [] });
  await saveDecisions({ decisions: [] });
  await saveBrainDump({ entries: [] });
  console.log("   ✓ All data cleared\n");

  // ─── Step 2: Create project ──────────────────────────────────────────────
  console.log("2. Creating project...");
  const proj = await post("/projects", {
    name: "Brewster — AI Robotic Home Brewery",
    description: "Comprehensive research and business planning for an AI-powered robotic home brewing appliance. The concept: an at-home micro brewery robot that brews beer automatically (dispenses ingredients, controls water temperature, etc.) on a 1-5 gallon scale. An AI-generated recipe controls the brewing — the user describes the beer they want, the system brews it, the user tastes and gives feedback, and the recipe adapts. Business model includes subscription-based ingredient refills, modular hardware upgrades, and potential open-source community.\n\nAll research outputs saved to research/Brewster/ as numbered markdown files.",
    status: "active",
    color: "#D97706",
    teamMembers: ["researcher", "business-analyst", "marketer", "developer"],
    tags: ["brewster", "hardware", "ai", "research", "brewing", "startup"],
  });
  const projId = proj.id;
  console.log(`   ✓ Project: ${projId}\n`);

  // ─── Step 3: Create goal + milestones ────────────────────────────────────
  console.log("3. Creating goal and milestones...");
  const goal = await post("/goals", {
    title: "Complete Brewster research phase and produce go/no-go recommendation",
    type: "long-term",
    timeframe: "Q2 2026",
    parentGoalId: null,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });
  const goalId = goal.id;

  const mile1 = await post("/goals", {
    title: "Market discovery: validate demand, map competition, define target customer",
    type: "medium-term",
    timeframe: "2026-03-08",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile2 = await post("/goals", {
    title: "Define MVP, hardware platform, business model, pricing, and open-source strategy",
    type: "medium-term",
    timeframe: "2026-03-15",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile3 = await post("/goals", {
    title: "Research manufacturing, supply chain, ingredients, and add-on ecosystem",
    type: "medium-term",
    timeframe: "2026-03-22",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile4 = await post("/goals", {
    title: "Develop launch strategy, branding, and pre-launch demand validation plan",
    type: "medium-term",
    timeframe: "2026-03-29",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  console.log(`   ✓ Goal: ${goalId}`);
  console.log(`   ✓ Milestones: ${mile1.id}, ${mile2.id}, ${mile3.id}, ${mile4.id}\n`);

  // Update goal with milestone IDs
  await put("/goals", {
    id: goalId,
    milestones: [mile1.id, mile2.id, mile3.id, mile4.id],
  });

  // ─── Step 4: Create tasks ───────────────────────────────────────────────
  console.log("4. Creating tasks...\n");
  const taskIds: Record<string, string> = {};

  // ── Phase 1: DO (important + urgent, no blockers) ──────────────────────

  const t1 = await post("/tasks", {
    title: "Research competitive landscape for smart/automated home brewing appliances",
    description: "Conduct a thorough competitive analysis of the automated home brewing market. Identify all existing products (PicoBrew, iGulu, MiniBrew, BrewBot, BEERMKR, Brewie, etc.), their current status (many have failed), what worked, what didn't, pricing, features, and market positioning. Analyze why several companies in this space have shut down and what lessons can be learned. Include both consumer home-brew products and any commercial-scale automated brewing systems. Evaluate open-source brewing projects (CraftBeerPi, BrewPiLess, Grainfather community). Produce a comprehensive comparison matrix.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile1.id,
    assignedTo: "researcher",
    collaborators: [],
    subtasks: [
      { id: "sub_1a", title: "Identify all current and defunct automated brewing products", done: false },
      { id: "sub_1b", title: "Build feature/price comparison matrix", done: false },
      { id: "sub_1c", title: "Analyze failure patterns (PicoBrew bankruptcy, etc.)", done: false },
      { id: "sub_1d", title: "Map open-source brewing automation projects", done: false },
      { id: "sub_1e", title: "Write findings to research/Brewster/01-competitive-landscape.md", done: false },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Comparison matrix covering at least 8 products (active and defunct)",
      "Analysis of why past competitors failed with specific lessons",
      "Feature gap analysis showing unmet market needs",
      "Markdown file saved to research/Brewster/01-competitive-landscape.md",
    ],
    tags: ["research", "competitive-analysis", "phase-1", "brewster"],
    notes: outputNote("01-competitive-landscape.md"),
  });
  taskIds["t1"] = t1.id;
  console.log(`   T1  [researcher]        ${t1.id} — Competitive Landscape`);

  const t2 = await post("/tasks", {
    title: "Define and segment the target market for an AI-powered home brewery",
    description: "Research and define the target market for Brewster. Analyze the home brewing demographic (age, income, geography, experience level). Evaluate the split between hobbyist home brewers vs. commercial targets (craft bars, restaurants, hotels, co-working spaces). Assess market size for each segment. Consider the 'prosumer' segment (serious home brewers who spend $500-2000+ on equipment). Research the craft beer market trends (growth/decline, premiumization, local brewing movement). Determine whether to target home brew enthusiasts first or go after commercial accounts (like small restaurants/bars that want to offer their own beers). Include a recommended primary and secondary target persona.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile1.id,
    assignedTo: "researcher",
    collaborators: ["business-analyst"],
    subtasks: [
      { id: "sub_2a", title: "Profile the home brewing demographic and spending patterns", done: false },
      { id: "sub_2b", title: "Assess commercial segment opportunity (bars, restaurants, hotels)", done: false },
      { id: "sub_2c", title: "Estimate addressable market size for each segment", done: false },
      { id: "sub_2d", title: "Create primary and secondary target customer personas", done: false },
      { id: "sub_2e", title: "Write findings to research/Brewster/02-target-market.md", done: false },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Clear primary and secondary target segments with rationale",
      "Market size estimates (TAM/SAM/SOM) for at least 2 segments",
      "At least 2 detailed customer personas with pain points and buying triggers",
      "Recommendation on home vs. commercial targeting priority",
      "Markdown file saved to research/Brewster/02-target-market.md",
    ],
    tags: ["research", "market-analysis", "phase-1", "brewster"],
    notes: outputNote("02-target-market.md"),
  });
  taskIds["t2"] = t2.id;
  console.log(`   T2  [researcher]        ${t2.id} — Target Market`);

  const t3 = await post("/tasks", {
    title: "Design a pre-launch demand validation strategy for Brewster",
    description: "Create a concrete demand validation plan that can be executed before building the product. Research methods for validating demand: landing page with email capture, Reddit/homebrew forum engagement, pre-order campaigns, surveys of homebrew communities, Facebook/Reddit ads with conversion tracking, Kickstarter research (analyze successful and failed brewing Kickstarters). Estimate costs and timelines for each validation method. Recommend a phased validation approach that costs under $500 total. Consider how to validate both home and commercial segments. The goal is to build a 'line out the door' before we launch the product.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile1.id,
    assignedTo: "marketer",
    collaborators: ["business-analyst"],
    subtasks: [
      { id: "sub_3a", title: "Research validation methods (landing pages, surveys, ad tests)", done: false },
      { id: "sub_3b", title: "Analyze brewing-related Kickstarters (successes and failures)", done: false },
      { id: "sub_3c", title: "Identify key homebrew communities for engagement", done: false },
      { id: "sub_3d", title: "Build phased validation roadmap with cost estimates", done: false },
      { id: "sub_3e", title: "Write findings to research/Brewster/03-demand-validation.md", done: false },
    ],
    blockedBy: [],
    estimatedMinutes: 45,
    acceptanceCriteria: [
      "At least 4 validation methods compared with cost/effort/reliability ratings",
      "Analysis of 3+ brewing Kickstarter campaigns (what worked, what failed)",
      "Phased validation plan with budget under $500",
      "Success/fail metrics defined for each validation step",
      "Markdown file saved to research/Brewster/03-demand-validation.md",
    ],
    tags: ["marketing", "validation", "phase-1", "brewster"],
    notes: outputNote("03-demand-validation.md"),
  });
  taskIds["t3"] = t3.id;
  console.log(`   T3  [marketer]          ${t3.id} — Demand Validation`);

  // ── Phase 2: SCHEDULE (important + not-urgent) ─────────────────────────

  const t4 = await post("/tasks", {
    title: "Define the MVP scope and product architecture for Brewster",
    description: "Based on competitive analysis and target market research, define what the Minimum Viable Product should be. Evaluate MVP options: (a) software-only brew monitoring app, (b) IoT sensor kit that retrofits existing equipment, (c) 1-gallon all-in-one appliance, (d) open-source hardware reference design. Consider the modularity vision: 1-gallon core unit that can expand to 5-gallon and potentially commercial scale (the difference is just the number of addons/modules). Define the AI component: recipe generation from natural language descriptions, fermentation monitoring, predictive temperature control, user taste feedback loop for recipe adaptation. Map out the user journey from unboxing to first brew. Consider sensor-based auto-ordering of ingredients.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile2.id,
    assignedTo: "business-analyst",
    collaborators: ["developer"],
    subtasks: [
      { id: "sub_4a", title: "Evaluate 4 MVP approaches (software, retrofit, appliance, open-source)", done: false },
      { id: "sub_4b", title: "Define modularity path: 1gal -> 5gal -> commercial", done: false },
      { id: "sub_4c", title: "Map AI features and user feedback loop for recipe adaptation", done: false },
      { id: "sub_4d", title: "Design user journey from unboxing to first brew", done: false },
      { id: "sub_4e", title: "Write findings to research/Brewster/04-mvp-definition.md", done: false },
    ],
    blockedBy: [taskIds["t1"], taskIds["t2"]],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Clear MVP recommendation with rationale tied to competitive gaps",
      "Modularity roadmap from 1-gallon to commercial scale",
      "AI feature specification with priority ranking",
      "User journey map for the first-time brew experience",
      "Markdown file saved to research/Brewster/04-mvp-definition.md",
    ],
    tags: ["strategy", "product", "mvp", "phase-2", "brewster"],
    notes: outputNote("04-mvp-definition.md") + " This task depends on competitive landscape (T1) and target market (T2) results.",
  });
  taskIds["t4"] = t4.id;
  console.log(`   T4  [business-analyst]  ${t4.id} — MVP Definition (blocked by T1, T2)`);

  const t5 = await post("/tasks", {
    title: "Research hardware platforms and standard brewing equipment for Brewster",
    description: "Investigate the hardware side of an automated brewing system. Compare controller platforms: Raspberry Pi (various models), ESP32, Arduino, custom PCB, or hybrid approaches. Evaluate standard brewing hardware: pumps, heating elements, temperature sensors, pressure sensors, valves, flow meters, pH sensors, gravity sensors. Research what CraftBeerPi and similar open-source projects use. Assess costs for a BOM (bill of materials) at different scales. Consider Raspberry Pi vs custom microprocessor trade-offs: cost at scale, supply chain reliability (Pi shortages), processing power for AI inference, connectivity options (WiFi, BLE). Research food-safe materials and certifications needed.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile2.id,
    assignedTo: "developer",
    collaborators: ["researcher"],
    subtasks: [
      { id: "sub_5a", title: "Compare controller platforms (RPi, ESP32, Arduino, custom PCB)", done: false },
      { id: "sub_5b", title: "Catalog standard brewing sensors and actuators with costs", done: false },
      { id: "sub_5c", title: "Research open-source brewing firmware (CraftBeerPi, etc.)", done: false },
      { id: "sub_5d", title: "Estimate BOM cost at 1-unit, 100-unit, and 1000-unit scales", done: false },
      { id: "sub_5e", title: "Write findings to research/Brewster/05-hardware-platform.md", done: false },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Controller platform comparison matrix with cost, capabilities, supply chain risk",
      "Standard brewing component catalog with suppliers and per-unit costs",
      "BOM estimate at 3 production scales (prototype, small batch, volume)",
      "Recommendation on platform choice with rationale",
      "Markdown file saved to research/Brewster/05-hardware-platform.md",
    ],
    tags: ["hardware", "technical", "phase-2", "brewster"],
    notes: outputNote("05-hardware-platform.md"),
  });
  taskIds["t5"] = t5.id;
  console.log(`   T5  [developer]         ${t5.id} — Hardware Platform`);

  const t6 = await post("/tasks", {
    title: "Analyze business models and pricing strategies for Brewster",
    description: "Research and recommend business models for a smart brewing appliance. Evaluate: (a) hardware-only sale, (b) hardware + subscription ingredient delivery (like Keurig/Nespresso model), (c) hardware + software subscription (premium recipes, AI features), (d) open-source hardware + paid cloud services, (e) white-label ingredient kits with recurring revenue, (f) freemium app + premium hardware. Research pricing models of similar hardware products (Keurig, SodaStream, Thermomix, iGulu). Analyze the ingredient subscription opportunity: periodic scheduled refills vs. sensor-based auto-ordering when ingredients run low. Consider pricing for home vs. commercial segments. Model unit economics for each approach. Would it be better to do periodic refills or add sensors to the ingredient tanks to automatically order refills?",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile2.id,
    assignedTo: "business-analyst",
    collaborators: ["researcher"],
    subtasks: [
      { id: "sub_6a", title: "Map 6 business model options with pros/cons", done: false },
      { id: "sub_6b", title: "Research comparable hardware product pricing (Keurig, SodaStream, etc.)", done: false },
      { id: "sub_6c", title: "Model unit economics for top 3 approaches", done: false },
      { id: "sub_6d", title: "Analyze subscription ingredient delivery feasibility and logistics", done: false },
      { id: "sub_6e", title: "Write findings to research/Brewster/06-business-model-pricing.md", done: false },
    ],
    blockedBy: [taskIds["t1"], taskIds["t2"]],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "At least 5 business models compared with revenue potential estimates",
      "Unit economics model for top 3 approaches (hardware cost, margin, LTV)",
      "Pricing recommendation for home and commercial segments",
      "Subscription ingredient model analysis with periodic vs sensor-based comparison",
      "Markdown file saved to research/Brewster/06-business-model-pricing.md",
    ],
    tags: ["business-model", "pricing", "strategy", "phase-2", "brewster"],
    notes: outputNote("06-business-model-pricing.md") + " This task depends on competitive landscape (T1) and target market (T2) results.",
  });
  taskIds["t6"] = t6.id;
  console.log(`   T6  [business-analyst]  ${t6.id} — Business Model & Pricing (blocked by T1, T2)`);

  const t7 = await post("/tasks", {
    title: "Evaluate the open-source hardware route for Brewster",
    description: "Research the viability of an open-source hardware approach for Brewster. Study successful open-source hardware businesses (Arduino, Adafruit, SparkFun, Prusa, Pine64). Analyze community-building strategies. Evaluate the spectrum: fully open-source vs. open-core (open hardware, proprietary AI/cloud). Consider the kit vs. pre-assembled model: selling components for DIY builders vs. turnkey assembled units vs. both. Research open-source hardware licenses (CERN OHL, TAPR OHL). Assess how modularity enables community contributions (custom add-ons, recipes, firmware mods). Study how CraftBeerPi and similar projects built their communities. Should we build a community and sell kits instead of full assemblies? Make it modular for upgrades?",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile2.id,
    assignedTo: "researcher",
    collaborators: ["business-analyst"],
    subtasks: [
      { id: "sub_7a", title: "Study 5+ successful open-source hardware businesses", done: false },
      { id: "sub_7b", title: "Compare kit vs pre-assembled vs hybrid distribution", done: false },
      { id: "sub_7c", title: "Evaluate open-source licenses for hardware (CERN OHL, etc.)", done: false },
      { id: "sub_7d", title: "Design community engagement and contribution strategy", done: false },
      { id: "sub_7e", title: "Write findings to research/Brewster/07-open-source-strategy.md", done: false },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Case studies of 5+ open-source hardware businesses with revenue insights",
      "Kit vs assembled vs hybrid comparison with margin analysis",
      "License recommendation with rationale",
      "Community building playbook with specific platforms and tactics",
      "Markdown file saved to research/Brewster/07-open-source-strategy.md",
    ],
    tags: ["open-source", "hardware", "community", "phase-2", "brewster"],
    notes: outputNote("07-open-source-strategy.md"),
  });
  taskIds["t7"] = t7.id;
  console.log(`   T7  [researcher]        ${t7.id} — Open Source Strategy`);

  // ── Phase 3: SCHEDULE (blocked by Phase 2) ─────────────────────────────

  const t8 = await post("/tasks", {
    title: "Research manufacturing options and supply chain for Brewster hardware",
    description: "Investigate manufacturing paths for a smart brewing appliance. Research: domestic vs. overseas manufacturing (Shenzhen, Mexico, domestic small-batch). Evaluate contract manufacturers for small electronics + food-safe equipment. Assess FDA/food-safety certification requirements for a brewing appliance. Research injection molding costs for custom enclosures at various volumes. Consider PCB assembly (PCBA) options. Study the supply chain: component sourcing, lead times, minimum order quantities. Evaluate Crowd Supply, GroupGets, or similar platforms for initial manufacturing runs. Research food-contact material certifications (NSF, FDA 21 CFR). How do we get it manufactured at scale?",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile3.id,
    assignedTo: "researcher",
    collaborators: [],
    subtasks: [
      { id: "sub_8a", title: "Compare domestic vs overseas manufacturing options", done: false },
      { id: "sub_8b", title: "Research food-safety certifications (FDA, NSF)", done: false },
      { id: "sub_8c", title: "Get ballpark costs for injection molding and PCBA", done: false },
      { id: "sub_8d", title: "Evaluate initial-run platforms (Crowd Supply, etc.)", done: false },
      { id: "sub_8e", title: "Write findings to research/Brewster/08-manufacturing-supply-chain.md", done: false },
    ],
    blockedBy: [taskIds["t5"]],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Manufacturing options compared with cost estimates at 100/500/1000 units",
      "Food-safety certification requirements documented with timeline and cost",
      "Supply chain risk assessment for key components",
      "Recommended manufacturing path for initial production run",
      "Markdown file saved to research/Brewster/08-manufacturing-supply-chain.md",
    ],
    tags: ["manufacturing", "supply-chain", "phase-3", "brewster"],
    notes: outputNote("08-manufacturing-supply-chain.md") + " Depends on hardware platform (T5) for BOM and component decisions.",
  });
  taskIds["t8"] = t8.id;
  console.log(`   T8  [researcher]        ${t8.id} — Manufacturing (blocked by T5)`);

  const t9 = await post("/tasks", {
    title: "Research ingredient sourcing, white-label kits, and subscription fulfillment",
    description: "Investigate the ingredient supply side of the business. Research wholesale ingredient suppliers for brewing (malt, hops, yeast, adjuncts). Evaluate white-label ingredient kit options: designing branded recipe kits with pre-measured ingredients. How do we get white-label ingredients with our logo added, drop shipped to customers? Research dropship fulfillment partners for ingredient delivery. Analyze subscription models: periodic scheduled refills vs. sensor-based auto-ordering when ingredients run low. Compare white-labeling vs. partnering with existing homebrew suppliers. Research shelf life and storage requirements for brewing ingredients. Estimate ingredient kit costs and margins. Study how Keurig, Nespresso, and SodaStream handle their consumables supply chain.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile3.id,
    assignedTo: "business-analyst",
    collaborators: ["researcher"],
    subtasks: [
      { id: "sub_9a", title: "Identify wholesale brewing ingredient suppliers", done: false },
      { id: "sub_9b", title: "Design white-label ingredient kit concept with cost model", done: false },
      { id: "sub_9c", title: "Research dropship and fulfillment options", done: false },
      { id: "sub_9d", title: "Compare periodic refills vs sensor-based auto-ordering", done: false },
      { id: "sub_9e", title: "Write findings to research/Brewster/09-ingredients-subscription.md", done: false },
    ],
    blockedBy: [taskIds["t6"]],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "At least 3 ingredient supplier options with wholesale pricing",
      "White-label kit cost breakdown with target margin analysis",
      "Subscription fulfillment model comparison (self vs. 3PL vs. dropship)",
      "Sensor-based auto-ordering feasibility assessment",
      "Markdown file saved to research/Brewster/09-ingredients-subscription.md",
    ],
    tags: ["ingredients", "subscription", "supply-chain", "phase-3", "brewster"],
    notes: outputNote("09-ingredients-subscription.md") + " Depends on business model (T6) for subscription model decisions.",
  });
  taskIds["t9"] = t9.id;
  console.log(`   T9  [business-analyst]  ${t9.id} — Ingredients & Subscription (blocked by T6)`);

  const t10 = await post("/tasks", {
    title: "Research add-on accessories and expansion module opportunities for Brewster",
    description: "Explore the ecosystem expansion potential beyond the core brewing unit. Research potential add-ons: smoker module (smoked beers), fruit masher/infuser (fruit beers, ciders), cold-brew coffee module, kombucha fermentation module, carbonation system, keg dispenser module, hop spider, grain mill attachment. Evaluate the 1-gallon to 5-gallon upgrade path — is the difference just the number of addons/modules we offer? (i.e. core starts at 1 gal, order the upgrade to 5+ gal and get into commercial territory). Research commercial upgrade modules for bars/restaurants (larger volumes, multi-batch, cleaning systems). Analyze the revenue potential of an accessories ecosystem.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile3.id,
    assignedTo: "researcher",
    collaborators: [],
    subtasks: [
      { id: "sub_10a", title: "Catalog potential add-on modules with feasibility assessment", done: false },
      { id: "sub_10b", title: "Design the 1gal to 5gal+ upgrade path", done: false },
      { id: "sub_10c", title: "Research commercial expansion modules for bars/restaurants", done: false },
      { id: "sub_10d", title: "Estimate revenue potential of accessory ecosystem", done: false },
      { id: "sub_10e", title: "Write findings to research/Brewster/10-addons-ecosystem.md", done: false },
    ],
    blockedBy: [taskIds["t4"]],
    estimatedMinutes: 45,
    acceptanceCriteria: [
      "At least 6 add-on modules evaluated with technical feasibility",
      "Scale-up path documented (1gal -> 5gal -> commercial)",
      "Revenue model for accessories ecosystem",
      "Prioritized add-on roadmap with recommended launch sequence",
      "Markdown file saved to research/Brewster/10-addons-ecosystem.md",
    ],
    tags: ["product", "accessories", "ecosystem", "phase-3", "brewster"],
    notes: outputNote("10-addons-ecosystem.md") + " Depends on MVP definition (T4) for core product architecture.",
  });
  taskIds["t10"] = t10.id;
  console.log(`   T10 [researcher]        ${t10.id} — Add-ons Ecosystem (blocked by T4)`);

  const t11 = await post("/tasks", {
    title: "Design the AI recipe adaptation engine and user feedback system for Brewster",
    description: "Architect the AI/software side of Brewster. The core concept: user describes the beer they want in natural language, AI generates a recipe, the system brews it, user tastes and provides feedback, AI adapts the recipe for next time. Research how AI can optimize brewing recipes based on user feedback (taste ratings, fermentation data, environmental conditions). Design the feedback loop: user rates brew -> AI adjusts recipe parameters -> improved next batch. Evaluate ML approaches: recommendation systems, Bayesian optimization for recipe tuning, NLP for parsing taste descriptions ('too bitter', 'more citrus'). Research how sensor data (temperature curves, pH, gravity) can feed into optimization. Consider edge AI (on-device) vs. cloud inference. Study how Brewfather and BeerSmith handle recipe management.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile3.id,
    assignedTo: "developer",
    collaborators: ["researcher"],
    subtasks: [
      { id: "sub_11a", title: "Research ML approaches for recipe optimization", done: false },
      { id: "sub_11b", title: "Design user feedback loop and rating system", done: false },
      { id: "sub_11c", title: "Evaluate edge AI vs cloud inference trade-offs", done: false },
      { id: "sub_11d", title: "Design data model for recipes, brew logs, preferences", done: false },
      { id: "sub_11e", title: "Write findings to research/Brewster/11-ai-recipe-engine.md", done: false },
    ],
    blockedBy: [taskIds["t4"], taskIds["t5"]],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "AI/ML approach recommendation with justification",
      "User feedback loop design with specific data points collected",
      "Edge vs cloud analysis with latency, cost, and privacy trade-offs",
      "Data model specification for recipes, brews, and user profiles",
      "Markdown file saved to research/Brewster/11-ai-recipe-engine.md",
    ],
    tags: ["ai", "software", "technical", "phase-3", "brewster"],
    notes: outputNote("11-ai-recipe-engine.md") + " Depends on MVP (T4) and hardware platform (T5) for constraints.",
  });
  taskIds["t11"] = t11.id;
  console.log(`   T11 [developer]         ${t11.id} — AI Recipe Engine (blocked by T4, T5)`);

  // ── Phase 4: SCHEDULE (blocked by earlier phases) ──────────────────────

  const t12 = await post("/tasks", {
    title: "Generate product name options and brand identity direction for the smart brewery",
    description: "Develop product naming options and initial brand direction. Generate 15-20 product name candidates (beyond the working title 'Brewster'). Evaluate names against criteria: memorability, domain availability (.com), trademark searchability, international appeal, brewery/tech connotation balance. Research brand positioning: premium tech vs. approachable DIY vs. maker/hacker vs. artisan craft. Consider brand architecture if pursuing both home and commercial product lines. Suggest logo direction, color palette, and brand voice guidelines. Check competitor brand positioning for differentiation opportunities.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile4.id,
    assignedTo: "marketer",
    collaborators: [],
    subtasks: [
      { id: "sub_12a", title: "Generate 15-20 product name candidates with rationale", done: false },
      { id: "sub_12b", title: "Check domain availability and trademark conflicts", done: false },
      { id: "sub_12c", title: "Define brand positioning and voice guidelines", done: false },
      { id: "sub_12d", title: "Suggest visual identity direction (colors, logo style)", done: false },
      { id: "sub_12e", title: "Write findings to research/Brewster/12-naming-brand.md", done: false },
    ],
    blockedBy: [taskIds["t2"]],
    estimatedMinutes: 45,
    acceptanceCriteria: [
      "15+ name candidates scored against evaluation criteria",
      "Top 5 names with domain availability and trademark search results",
      "Brand positioning statement and voice guidelines",
      "Visual identity mood board or direction description",
      "Markdown file saved to research/Brewster/12-naming-brand.md",
    ],
    tags: ["branding", "naming", "marketing", "phase-4", "brewster"],
    notes: outputNote("12-naming-brand.md") + " Depends on target market (T2) for persona-aligned branding.",
  });
  taskIds["t12"] = t12.id;
  console.log(`   T12 [marketer]          ${t12.id} — Naming & Brand (blocked by T2)`);

  const t13 = await post("/tasks", {
    title: "Develop the launch strategy and crowdfunding playbook for Brewster",
    description: "Create a comprehensive launch strategy. Evaluate launch channels: Kickstarter vs. Indiegogo vs. direct pre-order vs. Crowd Supply. Research successful hardware Kickstarters in the food/beverage/kitchen space (study funding levels, reward tiers, video styles, stretch goals). Design a multi-phase launch: (1) community building, (2) pre-launch email list, (3) crowdfunding campaign, (4) retail/direct sales. Estimate funding goal and realistic raise based on comparable campaigns. Plan a content marketing calendar for the pre-launch phase. Consider the role of Reddit r/homebrewing, YouTube brewing channels, and homebrew influencers. What other considerations to start this as a viable business? What is our launch model?",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile4.id,
    assignedTo: "marketer",
    collaborators: ["business-analyst"],
    subtasks: [
      { id: "sub_13a", title: "Compare crowdfunding platforms for hardware launch", done: false },
      { id: "sub_13b", title: "Analyze 5+ successful kitchen/beverage hardware campaigns", done: false },
      { id: "sub_13c", title: "Design reward tier structure and funding goal", done: false },
      { id: "sub_13d", title: "Build pre-launch community building and content calendar", done: false },
      { id: "sub_13e", title: "Write findings to research/Brewster/13-launch-strategy.md", done: false },
    ],
    blockedBy: [taskIds["t3"], taskIds["t6"]],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Platform recommendation with rationale (Kickstarter vs alternatives)",
      "Analysis of 5+ comparable successful campaigns with key learnings",
      "Reward tier structure with pricing",
      "Pre-launch timeline with specific milestones and content calendar",
      "Markdown file saved to research/Brewster/13-launch-strategy.md",
    ],
    tags: ["launch", "crowdfunding", "marketing", "phase-4", "brewster"],
    notes: outputNote("13-launch-strategy.md") + " Depends on demand validation (T3) and business model (T6) research.",
  });
  taskIds["t13"] = t13.id;
  console.log(`   T13 [marketer]          ${t13.id} — Launch Strategy (blocked by T3, T6)`);

  const t14 = await post("/tasks", {
    title: "Synthesize all Brewster research into a go/no-go recommendation report",
    description: "Read all 13 previous research outputs from the research/Brewster/ folder and synthesize them into a comprehensive executive summary with a go/no-go recommendation. Cover: market opportunity assessment, competitive positioning, recommended MVP path, business model recommendation, estimated capital requirements, key risks and mitigations, recommended timeline, and critical success factors. Highlight the top 3 opportunities and top 3 risks. Provide a clear recommendation on whether to proceed, pivot, or pass — with specific conditions for each path. Include a rough financial projection for Year 1 (costs, revenue, breakeven analysis).",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile4.id,
    assignedTo: "business-analyst",
    collaborators: ["researcher", "marketer"],
    subtasks: [
      { id: "sub_14a", title: "Read all 13 research outputs from research/Brewster/", done: false },
      { id: "sub_14b", title: "Synthesize findings into opportunity assessment", done: false },
      { id: "sub_14c", title: "Build Year 1 financial projection", done: false },
      { id: "sub_14d", title: "Formulate go/no-go recommendation with conditions", done: false },
      { id: "sub_14e", title: "Write findings to research/Brewster/14-synthesis-recommendation.md", done: false },
    ],
    blockedBy: [taskIds["t4"], taskIds["t6"], taskIds["t8"], taskIds["t9"], taskIds["t12"], taskIds["t13"]],
    estimatedMinutes: 60,
    acceptanceCriteria: [
      "Executive summary covering all 13 research areas",
      "Clear go/no-go/pivot recommendation with specific conditions",
      "Top 3 opportunities and top 3 risks with mitigations",
      "Year 1 financial projection with assumptions stated",
      "Markdown file saved to research/Brewster/14-synthesis-recommendation.md",
    ],
    tags: ["synthesis", "strategy", "decision", "phase-4", "brewster"],
    notes: outputNote("14-synthesis-recommendation.md") + " This is the capstone task — read ALL files in research/Brewster/ before writing.",
  });
  taskIds["t14"] = t14.id;
  console.log(`   T14 [business-analyst]  ${t14.id} — Synthesis & Go/No-Go (blocked by T4,T6,T8,T9,T12,T13)`);

  // ─── Step 5: Update milestones with task IDs ─────────────────────────────
  console.log("\n5. Updating milestones with task IDs...");
  const allTaskIds = Object.values(taskIds);

  await put("/goals", { id: mile1.id, tasks: [taskIds["t1"], taskIds["t2"], taskIds["t3"]] });
  await put("/goals", { id: mile2.id, tasks: [taskIds["t4"], taskIds["t5"], taskIds["t6"], taskIds["t7"]] });
  await put("/goals", { id: mile3.id, tasks: [taskIds["t8"], taskIds["t9"], taskIds["t10"], taskIds["t11"]] });
  await put("/goals", { id: mile4.id, tasks: [taskIds["t12"], taskIds["t13"], taskIds["t14"]] });
  await put("/goals", { id: goalId, tasks: allTaskIds });

  console.log("   ✓ Milestones updated\n");

  // ─── Done ────────────────────────────────────────────────────────────────
  console.log("=== Brewster project seeded successfully ===");
  console.log(`   Project:    ${projId}`);
  console.log(`   Goal:       ${goalId}`);
  console.log(`   Milestones: ${[mile1.id, mile2.id, mile3.id, mile4.id].join(", ")}`);
  console.log(`   Tasks:      ${allTaskIds.length} created`);
  console.log(`\n   Phase 1 (run immediately): T1, T2, T3, T5, T7`);
  console.log(`   Phase 2 (after Phase 1):  T4, T6`);
  console.log(`   Phase 3 (after Phase 2):  T8, T9, T10, T11`);
  console.log(`   Phase 4 (after Phase 3):  T12, T13, T14`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
