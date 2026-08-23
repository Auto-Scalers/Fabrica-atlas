/**
 * Seed script: Voxel Traffic Escape project + Tester agent
 * Adds project, agent, goals, milestones, and tasks to Mission Control data files.
 * Run with: node scripts/seed-vte-project.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "data");
const read = (f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf-8"));
const write = (f, d) =>
  writeFileSync(join(DATA_DIR, f), JSON.stringify(d, null, 2) + "\n");

const now = new Date().toISOString();

// ─── 1. PROJECT ────────────────────────────────────────────
const project = {
  id: "proj_VoxelTrafficEscape",
  name: "Voxel Traffic Escape",
  description:
    "A voxel-based 3D game inspired by Terraria and Minecraft. The player starts stuck in Atlanta traffic on a gridlocked highway. The world is fully destructible — dig, mine, and build your way through underground tunnels, city streets, and buildings to reach your apartment. Along the way, find weapons, loot, health pickups, and craftable items to fend off enemies (road-ragers, sewer creatures, construction bots, etc.). Retro-voxel aesthetic, side-scrolling or first-person TBD.",
  status: "active",
  color: "#EF4444",
  teamMembers: ["developer", "tester", "me"],
  createdAt: now,
  tags: [
    "game",
    "voxel",
    "terraria",
    "minecraft",
    "atlanta",
    "indie",
    "3d",
    "destructible-world",
  ],
  deletedAt: null,
};

// ─── 2. TESTER AGENT ──────────────────────────────────────
const testerAgent = {
  id: "tester",
  name: "Tester",
  icon: "Bug",
  description:
    "QA testing, bug reporting, playtesting, performance analysis, and code improvement suggestions",
  instructions: `You are acting as a QA Tester and Playtest Analyst. Your role is to simulate, run, and test code for bugs, report them clearly, and suggest improvements.

Before starting:
1. Read mission-control/data/ai-context.md for current project context
2. Read the project's CLAUDE.md for testing conventions
3. Review existing bug reports and test results

Your testing methodology:
- **Functional Testing**: Run the code, exercise all features, verify expected behavior
- **Edge Case Testing**: Try boundary conditions, invalid inputs, unexpected sequences
- **Performance Testing**: Profile frame rates, memory usage, load times
- **Regression Testing**: After fixes, re-test related functionality
- **Playtest Analysis**: Evaluate game feel, difficulty balance, fun factor

When reporting bugs:
- Severity: critical / major / minor / cosmetic
- Steps to reproduce (numbered, specific)
- Expected vs actual behavior
- Environment details (browser, OS, screen size)
- Screenshots or console output when available

When suggesting improvements:
- Distinguish between bugs (broken) and enhancements (could be better)
- Prioritize by player impact
- Include code snippets for suggested fixes when possible
- Consider performance implications of suggestions`,
  capabilities: [
    "functional-testing",
    "bug-reporting",
    "performance-profiling",
    "playtest-analysis",
    "regression-testing",
    "code-review",
    "improvement-suggestions",
  ],
  skillIds: [],
  status: "active",
  createdAt: now,
  updatedAt: now,
};

// ─── 3. GOALS & MILESTONES ────────────────────────────────
const goalLongTerm = {
  id: "goal_VTE_ship_v1",
  title: "Ship Voxel Traffic Escape v1.0 — playable build with full game loop",
  type: "long-term",
  timeframe: "Q3 2026",
  parentGoalId: null,
  projectId: "proj_VoxelTrafficEscape",
  status: "not-started",
  milestones: [
    "goal_VTE_design",
    "goal_VTE_engine",
    "goal_VTE_mechanics",
    "goal_VTE_content",
    "goal_VTE_polish",
  ],
  tasks: [],
  createdAt: now,
};

const milestones = [
  {
    id: "goal_VTE_design",
    title: "Game Design Document (GDD) finalized with all core decisions made",
    type: "medium-term",
    timeframe: "2026-03-15",
    parentGoalId: "goal_VTE_ship_v1",
    projectId: "proj_VoxelTrafficEscape",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_VTE_001",
      "task_VTE_002",
      "task_VTE_003",
      "task_VTE_004",
      "task_VTE_005",
      "task_VTE_006",
    ],
    createdAt: now,
  },
  {
    id: "goal_VTE_engine",
    title: "Core voxel engine — rendering, destruction, world generation working",
    type: "medium-term",
    timeframe: "2026-04-15",
    parentGoalId: "goal_VTE_ship_v1",
    projectId: "proj_VoxelTrafficEscape",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_VTE_007",
      "task_VTE_008",
      "task_VTE_009",
      "task_VTE_010",
      "task_VTE_011",
    ],
    createdAt: now,
  },
  {
    id: "goal_VTE_mechanics",
    title:
      "Player mechanics — movement, combat, inventory, health all functional",
    type: "medium-term",
    timeframe: "2026-05-15",
    parentGoalId: "goal_VTE_ship_v1",
    projectId: "proj_VoxelTrafficEscape",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_VTE_012",
      "task_VTE_013",
      "task_VTE_014",
      "task_VTE_015",
      "task_VTE_016",
      "task_VTE_017",
    ],
    createdAt: now,
  },
  {
    id: "goal_VTE_content",
    title:
      "Content complete — all zones, enemies, loot, and win condition playable",
    type: "medium-term",
    timeframe: "2026-06-15",
    parentGoalId: "goal_VTE_ship_v1",
    projectId: "proj_VoxelTrafficEscape",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_VTE_018",
      "task_VTE_019",
      "task_VTE_020",
      "task_VTE_021",
      "task_VTE_022",
      "task_VTE_023",
    ],
    createdAt: now,
  },
  {
    id: "goal_VTE_polish",
    title: "Testing, optimization, and polish — release-ready build",
    type: "medium-term",
    timeframe: "2026-07-15",
    parentGoalId: "goal_VTE_ship_v1",
    projectId: "proj_VoxelTrafficEscape",
    status: "not-started",
    milestones: [],
    tasks: [
      "task_VTE_024",
      "task_VTE_025",
      "task_VTE_026",
      "task_VTE_027",
      "task_VTE_028",
    ],
    createdAt: now,
  },
];

// ─── 4. TASKS ──────────────────────────────────────────────
const taskBase = (overrides) => ({
  dailyActions: [],
  collaborators: [],
  blockedBy: [],
  estimatedMinutes: null,
  actualMinutes: null,
  acceptanceCriteria: [],
  tags: ["voxel-traffic-escape"],
  notes: "",
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  ...overrides,
});

const tasks = [
  // ── Phase 1: Design ──────────────────────────────────────
  taskBase({
    id: "task_VTE_001",
    title: "Write Game Design Document (GDD) — core vision, scope, and pillars",
    description:
      "Create the foundational GDD covering: game concept, target audience, platform targets, core gameplay pillars, and scope boundaries. This document should be the north star for all development decisions.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_design",
    assignedTo: "me",
    subtasks: [
      { id: "sub_001a", title: "Define core gameplay pillars (3-5 pillars)", done: false },
      { id: "sub_001b", title: "Define scope: MVP vs stretch goals", done: false },
      { id: "sub_001c", title: "Define target platforms (web/desktop/both?)", done: false },
      { id: "sub_001d", title: "Write 1-paragraph elevator pitch", done: false },
      { id: "sub_001e", title: "Define target audience and age rating", done: false },
    ],
    acceptanceCriteria: [
      "GDD covers vision, scope, platforms, and audience",
      "Elevator pitch is compelling and concise",
      "MVP scope is clearly bounded",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Perspective: First-person (Minecraft-style) or 2.5D side-scroller (Terraria-style)? This is the single biggest architectural decision.\n• Platform: Browser-based (Three.js/Babylon.js) or native (Unity/Godot)? Browser = easier distribution, native = better performance.\n• Multiplayer: Solo-only for v1, or plan architecture for co-op later?\n• Tone: Comedic/satirical (Atlanta traffic humor) or serious survival?",
  }),

  taskBase({
    id: "task_VTE_002",
    title: "Design art style and voxel aesthetic guide",
    description:
      "Define the visual identity: voxel size/resolution, color palette, lighting style, and overall aesthetic. Create reference mood board. Decide between low-poly chunky voxels (Minecraft) vs. smooth marching-cubes voxels vs. high-res micro-voxels.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_design",
    assignedTo: "developer",
    blockedBy: ["task_VTE_001"],
    subtasks: [
      { id: "sub_002a", title: "Research voxel art styles (collect 10+ references)", done: false },
      { id: "sub_002b", title: "Define voxel resolution (block size in world units)", done: false },
      { id: "sub_002c", title: "Create color palette for each zone (highway, underground, streets, apartment)", done: false },
      { id: "sub_002d", title: "Define lighting model (baked vs dynamic vs hybrid)", done: false },
    ],
    acceptanceCriteria: [
      "Mood board with 10+ reference images created",
      "Voxel resolution defined with rationale",
      "Color palette defined per zone",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Voxel resolution: 1m cubes (Minecraft chunky) or smaller (0.25m for more detail)? Smaller = more detail but exponentially more data.\n• Lighting: Full dynamic lighting (expensive but immersive) or simpler baked lighting (faster, retro feel)?\n• Should Atlanta landmarks be recognizable? (Silhouette of downtown, MARTA signs, Waffle House, etc.)",
  }),

  taskBase({
    id: "task_VTE_003",
    title: "Design world map layout — zones and progression path",
    description:
      "Design the world from start (Atlanta highway gridlock) to end (player's apartment). Define distinct zones, their themes, difficulty curves, and how they connect. The world should feel like a vertical/horizontal journey through Atlanta's layers.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_design",
    assignedTo: "me",
    blockedBy: ["task_VTE_001"],
    subtasks: [
      { id: "sub_003a", title: "Define zone list (highway, tunnels, sewers, streets, buildings, apartment)", done: false },
      { id: "sub_003b", title: "Map zone connections (which zones lead to which)", done: false },
      { id: "sub_003c", title: "Define difficulty curve per zone", done: false },
      { id: "sub_003d", title: "Decide linear path vs open-world exploration", done: false },
      { id: "sub_003e", title: "Sketch rough zone layout on paper/diagram", done: false },
    ],
    acceptanceCriteria: [
      "All zones defined with themes and enemies",
      "Difficulty curve mapped from start to finish",
      "Zone connection map drawn",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Linear or open? Terraria is open-world with soft gating. Minecraft is fully open. Do we want a more guided experience (linear zones) or let the player explore freely?\n• Vertical or horizontal? Terraria is horizontal with deep vertical caves. Should Atlanta be a horizontal journey with underground shortcuts?\n• How big is the world? Small (5-10 min playthrough), medium (30-60 min), or large (2+ hours)?\n• Should the world be procedurally generated each run (roguelike replayability) or hand-crafted (curated experience)?",
  }),

  taskBase({
    id: "task_VTE_004",
    title: "Design enemy types, AI behaviors, and progression",
    description:
      "Define all enemy types, their behaviors, stats, and which zones they appear in. Enemies should fit the Atlanta/urban theme. Design difficulty progression from early pushovers to late-game threats.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_design",
    assignedTo: "me",
    subtasks: [
      { id: "sub_004a", title: "Design 3-4 highway zone enemies (road ragers, aggressive drivers, etc.)", done: false },
      { id: "sub_004b", title: "Design 3-4 underground enemies (sewer creatures, mole-bots, etc.)", done: false },
      { id: "sub_004c", title: "Design 3-4 street-level enemies (construction bots, stray dogs, etc.)", done: false },
      { id: "sub_004d", title: "Design 1-2 boss enemies (optional or zone-gate bosses)", done: false },
      { id: "sub_004e", title: "Define enemy stat tables (HP, damage, speed, aggro range)", done: false },
      { id: "sub_004f", title: "Define AI behavior patterns (patrol, chase, ranged, swarm)", done: false },
    ],
    acceptanceCriteria: [
      "8+ enemy types defined with stats and behaviors",
      "Each zone has unique enemy set",
      "Difficulty scaling documented",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Should enemies respawn? If so, on timer or when player leaves zone?\n• Do enemies drop loot? All enemies or only specific ones?\n• Should there be bosses guarding zone transitions? Or are bosses optional side content?\n• How comedic should enemies be? Road-raging NPCs throwing coffee cups vs. genuinely threatening mutants?",
  }),

  taskBase({
    id: "task_VTE_005",
    title: "Design loot, weapons, and health system",
    description:
      "Define all items the player can find: weapons (melee, ranged), health pickups, armor, utility items, and crafting materials. Design the inventory system and item progression curve.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_design",
    assignedTo: "me",
    subtasks: [
      { id: "sub_005a", title: "Define weapon types and tiers (tire iron → sledgehammer → jackhammer, etc.)", done: false },
      { id: "sub_005b", title: "Define ranged weapons (throwables? nail gun? etc.)", done: false },
      { id: "sub_005c", title: "Define health system (HP pool, healing items, regeneration?)", done: false },
      { id: "sub_005d", title: "Define armor/defense items", done: false },
      { id: "sub_005e", title: "Define utility items (flashlight, grapple hook, etc.)", done: false },
      { id: "sub_005f", title: "Define inventory capacity and management UI", done: false },
    ],
    acceptanceCriteria: [
      "Full item list with stats documented",
      "Clear tier progression (early/mid/late game items)",
      "Inventory system designed",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Crafting: Full crafting system (Terraria-style workbench recipes) or simpler find-and-use?\n• Inventory: Grid-based (Terraria/Minecraft) or slot-based (Zelda)?\n• Durability: Do weapons break? Or unlimited use once found?\n• Thematic items: Should items fit the Atlanta/urban theme? (traffic cone shield, rebar sword, MARTA pass = fast travel?)",
  }),

  taskBase({
    id: "task_VTE_006",
    title: "Design crafting and building mechanics",
    description:
      "Define how building and crafting work. Since the world is fully destructible, the player should be able to dig, mine, and place blocks. Define what can be crafted, workbench requirements, and how building integrates with combat/exploration.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_design",
    assignedTo: "me",
    blockedBy: ["task_VTE_005"],
    subtasks: [
      { id: "sub_006a", title: "Define block types (dirt, concrete, asphalt, steel, glass, etc.)", done: false },
      { id: "sub_006b", title: "Define which blocks are mineable and their hardness tiers", done: false },
      { id: "sub_006c", title: "Define crafting recipes (if crafting is included)", done: false },
      { id: "sub_006d", title: "Define building rules (can player build anywhere? structural integrity?)", done: false },
    ],
    acceptanceCriteria: [
      "Block type list with properties documented",
      "Crafting system designed (or explicitly scoped out)",
      "Building rules defined",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Structural integrity: Should buildings collapse realistically (7 Days to Die style) or stay floating (Minecraft style)?\n• Crafting scope: Full crafting tree or minimal? This is a huge scope driver.\n• Block variety: How many unique block types? More = richer world but more art/code.\n• Building purpose: Is building mainly for defense/bridges, or full creative building?",
  }),

  // ── Phase 2: Core Engine ─────────────────────────────────
  taskBase({
    id: "task_VTE_007",
    title: "Set up game project scaffold and choose engine/framework",
    description:
      "Initialize the game project with the chosen technology stack. Set up build tooling, folder structure, asset pipeline, and basic dev workflow. This decision gates all subsequent engine work.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_engine",
    assignedTo: "developer",
    blockedBy: ["task_VTE_001"],
    subtasks: [
      { id: "sub_007a", title: "Evaluate engine options (Three.js, Babylon.js, PlayCanvas, Unity, Godot)", done: false },
      { id: "sub_007b", title: "Create project repository and folder structure", done: false },
      { id: "sub_007c", title: "Set up build pipeline (bundler, dev server, hot reload)", done: false },
      { id: "sub_007d", title: "Create CLAUDE.md with project conventions", done: false },
      { id: "sub_007e", title: "Get a basic colored cube rendering on screen", done: false },
    ],
    acceptanceCriteria: [
      "Engine chosen with documented rationale",
      "Project builds and runs with hot reload",
      "Basic 3D scene rendering confirmed",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Three.js: Most flexible, huge ecosystem, browser-native. But voxel perf requires custom optimization.\n• Babylon.js: Better built-in physics and tooling, also browser-native.\n• Unity/Godot: More mature for games, but heavier tooling and not browser-native without export.\n• Recommendation: Three.js + TypeScript for web-first approach, matching the existing tech stack knowledge. But needs confirmation.",
    estimatedMinutes: 120,
  }),

  taskBase({
    id: "task_VTE_008",
    title: "Implement voxel chunk system with efficient rendering",
    description:
      "Build the core voxel engine: chunk-based world storage, greedy meshing for efficient rendering, and chunk loading/unloading based on player position. This is the technical foundation of the entire game.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_engine",
    assignedTo: "developer",
    blockedBy: ["task_VTE_007"],
    subtasks: [
      { id: "sub_008a", title: "Implement chunk data structure (16x16x16 or 32x32x32 blocks)", done: false },
      { id: "sub_008b", title: "Implement greedy meshing algorithm for chunk faces", done: false },
      { id: "sub_008c", title: "Implement chunk loading/unloading based on view distance", done: false },
      { id: "sub_008d", title: "Implement block type registry (ID → texture, properties)", done: false },
      { id: "sub_008e", title: "Benchmark: achieve 60fps with 8x8 chunk grid visible", done: false },
    ],
    acceptanceCriteria: [
      "Chunks render correctly with proper face culling",
      "60fps with reasonable view distance",
      "Multiple block types display with different colors/textures",
    ],
    estimatedMinutes: 480,
  }),

  taskBase({
    id: "task_VTE_009",
    title: "Implement destructible terrain — dig, break, and place blocks",
    description:
      "Enable the player to destroy blocks (dig/mine) and place blocks (build). This is the core Minecraft/Terraria mechanic. Includes raycasting for block selection, block breaking animation, and chunk mesh updates.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_engine",
    assignedTo: "developer",
    blockedBy: ["task_VTE_008"],
    subtasks: [
      { id: "sub_009a", title: "Implement ray casting from camera to identify target block", done: false },
      { id: "sub_009b", title: "Implement block breaking (remove block, update chunk mesh)", done: false },
      { id: "sub_009c", title: "Implement block placing (add block to adjacent face)", done: false },
      { id: "sub_009d", title: "Add block-breaking progress indicator (crack overlay)", done: false },
      { id: "sub_009e", title: "Handle chunk boundary block operations", done: false },
    ],
    acceptanceCriteria: [
      "Player can break any block by clicking",
      "Player can place blocks on any surface",
      "Chunk mesh updates instantly (no visible lag)",
    ],
    estimatedMinutes: 240,
  }),

  taskBase({
    id: "task_VTE_010",
    title: "Implement 3D camera and player controller",
    description:
      "Build the player controller: first-person or third-person camera, WASD movement, jumping, gravity, and collision detection with voxel terrain.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_engine",
    assignedTo: "developer",
    blockedBy: ["task_VTE_008"],
    subtasks: [
      { id: "sub_010a", title: "Implement camera controller (mouse look, FPS or TPS)", done: false },
      { id: "sub_010b", title: "Implement WASD movement with acceleration/deceleration", done: false },
      { id: "sub_010c", title: "Implement gravity and jumping", done: false },
      { id: "sub_010d", title: "Implement AABB collision detection against voxel terrain", done: false },
      { id: "sub_010e", title: "Implement sprint mechanic (shift key)", done: false },
    ],
    acceptanceCriteria: [
      "Smooth first-person movement with mouse look",
      "Player cannot walk through solid blocks",
      "Jumping and gravity feel responsive",
    ],
    estimatedMinutes: 240,
  }),

  taskBase({
    id: "task_VTE_011",
    title: "Implement world generation — Atlanta-themed terrain",
    description:
      "Build the world generator that creates the Atlanta-themed environment: highway with stuck cars, underground layers, street-level buildings, and the apartment goal. Can be procedural, hand-crafted, or hybrid.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_engine",
    assignedTo: "developer",
    blockedBy: ["task_VTE_003", "task_VTE_008"],
    subtasks: [
      { id: "sub_011a", title: "Implement terrain height map generation (flat highway, hilly streets)", done: false },
      { id: "sub_011b", title: "Generate highway zone (road surface, car obstacles, guardrails)", done: false },
      { id: "sub_011c", title: "Generate underground zone (tunnels, caves, sewer pipes)", done: false },
      { id: "sub_011d", title: "Generate street zone (buildings, sidewalks, intersections)", done: false },
      { id: "sub_011e", title: "Place the apartment building as the goal destination", done: false },
    ],
    acceptanceCriteria: [
      "World generates with all planned zones",
      "Zones are visually distinct",
      "Player can navigate from highway to apartment",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Procedural vs hand-crafted: Procedural gives replayability but less control. Hand-crafted allows tighter level design. Hybrid (hand-crafted landmarks + procedural fill) is a middle ground.\n• Seed-based generation: If procedural, should players be able to share world seeds?",
    estimatedMinutes: 480,
  }),

  // ── Phase 3: Player Mechanics ────────────────────────────
  taskBase({
    id: "task_VTE_012",
    title: "Implement mining and digging mechanics with tool tiers",
    description:
      "Expand block breaking to support different tool types and tiers. Different blocks should require appropriate tools and break at different speeds. Tools should have durability (if designed that way).",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_mechanics",
    assignedTo: "developer",
    blockedBy: ["task_VTE_005", "task_VTE_009"],
    subtasks: [
      { id: "sub_012a", title: "Implement tool-based mining speed modifiers", done: false },
      { id: "sub_012b", title: "Implement block hardness tiers (dirt < concrete < steel)", done: false },
      { id: "sub_012c", title: "Implement tool durability (if designed)", done: false },
      { id: "sub_012d", title: "Add mining particles and sound effects", done: false },
    ],
    acceptanceCriteria: [
      "Different tools break blocks at different speeds",
      "Block hardness prevents early access to late-game areas",
      "Mining feels satisfying with feedback",
    ],
    estimatedMinutes: 180,
  }),

  taskBase({
    id: "task_VTE_013",
    title: "Implement building and block placement mechanics",
    description:
      "Full building system: place blocks from inventory, snapping, preview ghost block, and structural rules (if designed). Support multiple block types with different properties.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_mechanics",
    assignedTo: "developer",
    blockedBy: ["task_VTE_006", "task_VTE_009"],
    subtasks: [
      { id: "sub_013a", title: "Implement ghost block preview before placement", done: false },
      { id: "sub_013b", title: "Implement block selection from inventory hotbar", done: false },
      { id: "sub_013c", title: "Implement block placement rules (no placing inside player, etc.)", done: false },
      { id: "sub_013d", title: "Implement structural integrity (if designed)", done: false },
    ],
    acceptanceCriteria: [
      "Player can place any held block type",
      "Ghost preview shows where block will go",
      "Building feels responsive and intuitive",
    ],
    estimatedMinutes: 180,
  }),

  taskBase({
    id: "task_VTE_014",
    title: "Implement inventory system and item management",
    description:
      "Build the inventory UI and item management: hotbar, full inventory grid, item stacking, drag-and-drop, and item pickup from world.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_mechanics",
    assignedTo: "developer",
    blockedBy: ["task_VTE_005"],
    subtasks: [
      { id: "sub_014a", title: "Implement inventory data model (slots, stacking, max stack sizes)", done: false },
      { id: "sub_014b", title: "Implement hotbar UI (bottom of screen, 1-9 keys to select)", done: false },
      { id: "sub_014c", title: "Implement full inventory screen (E key to open/close)", done: false },
      { id: "sub_014d", title: "Implement item pickup from world (walk over or interact)", done: false },
      { id: "sub_014e", title: "Implement item dropping", done: false },
    ],
    acceptanceCriteria: [
      "Hotbar displays and switches between items",
      "Full inventory opens/closes with keyboard",
      "Items can be picked up and dropped",
    ],
    estimatedMinutes: 300,
  }),

  taskBase({
    id: "task_VTE_015",
    title: "Implement weapon and combat system",
    description:
      "Build the combat system: melee attacks, ranged attacks (if designed), hit detection, damage calculation, knockback, and weapon switching. Combat should feel impactful and responsive.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_mechanics",
    assignedTo: "developer",
    blockedBy: ["task_VTE_005", "task_VTE_014"],
    subtasks: [
      { id: "sub_015a", title: "Implement melee attack (swing animation, hit box, cooldown)", done: false },
      { id: "sub_015b", title: "Implement damage calculation (weapon damage vs enemy HP)", done: false },
      { id: "sub_015c", title: "Implement knockback on hit", done: false },
      { id: "sub_015d", title: "Implement ranged weapons (projectile physics, if designed)", done: false },
      { id: "sub_015e", title: "Implement weapon switching via hotbar", done: false },
      { id: "sub_015f", title: "Add hit feedback (screen shake, flash, sound)", done: false },
    ],
    acceptanceCriteria: [
      "Melee combat hits enemies and deals damage",
      "Combat feels responsive with clear feedback",
      "Different weapons have different damage/speed",
    ],
    estimatedMinutes: 360,
  }),

  taskBase({
    id: "task_VTE_016",
    title: "Implement health system, damage, and death",
    description:
      "Build the player health system: HP bar, taking damage from enemies and environment, health pickups, death and respawn mechanics.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_mechanics",
    assignedTo: "developer",
    blockedBy: ["task_VTE_005"],
    subtasks: [
      { id: "sub_016a", title: "Implement HP pool and HUD health bar", done: false },
      { id: "sub_016b", title: "Implement taking damage (screen red flash, knockback)", done: false },
      { id: "sub_016c", title: "Implement health pickups (instant heal, heal-over-time)", done: false },
      { id: "sub_016d", title: "Implement death state and respawn", done: false },
      { id: "sub_016e", title: "Implement fall damage", done: false },
    ],
    acceptanceCriteria: [
      "Health bar displays and updates correctly",
      "Player takes damage from enemies and environment",
      "Death triggers respawn at last checkpoint or start",
    ],
    notes:
      "DESIGN QUESTIONS:\n• Respawn: Respawn at start of current zone? At last checkpoint? Drop items on death (Terraria-style)?\n• Health regen: Passive regeneration, food-based healing, or pickup-only?\n• Lives: Unlimited respawns or limited lives (roguelike)?",
    estimatedMinutes: 180,
  }),

  taskBase({
    id: "task_VTE_017",
    title: "Implement crafting system (if designed)",
    description:
      "Build the crafting system based on GDD decisions: crafting UI, recipe system, workbench requirements, and material consumption. Skip this task if crafting is scoped out of MVP.",
    importance: "not-important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_mechanics",
    assignedTo: "developer",
    blockedBy: ["task_VTE_006", "task_VTE_014"],
    subtasks: [
      { id: "sub_017a", title: "Implement recipe data structure and registry", done: false },
      { id: "sub_017b", title: "Implement crafting UI (grid or list)", done: false },
      { id: "sub_017c", title: "Implement material consumption and item creation", done: false },
      { id: "sub_017d", title: "Implement workbench/station requirement (if designed)", done: false },
    ],
    acceptanceCriteria: [
      "Player can craft items from materials",
      "Recipes are discoverable in UI",
      "Crafting consumes correct materials",
    ],
    notes:
      "This task may be deferred to post-MVP depending on GDD scope decisions. Crafting is a major scope expansion.",
    estimatedMinutes: 360,
  }),

  // ── Phase 4: Content ─────────────────────────────────────
  taskBase({
    id: "task_VTE_018",
    title: "Create Atlanta highway starting zone — cars, gridlock, and chaos",
    description:
      "Build the opening zone: a gridlocked Atlanta highway (inspired by I-285 or I-75/85 connector). Stuck cars as obstacles, highway barriers, overpasses, and initial enemies. This is the player's first impression.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_content",
    assignedTo: "developer",
    blockedBy: ["task_VTE_011", "task_VTE_010"],
    subtasks: [
      { id: "sub_018a", title: "Build highway terrain (multi-lane road, median, shoulders)", done: false },
      { id: "sub_018b", title: "Create voxel car models (variety of stuck vehicles)", done: false },
      { id: "sub_018c", title: "Place entry points to underground (cracked road, sewer grate)", done: false },
      { id: "sub_018d", title: "Add environmental storytelling (road signs, billboards, debris)", done: false },
      { id: "sub_018e", title: "Spawn initial enemies (road ragers, thrown objects)", done: false },
    ],
    acceptanceCriteria: [
      "Highway zone is visually recognizable as Atlanta traffic",
      "Player can find path off highway (dig down or navigate)",
      "Initial enemies provide low-difficulty combat",
    ],
    estimatedMinutes: 360,
  }),

  taskBase({
    id: "task_VTE_019",
    title: "Create underground/sewer zone with tunnels and caves",
    description:
      "Build the underground zone: sewer tunnels, natural caves, subway/MARTA tunnels, and utility corridors. This is the mid-game exploration area with better loot but tougher enemies.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_content",
    assignedTo: "developer",
    blockedBy: ["task_VTE_011"],
    subtasks: [
      { id: "sub_019a", title: "Generate sewer tunnel network", done: false },
      { id: "sub_019b", title: "Add MARTA subway section (tracks, platform, trains)", done: false },
      { id: "sub_019c", title: "Place loot caches in hidden areas", done: false },
      { id: "sub_019d", title: "Spawn underground enemies (sewer creatures, rats, bots)", done: false },
      { id: "sub_019e", title: "Add exit points to street level", done: false },
    ],
    acceptanceCriteria: [
      "Underground is explorable with multiple paths",
      "Better loot found underground than highway",
      "Enemies are tougher than highway zone",
    ],
    estimatedMinutes: 360,
  }),

  taskBase({
    id: "task_VTE_020",
    title: "Create street-level zone with buildings and urban terrain",
    description:
      "Build the street-level city zone: Atlanta streets, destructible buildings, shops with loot, and the final approach to the apartment. Include recognizable urban elements.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_content",
    assignedTo: "developer",
    blockedBy: ["task_VTE_011"],
    subtasks: [
      { id: "sub_020a", title: "Generate city blocks with streets and sidewalks", done: false },
      { id: "sub_020b", title: "Create destructible buildings (enter, loot, demolish)", done: false },
      { id: "sub_020c", title: "Add shop/vendor areas (if designed)", done: false },
      { id: "sub_020d", title: "Spawn street-level enemies (hardest regular enemies)", done: false },
      { id: "sub_020e", title: "Place path to apartment building", done: false },
    ],
    acceptanceCriteria: [
      "Streets feel like an urban Atlanta neighborhood",
      "Buildings are enterable and destructible",
      "Apartment building is visible and reachable",
    ],
    estimatedMinutes: 360,
  }),

  taskBase({
    id: "task_VTE_021",
    title: "Implement enemy AI — pathfinding, aggro, and attack patterns",
    description:
      "Build the enemy AI system: pathfinding through voxel terrain, aggro/detection ranges, different attack patterns per enemy type, and spawning/despawning logic.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_content",
    assignedTo: "developer",
    blockedBy: ["task_VTE_004", "task_VTE_010"],
    subtasks: [
      { id: "sub_021a", title: "Implement A* or navmesh pathfinding for voxel world", done: false },
      { id: "sub_021b", title: "Implement aggro system (detection range, line of sight)", done: false },
      { id: "sub_021c", title: "Implement melee enemy AI (chase, attack, retreat)", done: false },
      { id: "sub_021d", title: "Implement ranged enemy AI (position, aim, fire)", done: false },
      { id: "sub_021e", title: "Implement spawner system (per zone, respawn rules)", done: false },
    ],
    acceptanceCriteria: [
      "Enemies navigate terrain without getting stuck",
      "Aggro system works with detection range",
      "Different enemy types exhibit distinct behaviors",
    ],
    estimatedMinutes: 480,
  }),

  taskBase({
    id: "task_VTE_022",
    title: "Implement loot drops, pickup system, and item spawns",
    description:
      "Build the loot system: enemies drop items on death, loot containers in the world, item spawning in designated locations, and pickup mechanics.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_content",
    assignedTo: "developer",
    blockedBy: ["task_VTE_005", "task_VTE_014"],
    subtasks: [
      { id: "sub_022a", title: "Implement loot drop tables per enemy type", done: false },
      { id: "sub_022b", title: "Implement dropped item entity (bouncing, glowing, despawn timer)", done: false },
      { id: "sub_022c", title: "Implement loot containers (chests, lockers, car trunks)", done: false },
      { id: "sub_022d", title: "Implement world item spawns (placed loot in designed locations)", done: false },
    ],
    acceptanceCriteria: [
      "Enemies drop appropriate loot on death",
      "Loot containers are openable and contain items",
      "Items can be picked up into inventory",
    ],
    estimatedMinutes: 240,
  }),

  taskBase({
    id: "task_VTE_023",
    title: "Create apartment endpoint and implement win condition",
    description:
      "Build the player's apartment as the final destination. Implement the win condition: reach the apartment to complete the game. Add ending sequence (cutscene, stats screen, credits).",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_content",
    assignedTo: "developer",
    blockedBy: ["task_VTE_020"],
    subtasks: [
      { id: "sub_023a", title: "Build apartment building exterior", done: false },
      { id: "sub_023b", title: "Build apartment interior (player's unit)", done: false },
      { id: "sub_023c", title: "Implement win trigger (enter apartment door)", done: false },
      { id: "sub_023d", title: "Create end-game stats screen (time, enemies defeated, blocks mined)", done: false },
      { id: "sub_023e", title: "Add restart/new game option", done: false },
    ],
    acceptanceCriteria: [
      "Apartment is recognizable as the goal",
      "Entering apartment triggers win state",
      "Stats screen shows meaningful play data",
    ],
    estimatedMinutes: 180,
  }),

  // ── Phase 5: Testing & Polish ────────────────────────────
  taskBase({
    id: "task_VTE_024",
    title: "Full QA testing pass — find and report all bugs",
    description:
      "Comprehensive QA testing of the entire game. Play through from start to finish multiple times. Test edge cases, break things intentionally, and document every bug found. This is the Tester agent's primary task.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_polish",
    assignedTo: "tester",
    subtasks: [
      { id: "sub_024a", title: "Playtest full game loop start to finish", done: false },
      { id: "sub_024b", title: "Test all combat interactions (every weapon vs every enemy)", done: false },
      { id: "sub_024c", title: "Test terrain destruction edge cases (chunk boundaries, falling blocks)", done: false },
      { id: "sub_024d", title: "Test inventory edge cases (full inventory, stacking, dropping)", done: false },
      { id: "sub_024e", title: "Test world generation (multiple seeds if procedural)", done: false },
      { id: "sub_024f", title: "Document all bugs with severity ratings and repro steps", done: false },
    ],
    acceptanceCriteria: [
      "All bugs documented in structured bug reports",
      "Zero critical or major bugs remaining",
      "Game is completable from start to finish",
    ],
    estimatedMinutes: 480,
  }),

  taskBase({
    id: "task_VTE_025",
    title: "Performance optimization — achieve stable 60fps",
    description:
      "Profile and optimize the game to hit stable 60fps on target hardware. Focus on rendering (draw calls, chunk meshing), physics (collision checks), and memory (chunk pooling).",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_polish",
    assignedTo: "developer",
    collaborators: ["tester"],
    blockedBy: ["task_VTE_024"],
    subtasks: [
      { id: "sub_025a", title: "Profile rendering pipeline (identify bottlenecks)", done: false },
      { id: "sub_025b", title: "Optimize chunk meshing (web workers, incremental updates)", done: false },
      { id: "sub_025c", title: "Implement LOD (level of detail) for distant chunks", done: false },
      { id: "sub_025d", title: "Optimize collision detection (spatial hashing)", done: false },
      { id: "sub_025e", title: "Memory profiling and leak detection", done: false },
    ],
    acceptanceCriteria: [
      "Stable 60fps with full view distance on mid-range hardware",
      "No memory leaks during extended play",
      "Load times under 5 seconds",
    ],
    estimatedMinutes: 360,
  }),

  taskBase({
    id: "task_VTE_026",
    title: "Playtest balance pass — difficulty, pacing, and fun factor",
    description:
      "Playtest the game focusing on balance: is the difficulty curve right? Is combat fair? Is loot distribution satisfying? Are any zones too long or too short? Adjust values based on playtesting.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_polish",
    assignedTo: "tester",
    collaborators: ["developer"],
    blockedBy: ["task_VTE_024"],
    subtasks: [
      { id: "sub_026a", title: "Evaluate difficulty curve (too hard/easy per zone?)", done: false },
      { id: "sub_026b", title: "Evaluate loot pacing (items found at right intervals?)", done: false },
      { id: "sub_026c", title: "Evaluate combat balance (weapons feel useful, enemies feel fair?)", done: false },
      { id: "sub_026d", title: "Evaluate zone length and pacing (no boring stretches?)", done: false },
      { id: "sub_026e", title: "Write balance recommendations with specific value changes", done: false },
    ],
    acceptanceCriteria: [
      "Difficulty curve feels fair and escalating",
      "Loot drops feel rewarding without being overwhelming",
      "All zones have appropriate pacing",
    ],
    estimatedMinutes: 240,
  }),

  taskBase({
    id: "task_VTE_027",
    title: "UI/UX polish — menus, HUD, and inventory screen",
    description:
      "Polish all UI elements: main menu, pause menu, HUD (health, hotbar, minimap?), inventory screen, crafting UI, and any dialog/tooltip systems.",
    importance: "not-important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_polish",
    assignedTo: "developer",
    blockedBy: ["task_VTE_024"],
    subtasks: [
      { id: "sub_027a", title: "Create main menu screen (New Game, Continue, Settings, Quit)", done: false },
      { id: "sub_027b", title: "Create pause menu", done: false },
      { id: "sub_027c", title: "Polish HUD layout (health bar, hotbar, minimap)", done: false },
      { id: "sub_027d", title: "Polish inventory/crafting screens", done: false },
      { id: "sub_027e", title: "Add tooltips for items and controls", done: false },
    ],
    acceptanceCriteria: [
      "All menus are functional and visually consistent",
      "HUD is readable without being intrusive",
      "Controls are discoverable",
    ],
    estimatedMinutes: 240,
  }),

  taskBase({
    id: "task_VTE_028",
    title: "Sound design and music integration",
    description:
      "Add audio: sound effects for mining, combat, pickups, UI interactions, ambient zone sounds, and background music. Source or create assets.",
    importance: "not-important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: "proj_VoxelTrafficEscape",
    milestoneId: "goal_VTE_polish",
    assignedTo: "developer",
    blockedBy: ["task_VTE_024"],
    subtasks: [
      { id: "sub_028a", title: "Implement audio engine (spatial audio, volume control)", done: false },
      { id: "sub_028b", title: "Add mining/building sound effects", done: false },
      { id: "sub_028c", title: "Add combat sound effects (hits, enemy death, weapons)", done: false },
      { id: "sub_028d", title: "Add ambient zone sounds (traffic, sewer drips, city noise)", done: false },
      { id: "sub_028e", title: "Add background music per zone", done: false },
      { id: "sub_028f", title: "Add UI sound effects (menu clicks, inventory, pickup jingle)", done: false },
    ],
    acceptanceCriteria: [
      "All major actions have sound feedback",
      "Each zone has distinct ambient audio",
      "Volume is adjustable in settings",
    ],
    estimatedMinutes: 300,
  }),
];

// ─── LINK TASK IDS INTO LONG-TERM GOAL ─────────────────────
goalLongTerm.tasks = tasks.map((t) => t.id);

// ─── WRITE EVERYTHING ──────────────────────────────────────
console.log("Reading existing data files...");

const projectsData = read("projects.json");
const agentsData = read("agents.json");
const goalsData = read("goals.json");
const tasksData = read("tasks.json");
const activityData = read("activity-log.json");
const inboxData = read("inbox.json");

// Add project
projectsData.projects.push(project);
console.log(`Added project: ${project.name}`);

// Add tester agent
agentsData.agents.push(testerAgent);
console.log(`Added agent: ${testerAgent.name}`);

// Add goals
goalsData.goals.push(goalLongTerm);
milestones.forEach((m) => goalsData.goals.push(m));
console.log(`Added 1 long-term goal + ${milestones.length} milestones`);

// Add tasks
tasks.forEach((t) => tasksData.tasks.push(t));
console.log(`Added ${tasks.length} tasks`);

// Log activity events
const events = [
  {
    id: `evt_${Date.now()}`,
    type: "task_created",
    actor: "system",
    taskId: null,
    summary: `Created project "Voxel Traffic Escape" with ${tasks.length} tasks, ${milestones.length} milestones, and 1 new agent (Tester)`,
    details: `Project ID: proj_VoxelTrafficEscape. Long-term goal: Ship v1.0. Milestones: Design, Engine, Mechanics, Content, Polish. Tester agent created for QA.`,
    timestamp: now,
  },
];
events.forEach((e) => activityData.events.unshift(e));

// Add inbox message about project creation
const inboxMsg = {
  id: `msg_${Date.now()}`,
  from: "system",
  to: "me",
  type: "update",
  taskId: null,
  subject: "New Project Created: Voxel Traffic Escape",
  body: `A new game project "Voxel Traffic Escape" has been created with ${tasks.length} tasks across 5 milestones:\n\n1. Game Design Document (6 tasks)\n2. Core Voxel Engine (5 tasks)\n3. Player Mechanics (6 tasks)\n4. Content & Levels (6 tasks)\n5. Testing & Polish (5 tasks)\n\nA new Tester agent has been added to the team, assigned to QA and playtest tasks.\n\nSeveral tasks contain DESIGN QUESTIONS in their notes that need your decisions before development can proceed. Start with task_VTE_001 (GDD).`,
  status: "unread",
  createdAt: now,
  readAt: null,
};
inboxData.messages.unshift(inboxMsg);

// Write all files
write("projects.json", projectsData);
write("agents.json", agentsData);
write("goals.json", goalsData);
write("tasks.json", tasksData);
write("activity-log.json", activityData);
write("inbox.json", inboxData);

console.log("\nAll data files updated successfully!");
console.log(`Summary:`);
console.log(`  - 1 project (Voxel Traffic Escape)`);
console.log(`  - 1 agent (Tester)`);
console.log(`  - 1 long-term goal + ${milestones.length} milestones`);
console.log(`  - ${tasks.length} tasks with subtasks and design questions`);
console.log(`  - 1 activity log event`);
console.log(`  - 1 inbox notification`);
