/**
 * Seed script: Infant Feeding App — Parenting Companion
 * Adds project, goals, milestones, and 18 tasks to Mission Control.
 * Updates brain dump entry bd_dNSQo28mjIhm as processed.
 *
 * Usage: npx tsx scripts/seed-infant-feeding.ts
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const NOW = new Date().toISOString();
const RESEARCH_DIR = "C:\\Users\\justs\\Documents\\Claude\\research\\InfantFeedingApp";

// ─── Project ───────────────────────────────────────────────────────────────

const project = {
  id: "proj_InfantFeedingApp",
  name: "Infant Feeding App — Parenting Companion",
  description:
    "A mobile-first infant feeding tracker and parenting companion app. Tracks feeding timing, amounts, type (breast/bottle/formula), caregiver identity, and correlates with symptom data (gas, fussiness, digestion). Features include beautiful graphs, a 'hungry meter' based on feeding frequency, formula/product comparisons, breast pump recommendations, swaddling technique guides, breastfeeding dietary recommendations, and an interactive community forum for parents. Designed with a sleep-deprived-friendly UI. Initially mobile (iOS/Android), with multi-platform commercialization potential.\n\nBrain dump origin: bd_dNSQo28mjIhm. All research outputs saved to C:\\Users\\justs\\Documents\\Claude\\research\\InfantFeedingApp\\.",
  status: "active",
  color: "#EC4899",
  teamMembers: [
    "researcher",
    "business-analyst",
    "marketer",
    "developer",
    "tester",
    "me",
  ],
  createdAt: NOW,
  tags: [
    "infant",
    "parenting",
    "health",
    "mobile",
    "tracking",
    "community",
    "startup",
  ],
  deletedAt: null,
};

// ─── Goals & Milestones ────────────────────────────────────────────────────

const goals = [
  {
    id: "goal_IFA_main",
    title:
      "Complete full research, planning, and prototype for infant feeding app — ready for launch decision",
    type: "long-term",
    timeframe: "Q3 2026",
    parentGoalId: null,
    projectId: "proj_InfantFeedingApp",
    status: "not-started",
    milestones: [
      "goal_IFA_m1_research",
      "goal_IFA_m2_strategy",
      "goal_IFA_m3_gtm",
      "goal_IFA_m4_prototype",
    ],
    tasks: [
      "task_IFA_001",
      "task_IFA_002",
      "task_IFA_003",
      "task_IFA_004",
      "task_IFA_005",
      "task_IFA_006",
      "task_IFA_007",
      "task_IFA_008",
      "task_IFA_009",
      "task_IFA_010",
      "task_IFA_011",
      "task_IFA_012",
      "task_IFA_013",
      "task_IFA_014",
      "task_IFA_015",
      "task_IFA_016",
      "task_IFA_017",
      "task_IFA_018",
    ],
    createdAt: NOW,
    deletedAt: null,
  },
  {
    id: "goal_IFA_m1_research",
    title:
      "Market discovery: competitive landscape, target audience, compliance, technology feasibility",
    type: "medium-term",
    timeframe: "2026-04-04",
    parentGoalId: "goal_IFA_main",
    projectId: "proj_InfantFeedingApp",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_IFA_001",
      "task_IFA_002",
      "task_IFA_003",
      "task_IFA_004",
      "task_IFA_005",
      "task_IFA_006",
    ],
    createdAt: NOW,
    deletedAt: null,
  },
  {
    id: "goal_IFA_m2_strategy",
    title:
      "Define monetization, product roadmap, brand identity, PRD, and technical architecture",
    type: "medium-term",
    timeframe: "2026-04-25",
    parentGoalId: "goal_IFA_main",
    projectId: "proj_InfantFeedingApp",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_IFA_007",
      "task_IFA_008",
      "task_IFA_009",
      "task_IFA_010",
      "task_IFA_011",
    ],
    createdAt: NOW,
    deletedAt: null,
  },
  {
    id: "goal_IFA_m3_gtm",
    title:
      "Go-to-market strategy, content/community launch plan, and ASO strategy",
    type: "medium-term",
    timeframe: "2026-05-09",
    parentGoalId: "goal_IFA_main",
    projectId: "proj_InfantFeedingApp",
    status: "not-started",
    milestones: [],
    tasks: ["task_IFA_012", "task_IFA_013", "task_IFA_014"],
    createdAt: NOW,
    deletedAt: null,
  },
  {
    id: "goal_IFA_m4_prototype",
    title:
      "UI/UX design, MVP core development, community forum prototype, and QA testing",
    type: "medium-term",
    timeframe: "2026-06-13",
    parentGoalId: "goal_IFA_main",
    projectId: "proj_InfantFeedingApp",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_IFA_015",
      "task_IFA_016",
      "task_IFA_017",
      "task_IFA_018",
    ],
    createdAt: NOW,
    deletedAt: null,
  },
];

// ─── Tasks ─────────────────────────────────────────────────────────────────

const tasks = [
  // ── Phase 1: Research & Discovery ──────────────────────────────────────
  {
    id: "task_IFA_001",
    title:
      "Research market size and opportunity for infant feeding tracker apps",
    description:
      "Conduct comprehensive market sizing for the infant feeding/baby tracking app space. Estimate TAM (global baby care app market), SAM (feeding-focused tracker apps in English-speaking markets), and SOM (realistic first-year capture for a bootstrapped entrant). Analyze market growth drivers including rising birth rates, smartphone adoption among new parents, and the growing trend of data-driven parenting. Research the broader parenting app ecosystem revenue and where feeding trackers fit within it.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m1_research",
    assignedTo: "business-analyst",
    collaborators: ["researcher"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_001a",
        title: "Estimate TAM for global baby care / parenting app market",
        done: false,
      },
      {
        id: "sub_001b",
        title:
          "Estimate SAM for feeding-focused tracker apps in English markets",
        done: false,
      },
      {
        id: "sub_001c",
        title: "Estimate SOM for bootstrapped entrant in year 1-3",
        done: false,
      },
      {
        id: "sub_001d",
        title:
          "Analyze growth drivers (birth rates, smartphone adoption, data-driven parenting trends)",
        done: false,
      },
      {
        id: "sub_001e",
        title:
          "Research parenting app revenue benchmarks and download volumes",
        done: false,
      },
      {
        id: "sub_001f",
        title: `Write findings to ${RESEARCH_DIR}\\01-market-sizing.md`,
        done: false,
      },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "TAM/SAM/SOM estimates with cited sources and methodology",
      "Growth rate projections for baby tracker app category (3-5 year horizon)",
      "Revenue benchmarks for comparable apps (download volumes, ARPU, retention rates)",
      "Clear market opportunity statement with supporting data",
      `Markdown file saved to ${RESEARCH_DIR}\\01-market-sizing.md`,
    ],
    comments: [],
    tags: ["research", "market-analysis", "phase-1", "infant-feeding-app"],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\01-market-sizing.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_002",
    title:
      "Research competitive landscape for infant feeding and baby tracker apps",
    description:
      "Conduct a thorough competitive analysis of the infant feeding and baby tracking app market. Evaluate all major competitors including Huckleberry, Baby Tracker, Glow Baby, BabyConnect, Sprout Baby, Feed Baby, Baby Daybook, and others. Analyze each app's feature set, pricing model, user ratings, download counts, and key differentiators. Identify gaps in the market — particularly around symptom correlation with feeding, community features, and the 'hungry meter' concept.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m1_research",
    assignedTo: "researcher",
    collaborators: [],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_002a",
        title:
          "Identify and profile all major competitors (Huckleberry, Baby Tracker, Glow Baby, BabyConnect, Sprout Baby, Feed Baby, Baby Daybook, etc.)",
        done: false,
      },
      {
        id: "sub_002b",
        title:
          "Build feature comparison matrix (tracking types, graphs, community, UX quality, pricing)",
        done: false,
      },
      {
        id: "sub_002c",
        title:
          "Analyze App Store/Google Play ratings, reviews, and common complaints",
        done: false,
      },
      {
        id: "sub_002d",
        title:
          "Identify unmet needs and market gaps (symptom correlation, caregiver tracking, hungry meter, community)",
        done: false,
      },
      {
        id: "sub_002e",
        title:
          "Evaluate competitor monetization models (freemium, subscription, one-time purchase, ads)",
        done: false,
      },
      {
        id: "sub_002f",
        title: `Write findings to ${RESEARCH_DIR}\\02-competitive-landscape.md`,
        done: false,
      },
    ],
    blockedBy: [],
    estimatedMinutes: 75,
    actualMinutes: null,
    acceptanceCriteria: [
      "Comparison matrix covering at least 8 competitor apps with features, pricing, ratings, and download estimates",
      "Analysis of top 3 competitors' strengths and weaknesses with specific evidence from user reviews",
      "Feature gap analysis identifying at least 5 unmet needs in the current market",
      "Summary of competitor monetization strategies with revenue estimates where available",
      `Markdown file saved to ${RESEARCH_DIR}\\02-competitive-landscape.md`,
    ],
    comments: [],
    tags: [
      "research",
      "competitive-analysis",
      "phase-1",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\02-competitive-landscape.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_003",
    title:
      "Define target audience segments and user personas for infant feeding app",
    description:
      "Research and define the target user segments for the infant feeding app. Profile the primary users (new parents, especially sleep-deprived mothers and fathers in the first 12 months), secondary users (caregivers — grandparents, nannies, daycare workers), and tertiary users (pediatricians or lactation consultants who may recommend the app). Create detailed personas that will drive UX decisions — the core design constraint is that the user is often exhausted, one-handed, and in the dark.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m1_research",
    assignedTo: "researcher",
    collaborators: ["business-analyst"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_003a",
        title:
          "Profile primary user segment (new parents in first 12 months)",
        done: false,
      },
      {
        id: "sub_003b",
        title:
          "Profile secondary user segment (caregivers: grandparents, nannies, daycare)",
        done: false,
      },
      {
        id: "sub_003c",
        title:
          "Profile tertiary users (pediatricians, lactation consultants as recommenders)",
        done: false,
      },
      {
        id: "sub_003d",
        title:
          "Create 3-4 detailed personas with demographics, pain points, device usage, and scenarios",
        done: false,
      },
      {
        id: "sub_003e",
        title:
          "Research UX requirements for sleep-deprived, one-handed, low-light usage contexts",
        done: false,
      },
      {
        id: "sub_003f",
        title: `Write findings to ${RESEARCH_DIR}\\03-target-audience-personas.md`,
        done: false,
      },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "At least 3 detailed user personas with demographics, pain points, goals, and technology habits",
      "Analysis of usage contexts (one-handed, dark room, sleep-deprived) and their UX implications",
      "Caregiver sharing use case documented (multi-user access for tracking by different people)",
      "Professional recommender segment analyzed (pediatricians, lactation consultants)",
      `Markdown file saved to ${RESEARCH_DIR}\\03-target-audience-personas.md`,
    ],
    comments: [],
    tags: [
      "research",
      "user-research",
      "personas",
      "phase-1",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\03-target-audience-personas.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_004",
    title:
      "Research regulatory compliance requirements for infant health data apps (HIPAA, COPPA, FDA, GDPR)",
    description:
      "Investigate all regulatory and compliance requirements relevant to an app that tracks infant health data. Research HIPAA implications, COPPA considerations (the app is used by parents about children under 13), FDA regulations (does a 'symptom correlation' feature cross into medical device territory?), GDPR/data privacy requirements, and state-level privacy laws (CCPA). Determine what health claims can and cannot be made and how to structure the app to minimize regulatory burden.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m1_research",
    assignedTo: "researcher",
    collaborators: ["business-analyst"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_004a",
        title:
          "Research HIPAA applicability to consumer health tracking apps (covered entity analysis)",
        done: false,
      },
      {
        id: "sub_004b",
        title:
          "Analyze COPPA requirements for apps storing data about children under 13",
        done: false,
      },
      {
        id: "sub_004c",
        title:
          "Investigate FDA regulations — does symptom correlation or feeding recommendations trigger medical device classification?",
        done: false,
      },
      {
        id: "sub_004d",
        title:
          "Review GDPR, CCPA, and state privacy law requirements for health-adjacent data",
        done: false,
      },
      {
        id: "sub_004e",
        title:
          "Document required disclaimers, terms, and compliance safeguards for launch",
        done: false,
      },
      {
        id: "sub_004f",
        title: `Write findings to ${RESEARCH_DIR}\\04-regulatory-compliance.md`,
        done: false,
      },
    ],
    blockedBy: [],
    estimatedMinutes: 75,
    actualMinutes: null,
    acceptanceCriteria: [
      "Clear determination on HIPAA applicability with rationale and citation",
      "COPPA compliance requirements listed with specific implementation steps",
      "FDA boundary analysis — what features trigger medical device classification and how to avoid it",
      "GDPR/CCPA data handling requirements summarized with practical recommendations",
      "List of required legal disclaimers for health-related features",
      `Markdown file saved to ${RESEARCH_DIR}\\04-regulatory-compliance.md`,
    ],
    comments: [],
    tags: [
      "research",
      "compliance",
      "legal",
      "hipaa",
      "coppa",
      "phase-1",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\04-regulatory-compliance.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_005",
    title:
      "Evaluate technology stack and platform options for infant feeding tracker app",
    description:
      "Research and recommend the optimal technology stack for the infant feeding app. Evaluate cross-platform frameworks (React Native, Flutter, Expo) vs. native development. Assess backend options (Supabase, Firebase, Cloudflare Workers + D1) for real-time data sync between caregivers. Research charting/graphing libraries, offline-first architecture, push notification systems, community forum backends, and data export capabilities. Factor in the solo-developer constraint.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m1_research",
    assignedTo: "developer",
    collaborators: ["researcher"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_005a",
        title:
          "Evaluate cross-platform frameworks (React Native/Expo vs Flutter vs native) for solo dev feasibility",
        done: false,
      },
      {
        id: "sub_005b",
        title:
          "Assess backend/BaaS options (Supabase, Firebase, Cloudflare) for real-time multi-caregiver sync",
        done: false,
      },
      {
        id: "sub_005c",
        title:
          "Research mobile charting libraries for beautiful, performant feeding graphs",
        done: false,
      },
      {
        id: "sub_005d",
        title:
          "Evaluate offline-first architecture patterns and sync strategies",
        done: false,
      },
      {
        id: "sub_005e",
        title:
          "Research push notification, community forum, and data export solutions",
        done: false,
      },
      {
        id: "sub_005f",
        title: `Write findings to ${RESEARCH_DIR}\\05-technology-feasibility.md`,
        done: false,
      },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "Framework recommendation with pros/cons matrix (React Native vs Flutter vs native)",
      "Backend recommendation with cost projections at 1K, 10K, 100K users",
      "Charting library shortlist with mobile performance benchmarks or reviews",
      "Offline-first architecture design suitable for nighttime feeding scenarios",
      "Multi-caregiver real-time sync approach documented",
      `Markdown file saved to ${RESEARCH_DIR}\\05-technology-feasibility.md`,
    ],
    comments: [],
    tags: [
      "research",
      "technology",
      "architecture",
      "phase-1",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\05-technology-feasibility.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_006",
    title:
      "Research community forum models and social features for parenting apps",
    description:
      "Investigate existing community and social features in parenting apps and forums. Analyze how apps like BabyCenter, What to Expect, Peanut, and The Bump handle community features. Research moderation challenges unique to parenting communities. Evaluate build-vs-buy options for forum functionality. Consider both local (geo-based parent groups) and topic-based (feeding tips, parenting techniques, product recommendations, swaddling, breastfeeding support) community structures.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m1_research",
    assignedTo: "researcher",
    collaborators: ["marketer"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_006a",
        title:
          "Analyze community features in BabyCenter, What to Expect, Peanut, The Bump, and Glow",
        done: false,
      },
      {
        id: "sub_006b",
        title:
          "Research moderation challenges specific to parenting communities (misinformation, shaming, mental health)",
        done: false,
      },
      {
        id: "sub_006c",
        title:
          "Evaluate build vs buy for forum tech (custom, Discourse, Circle, Tribe, Stream, SendBird)",
        done: false,
      },
      {
        id: "sub_006d",
        title:
          "Analyze local (geo-based) vs topic-based community structures and engagement patterns",
        done: false,
      },
      {
        id: "sub_006e",
        title:
          "Research content moderation tools and policies for health-adjacent communities",
        done: false,
      },
      {
        id: "sub_006f",
        title: `Write findings to ${RESEARCH_DIR}\\06-community-forum-research.md`,
        done: false,
      },
    ],
    blockedBy: [],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "Analysis of at least 5 parenting apps' community features with engagement metrics where available",
      "Moderation strategy framework addressing parenting-specific challenges",
      "Build vs buy comparison with cost estimates and implementation timeline for each option",
      "Community structure recommendation (local groups, topic groups, or hybrid)",
      `Markdown file saved to ${RESEARCH_DIR}\\06-community-forum-research.md`,
    ],
    comments: [],
    tags: [
      "research",
      "community",
      "social",
      "moderation",
      "phase-1",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\06-community-forum-research.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },

  // ── Phase 2: Strategy & Planning ───────────────────────────────────────
  {
    id: "task_IFA_007",
    title:
      "Design monetization strategy for infant feeding app based on research findings",
    description:
      "Synthesize all Phase 1 research to recommend a monetization strategy. Evaluate models: freemium, subscription tiers, one-time purchase, affiliate revenue (formula/pump recommendations), sponsored content from baby brands, and hybrid approaches. Model revenue projections for each approach at different user scales. Consider ethical constraints — parents are price-sensitive and emotionally vulnerable. Recommend a primary and secondary revenue stream with pricing.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m2_strategy",
    assignedTo: "business-analyst",
    collaborators: ["marketer"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_007a",
        title:
          "Evaluate 5+ monetization models (freemium, subscription, one-time, affiliate, sponsored content)",
        done: false,
      },
      {
        id: "sub_007b",
        title:
          "Model revenue projections at 1K, 10K, 100K MAU for each model",
        done: false,
      },
      {
        id: "sub_007c",
        title:
          "Analyze competitor pricing and user willingness to pay from review sentiment",
        done: false,
      },
      {
        id: "sub_007d",
        title:
          "Assess ethical constraints and brand risk for each monetization approach",
        done: false,
      },
      {
        id: "sub_007e",
        title:
          "Recommend primary and secondary revenue streams with specific pricing",
        done: false,
      },
      {
        id: "sub_007f",
        title: `Write findings to ${RESEARCH_DIR}\\07-monetization-strategy.md`,
        done: false,
      },
    ],
    blockedBy: ["task_IFA_001", "task_IFA_002", "task_IFA_003"],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "At least 5 monetization models evaluated with pros, cons, and revenue projections",
      "Revenue model projections at 3 user scales with assumptions documented",
      "Ethical analysis of each model in the context of parenting (no predatory patterns)",
      "Clear recommendation with primary + secondary revenue streams and launch pricing",
      `Markdown file saved to ${RESEARCH_DIR}\\07-monetization-strategy.md`,
    ],
    comments: [],
    tags: [
      "strategy",
      "monetization",
      "business-model",
      "phase-2",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\07-monetization-strategy.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_008",
    title:
      "Prioritize features and build product roadmap for infant feeding app",
    description:
      "Take the full feature set and prioritize using a weighted scoring framework (impact vs. effort vs. differentiation). Features: feeding timer/tracker, amount tracking, feeding type, caregiver tracking, symptom tracking with feeding correlation, beautiful graphs, 'hungry meter' prediction, formula comparisons, breast pump recommendations, swaddling techniques, breastfeeding dietary recommendations, community forum, data sharing with pediatrician, push notifications, multi-baby support, data export. Create a phased roadmap: MVP, v1.1, v1.5, v2.0.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m2_strategy",
    assignedTo: "business-analyst",
    collaborators: ["developer", "me"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_008a",
        title:
          "Score all features on impact (user value), effort (dev cost), and differentiation (competitive edge)",
        done: false,
      },
      {
        id: "sub_008b",
        title: "Define MVP feature set — minimum for App Store launch",
        done: false,
      },
      {
        id: "sub_008c",
        title:
          "Define v1.1 features (first update, 4-6 weeks post-launch)",
        done: false,
      },
      {
        id: "sub_008d",
        title:
          "Define v1.5 and v2.0 feature sets (community, recommendations, premium)",
        done: false,
      },
      {
        id: "sub_008e",
        title: "Create visual roadmap timeline with dependencies",
        done: false,
      },
      {
        id: "sub_008f",
        title: `Write findings to ${RESEARCH_DIR}\\08-feature-roadmap.md`,
        done: false,
      },
    ],
    blockedBy: [
      "task_IFA_001",
      "task_IFA_002",
      "task_IFA_003",
      "task_IFA_004",
      "task_IFA_005",
      "task_IFA_006",
    ],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "Weighted scoring matrix for all 15+ features with clear methodology",
      "MVP feature set defined with rationale for each inclusion/exclusion",
      "Phased roadmap (MVP, v1.1, v1.5, v2.0) with approximate timelines",
      "Dependencies between features clearly mapped",
      `Markdown file saved to ${RESEARCH_DIR}\\08-feature-roadmap.md`,
    ],
    comments: [],
    tags: [
      "strategy",
      "product",
      "roadmap",
      "prioritization",
      "phase-2",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\08-feature-roadmap.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_009",
    title:
      "Brainstorm app name, develop brand identity, and define market positioning",
    description:
      "Create the brand identity for the infant feeding app. Generate 15-20 name candidates that evoke warmth, trust, simplicity, and nurturing. Check domain availability and App Store name conflicts for top candidates. Define brand voice (warm, supportive, non-judgmental — never shaming about feeding choices). Create a visual identity direction. Position the brand relative to clinical trackers, AI-powered sleep apps, and social parenting apps.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m2_strategy",
    assignedTo: "marketer",
    collaborators: ["me"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_009a",
        title: "Generate 15-20 name candidates with rationale for each",
        done: false,
      },
      {
        id: "sub_009b",
        title:
          "Check domain availability and App Store name conflicts for top 5 names",
        done: false,
      },
      {
        id: "sub_009c",
        title:
          "Define brand voice guidelines (warm, supportive, non-judgmental tone)",
        done: false,
      },
      {
        id: "sub_009d",
        title:
          "Create visual identity direction (colors, typography, icon style concepts)",
        done: false,
      },
      {
        id: "sub_009e",
        title:
          "Write competitive positioning statement and brand strategy",
        done: false,
      },
      {
        id: "sub_009f",
        title: `Write findings to ${RESEARCH_DIR}\\09-brand-identity-naming.md`,
        done: false,
      },
    ],
    blockedBy: ["task_IFA_002", "task_IFA_003"],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "At least 15 name candidates with emotional rationale and linguistic analysis",
      "Top 5 names verified for domain availability (.com, .app) and App Store conflicts",
      "Brand voice guide with tone examples (do's and don'ts for communication)",
      "Visual identity mood board or direction with color palette and typography recommendations",
      "Competitive positioning map showing differentiation from top 5 competitors",
      `Markdown file saved to ${RESEARCH_DIR}\\09-brand-identity-naming.md`,
    ],
    comments: [],
    tags: [
      "marketing",
      "branding",
      "naming",
      "positioning",
      "phase-2",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\09-brand-identity-naming.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_010",
    title:
      "Write comprehensive Product Requirements Document (PRD) for infant feeding app MVP",
    description:
      "Synthesize all research and strategy work into a formal PRD. Define MVP scope, user stories, functional requirements, non-functional requirements (performance, accessibility, offline, security), data model design, API requirements for multi-caregiver sync, and success metrics. Include wireframe-level descriptions of key screens. Document edge cases: timezone changes, DST, multiple babies, premature infant adjusted age calculations.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m2_strategy",
    assignedTo: "business-analyst",
    collaborators: ["developer", "me"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_010a",
        title:
          "Define user stories for each MVP feature (feeding tracker, symptom log, graphs, hungry meter)",
        done: false,
      },
      {
        id: "sub_010b",
        title:
          "Document functional requirements with acceptance criteria per feature",
        done: false,
      },
      {
        id: "sub_010c",
        title:
          "Document non-functional requirements (performance, offline-first, accessibility, security)",
        done: false,
      },
      {
        id: "sub_010d",
        title:
          "Design data model (feeding entries, symptoms, caregivers, babies, correlations)",
        done: false,
      },
      {
        id: "sub_010e",
        title: "Define success metrics and KPIs for MVP launch",
        done: false,
      },
      {
        id: "sub_010f",
        title: `Write PRD to ${RESEARCH_DIR}\\10-prd.md`,
        done: false,
      },
    ],
    blockedBy: ["task_IFA_007", "task_IFA_008"],
    estimatedMinutes: 90,
    actualMinutes: null,
    acceptanceCriteria: [
      "User stories covering all MVP features with clear acceptance criteria",
      "Data model diagram or schema covering feeding entries, symptoms, caregivers, and correlations",
      "Non-functional requirements documented (offline-first, sub-200ms interactions, WCAG accessibility)",
      "Edge cases documented (timezones, DST, multiple babies, premature age adjustment)",
      "Launch KPIs defined (retention, DAU, session length, feeding entries per user)",
      `Markdown file saved to ${RESEARCH_DIR}\\10-prd.md`,
    ],
    comments: [],
    tags: [
      "strategy",
      "product",
      "prd",
      "requirements",
      "phase-2",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\10-prd.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_011",
    title:
      "Design technical architecture for infant feeding app based on PRD and tech feasibility research",
    description:
      "Produce the technical architecture document based on the PRD and technology feasibility study. Define the full stack: mobile framework, state management, offline data layer, backend services, database schema, real-time sync protocol, push notifications, analytics, and CI/CD. Design the 'hungry meter' algorithm and the symptom-feeding correlation engine. Document API endpoints, authentication flow, and data encryption approach.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m2_strategy",
    assignedTo: "developer",
    collaborators: ["business-analyst"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_011a",
        title:
          "Define full stack architecture diagram (mobile, backend, database, sync, notifications)",
        done: false,
      },
      {
        id: "sub_011b",
        title:
          "Design database schema for feeding entries, symptoms, caregivers, babies, and correlations",
        done: false,
      },
      {
        id: "sub_011c",
        title:
          "Design 'hungry meter' prediction algorithm (feeding frequency analysis)",
        done: false,
      },
      {
        id: "sub_011d",
        title:
          "Design symptom-feeding correlation engine (pattern detection approach)",
        done: false,
      },
      {
        id: "sub_011e",
        title:
          "Document API endpoints, authentication flow, and data encryption strategy",
        done: false,
      },
      {
        id: "sub_011f",
        title: `Write architecture doc to ${RESEARCH_DIR}\\11-technical-architecture.md`,
        done: false,
      },
    ],
    blockedBy: ["task_IFA_005", "task_IFA_010"],
    estimatedMinutes: 90,
    actualMinutes: null,
    acceptanceCriteria: [
      "Architecture diagram covering all system components with data flow",
      "Database schema with tables/collections, relationships, and indexing strategy",
      "Hungry meter algorithm documented with inputs, logic, and output format",
      "Symptom-feeding correlation approach documented with statistical methodology",
      "API endpoint list with request/response shapes for core CRUD operations",
      `Markdown file saved to ${RESEARCH_DIR}\\11-technical-architecture.md`,
    ],
    comments: [],
    tags: [
      "architecture",
      "technical",
      "design",
      "phase-2",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\11-technical-architecture.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },

  // ── Phase 3: Go-to-Market Planning ─────────────────────────────────────
  {
    id: "task_IFA_012",
    title:
      "Develop go-to-market strategy for infant feeding app launch",
    description:
      "Create a comprehensive go-to-market plan. Define the launch sequence: soft launch (TestFlight/beta), influencer seeding, public launch. Identify key marketing channels: parenting influencers, parenting subreddits, Facebook parenting groups, pediatrician/lactation consultant partnerships, and parenting blog outreach. Develop launch messaging (lead with the pain point, not features). Create a pre-launch waitlist strategy. Estimate CAC across channels and recommend a launch budget.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m3_gtm",
    assignedTo: "marketer",
    collaborators: ["business-analyst", "me"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_012a",
        title:
          "Define launch sequence (beta, influencer seeding, public launch timeline)",
        done: false,
      },
      {
        id: "sub_012b",
        title:
          "Identify and rank marketing channels by cost, reach, and audience fit",
        done: false,
      },
      {
        id: "sub_012c",
        title:
          "Develop launch messaging strategy and core value proposition copy",
        done: false,
      },
      {
        id: "sub_012d",
        title:
          "Design pre-launch waitlist strategy with referral mechanics",
        done: false,
      },
      {
        id: "sub_012e",
        title:
          "Estimate CAC per channel and recommend launch budget",
        done: false,
      },
      {
        id: "sub_012f",
        title: `Write strategy to ${RESEARCH_DIR}\\12-go-to-market-strategy.md`,
        done: false,
      },
    ],
    blockedBy: ["task_IFA_007", "task_IFA_008", "task_IFA_009"],
    estimatedMinutes: 75,
    actualMinutes: null,
    acceptanceCriteria: [
      "Phased launch plan with specific timeline and milestones",
      "At least 8 marketing channels ranked with estimated CAC and reach",
      "Launch messaging framework with 3 headline variations and supporting copy",
      "Pre-launch waitlist strategy with specific referral incentive mechanics",
      "Launch budget recommendation with ROI projections",
      `Markdown file saved to ${RESEARCH_DIR}\\12-go-to-market-strategy.md`,
    ],
    comments: [],
    tags: [
      "marketing",
      "go-to-market",
      "launch",
      "phase-3",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\12-go-to-market-strategy.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_013",
    title:
      "Plan content marketing and community launch strategy for infant feeding app",
    description:
      "Design the content marketing engine and community building strategy. Plan content pillars: feeding guides, symptom management, product reviews (formula comparisons, breast pump reviews, swaddling guides), dietary recommendations for breastfeeding, and parenting support. Define the community launch plan: seed initial topics, recruit founding members (doulas, lactation consultants, experienced parents), establish non-judgmental community guidelines. Plan 90-day content calendar.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m3_gtm",
    assignedTo: "marketer",
    collaborators: ["researcher"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_013a",
        title:
          "Define content pillars (feeding guides, symptom management, product reviews, dietary recommendations, parenting support)",
        done: false,
      },
      {
        id: "sub_013b",
        title:
          "Plan community seeding strategy (recruit founding members, initial topics, moderation guidelines)",
        done: false,
      },
      {
        id: "sub_013c",
        title:
          "Create 90-day content calendar (blog posts, social media, in-app content)",
        done: false,
      },
      {
        id: "sub_013d",
        title:
          "Develop community guidelines emphasizing non-judgmental feeding choice support",
        done: false,
      },
      {
        id: "sub_013e",
        title: `Write strategy to ${RESEARCH_DIR}\\13-content-community-strategy.md`,
        done: false,
      },
    ],
    blockedBy: ["task_IFA_006", "task_IFA_009"],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "Content pillar framework with 4+ pillars and 10+ topic ideas per pillar",
      "Community seeding plan with target founding member profiles and recruitment approach",
      "90-day content calendar with specific post topics, formats, and publishing cadence",
      "Community guidelines document ready for in-app deployment",
      `Markdown file saved to ${RESEARCH_DIR}\\13-content-community-strategy.md`,
    ],
    comments: [],
    tags: [
      "marketing",
      "content",
      "community",
      "phase-3",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\13-content-community-strategy.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_014",
    title:
      "Develop App Store Optimization (ASO) strategy for infant feeding app",
    description:
      "Create a comprehensive ASO strategy for Apple App Store and Google Play Store. Research keyword opportunities for terms like 'baby tracker', 'feeding tracker', 'breastfeeding app', etc. Analyze competitor ASO strategies. Design the App Store listing: title, subtitle, keyword field, descriptions. Plan screenshot strategy showcasing key differentiators. Define review acquisition strategy timed after positive moments.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m3_gtm",
    assignedTo: "marketer",
    collaborators: ["business-analyst"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_014a",
        title:
          "Research keyword opportunities and search volumes for baby/feeding tracker terms",
        done: false,
      },
      {
        id: "sub_014b",
        title:
          "Analyze competitor ASO strategies (Huckleberry, Baby Tracker, Glow Baby keyword rankings)",
        done: false,
      },
      {
        id: "sub_014c",
        title:
          "Design App Store listing (title, subtitle, keywords, descriptions)",
        done: false,
      },
      {
        id: "sub_014d",
        title:
          "Plan screenshot strategy highlighting key differentiators",
        done: false,
      },
      {
        id: "sub_014e",
        title:
          "Define review acquisition strategy with optimal prompt timing",
        done: false,
      },
      {
        id: "sub_014f",
        title: `Write strategy to ${RESEARCH_DIR}\\14-aso-strategy.md`,
        done: false,
      },
    ],
    blockedBy: ["task_IFA_002", "task_IFA_009"],
    estimatedMinutes: 60,
    actualMinutes: null,
    acceptanceCriteria: [
      "Keyword research with search volume estimates and difficulty scores for 20+ terms",
      "Competitor keyword analysis for top 3 competitors",
      "Draft App Store listing copy (title, subtitle, description) optimized for target keywords",
      "Screenshot strategy with 5-6 screen concepts and messaging for each",
      "Review acquisition strategy with specific trigger points and prompt copy",
      `Markdown file saved to ${RESEARCH_DIR}\\14-aso-strategy.md`,
    ],
    comments: [],
    tags: [
      "marketing",
      "aso",
      "app-store",
      "seo",
      "phase-3",
      "infant-feeding-app",
    ],
    notes: `Save your complete research output to ${RESEARCH_DIR}\\14-aso-strategy.md. Include a summary of key findings in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },

  // ── Phase 4: Prototype & Build ─────────────────────────────────────────
  {
    id: "task_IFA_015",
    title:
      "Create UI/UX wireframes and design system for infant feeding app MVP",
    description:
      "Design the complete UI/UX for the MVP. The primary design constraint is sleep-deprived usability: every core action must be achievable in under 3 seconds with one hand. Design wireframes for all key screens: home dashboard with hungry meter, feeding entry (one-tap start timer), feeding history with graphs, symptom log, caregiver selector, and settings. Create the design system: component library, color system (dark mode as default for nighttime), typography scale, spacing, and iconography. Ensure WCAG AA accessibility.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m4_prototype",
    assignedTo: "developer",
    collaborators: ["marketer", "me"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_015a",
        title:
          "Design home dashboard wireframe with hungry meter, recent feeds, and quick-action buttons",
        done: false,
      },
      {
        id: "sub_015b",
        title:
          "Design feeding entry flow (one-tap timer start, type selection, amount, caregiver)",
        done: false,
      },
      {
        id: "sub_015c",
        title:
          "Design graph and history screens (daily, weekly, monthly views with beautiful charts)",
        done: false,
      },
      {
        id: "sub_015d",
        title:
          "Design symptom log and feeding-symptom correlation insight screens",
        done: false,
      },
      {
        id: "sub_015e",
        title:
          "Create design system (components, colors with dark mode default, typography, spacing, icons)",
        done: false,
      },
      {
        id: "sub_015f",
        title:
          "Document interaction patterns for one-handed, dark-room usage",
        done: false,
      },
    ],
    blockedBy: ["task_IFA_009", "task_IFA_010", "task_IFA_011"],
    estimatedMinutes: 120,
    actualMinutes: null,
    acceptanceCriteria: [
      "Wireframes for all MVP screens (dashboard, feeding entry, history/graphs, symptom log, settings)",
      "Design system with component library, color system (including dark mode), typography, and spacing",
      "One-handed interaction patterns documented with tap target sizes >= 44px",
      "Dark mode as default with automatic switching based on time of day",
      "Core feeding action achievable in under 3 seconds (timed interaction flow)",
      "WCAG AA compliance checklist addressed",
    ],
    comments: [],
    tags: [
      "design",
      "ui-ux",
      "wireframes",
      "design-system",
      "phase-4",
      "infant-feeding-app",
    ],
    notes: `Output wireframe descriptions and design system to ${RESEARCH_DIR}\\15-ui-ux-wireframes.md. Include a summary in your completion report for the inbox.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_016",
    title:
      "Build MVP core: feeding tracker with timer, logging, graphs, and hungry meter",
    description:
      "Implement the core MVP: feeding timer (one-tap start/stop), manual feeding entry (type, amount, side, formula brand), caregiver selection, feeding history with filtering, graph views (daily/weekly/monthly), symptom logging with feeding correlation, and the hungry meter prediction. Implement offline-first data persistence, dark mode UI, and basic onboarding flow. Set up the project with the chosen tech stack.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m4_prototype",
    assignedTo: "developer",
    collaborators: ["me"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_016a",
        title:
          "Set up project scaffold with chosen framework, navigation, and state management",
        done: false,
      },
      {
        id: "sub_016b",
        title:
          "Implement feeding timer (one-tap start/stop) and manual feeding entry form",
        done: false,
      },
      {
        id: "sub_016c",
        title:
          "Implement feeding history list with filtering and feeding detail view",
        done: false,
      },
      {
        id: "sub_016d",
        title:
          "Implement graph views (daily timeline, weekly summary, duration trends)",
        done: false,
      },
      {
        id: "sub_016e",
        title:
          "Implement symptom logging with feeding-symptom correlation display",
        done: false,
      },
      {
        id: "sub_016f",
        title:
          "Implement hungry meter prediction algorithm and dashboard widget",
        done: false,
      },
    ],
    blockedBy: ["task_IFA_011", "task_IFA_015"],
    estimatedMinutes: 480,
    actualMinutes: null,
    acceptanceCriteria: [
      "Feeding timer works with one-tap start/stop and persists if app is backgrounded",
      "Manual feeding entry captures type, amount, side, caregiver, and notes",
      "Graph views render feeding data in daily, weekly, and monthly formats",
      "Symptom log captures 6+ symptom types with severity and links to nearest feedings",
      "Hungry meter displays a visual indicator based on feeding frequency analysis",
      "App works fully offline with local data persistence",
      "Dark mode is the default theme with proper contrast ratios",
    ],
    comments: [],
    tags: [
      "development",
      "mvp",
      "core",
      "implementation",
      "phase-4",
      "infant-feeding-app",
    ],
    notes:
      "This is the largest single development task. Set up the project in a new directory and follow the technical architecture document. Report progress incrementally.",
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_017",
    title:
      "Build community forum prototype with topic categories and basic moderation",
    description:
      "Implement the community forum feature. Build or integrate the forum with topic categories (feeding questions, formula experiences, breastfeeding support, symptom discussions, product reviews, swaddling techniques, parenting tips, general parenting), user profiles, post creation, comment threads, upvoting, and basic moderation tools. Implement geo-based local groups and topic-based following. Ensure community guidelines are displayed during onboarding.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m4_prototype",
    assignedTo: "developer",
    collaborators: ["marketer"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_017a",
        title:
          "Set up forum backend or integrate third-party solution (Discourse, Stream, or custom)",
        done: false,
      },
      {
        id: "sub_017b",
        title:
          "Implement topic categories, post creation, and comment threads",
        done: false,
      },
      {
        id: "sub_017c",
        title:
          "Implement user profiles, upvoting, and helpful marking",
        done: false,
      },
      {
        id: "sub_017d",
        title:
          "Implement basic moderation tools (report, flag, keyword auto-filter)",
        done: false,
      },
      {
        id: "sub_017e",
        title:
          "Implement geo-based local groups and topic-based following",
        done: false,
      },
      {
        id: "sub_017f",
        title:
          "Add community guidelines acceptance flow during onboarding",
        done: false,
      },
    ],
    blockedBy: ["task_IFA_016"],
    estimatedMinutes: 240,
    actualMinutes: null,
    acceptanceCriteria: [
      "Users can create posts in 6+ topic categories with text and optional photos",
      "Comment threads support nested replies with upvoting/helpful marking",
      "Moderation tools allow reporting, flagging, and auto-filtering of flagged keywords",
      "Local groups show nearby parents with opt-in location sharing",
      "Community guidelines displayed and accepted before first post",
      "Forum integrates seamlessly within the app navigation",
    ],
    comments: [],
    tags: [
      "development",
      "community",
      "forum",
      "social",
      "phase-4",
      "infant-feeding-app",
    ],
    notes:
      "The forum should follow the community guidelines developed in task_IFA_013. If using a third-party solution, document the integration approach and any costs.",
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
  {
    id: "task_IFA_018",
    title:
      "Conduct QA testing, performance profiling, and user acceptance testing for infant feeding app MVP",
    description:
      "Perform comprehensive QA testing on the MVP build. Test all core flows: feeding timer accuracy, data persistence, graph rendering, hungry meter predictions, symptom-feeding correlation logic, dark mode contrast, one-handed usability, and community forum moderation. Profile performance on low-end devices. Test edge cases: midnight boundary, timezone changes, DST, rapid successive feedings, and large data sets. Produce a bug report and readiness assessment.",
    importance: "important" as const,
    urgency: "not-urgent" as const,
    kanban: "not-started" as const,
    projectId: "proj_InfantFeedingApp",
    milestoneId: "goal_IFA_m4_prototype",
    assignedTo: "tester",
    collaborators: ["developer", "me"],
    dailyActions: [],
    subtasks: [
      {
        id: "sub_018a",
        title:
          "Test all core feeding flows (timer start/stop, manual entry, history, editing, deletion)",
        done: false,
      },
      {
        id: "sub_018b",
        title: "Test offline data persistence and sync behavior",
        done: false,
      },
      {
        id: "sub_018c",
        title:
          "Test graph rendering accuracy and hungry meter prediction reasonableness",
        done: false,
      },
      {
        id: "sub_018d",
        title:
          "Test edge cases (midnight boundary, timezone change, DST, rapid feedings, large datasets)",
        done: false,
      },
      {
        id: "sub_018e",
        title:
          "Profile performance on low-end devices (response times, memory usage, battery drain)",
        done: false,
      },
      {
        id: "sub_018f",
        title:
          "Test accessibility (dark mode contrast, tap targets, screen reader compatibility)",
        done: false,
      },
    ],
    blockedBy: ["task_IFA_016", "task_IFA_017"],
    estimatedMinutes: 120,
    actualMinutes: null,
    acceptanceCriteria: [
      "All core feeding flows tested with pass/fail results documented",
      "Offline persistence verified — data survives app kill, device restart, and airplane mode",
      "Performance profiled — feeding entry responds in < 200ms on target devices",
      "Edge cases tested (midnight, timezone, DST, rapid feeds, 6-month dataset) with results",
      "Accessibility audit complete — dark mode contrast, tap targets, and screen reader tested",
      "Bug report produced with severity ratings and fix recommendations",
    ],
    comments: [],
    tags: [
      "testing",
      "qa",
      "performance",
      "accessibility",
      "phase-4",
      "infant-feeding-app",
    ],
    notes: `Produce a comprehensive test report to ${RESEARCH_DIR}\\18-qa-test-report.md. Flag any critical or major bugs that must be fixed before launch.`,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
];

// ─── Execute ───────────────────────────────────────────────────────────────

function loadJson(filename: string) {
  const filepath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

function saveJson(filename: string, data: unknown) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`  ✓ ${filename} saved`);
}

console.log("Seeding Infant Feeding App project...\n");

// 1. Add project
const projectsData = loadJson("projects.json");
if (projectsData.projects.some((p: any) => p.id === project.id)) {
  console.log("  ⚠ Project already exists, skipping");
} else {
  projectsData.projects.push(project);
  saveJson("projects.json", projectsData);
}

// 2. Add goals
const goalsData = loadJson("goals.json");
let goalsAdded = 0;
for (const goal of goals) {
  if (!goalsData.goals.some((g: any) => g.id === goal.id)) {
    goalsData.goals.push(goal);
    goalsAdded++;
  }
}
saveJson("goals.json", goalsData);
console.log(`  → ${goalsAdded} goals added`);

// 3. Add tasks
const tasksData = loadJson("tasks.json");
let tasksAdded = 0;
for (const task of tasks) {
  if (!tasksData.tasks.some((t: any) => t.id === task.id)) {
    tasksData.tasks.push(task);
    tasksAdded++;
  }
}
saveJson("tasks.json", tasksData);
console.log(`  → ${tasksAdded} tasks added`);

// 4. Update brain dump
const brainDumpData = loadJson("brain-dump.json");
const entry = brainDumpData.entries.find(
  (e: any) => e.id === "bd_dNSQo28mjIhm"
);
if (entry) {
  entry.processed = true;
  entry.convertedTo = "proj_InfantFeedingApp";
  entry.tags = ["infant", "feeding", "parenting", "app"];
  saveJson("brain-dump.json", brainDumpData);
} else {
  console.log("  ⚠ Brain dump entry bd_dNSQo28mjIhm not found");
}

console.log("\nDone! Infant Feeding App project seeded with:");
console.log(`  • 1 project`);
console.log(`  • ${goalsAdded} goals (1 long-term + 4 milestones)`);
console.log(`  • ${tasksAdded} tasks across 4 phases`);
console.log(`  • Brain dump entry marked as processed`);
