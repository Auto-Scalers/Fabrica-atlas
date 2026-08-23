/**
 * seed-dads-day-out.ts — Create the Dad's Day Out game project
 *
 * Usage: npx tsx scripts/seed-dads-day-out.ts
 *
 * Creates 1 agent (Tester), 1 project, 1 goal, 6 milestones, and 10 tasks
 * with proper dependencies, agent assignments, and Eisenhower classifications.
 *
 * NOTE: This script ADDS to existing data — it does NOT clear anything.
 */

const API = "http://localhost:3000/api";

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

async function main() {
  console.log("=== Seeding Dad's Day Out Project ===\n");

  // ─── Step 1: Create the Tester agent ───────────────────────────────────────
  console.log("1. Creating Tester agent...");
  try {
    const agent = await post("/agents", {
      id: "tester",
      name: "Tester",
      icon: "Shield",
      description:
        "QA testing, bug reporting, playtesting, performance analysis, and quality assurance",
      instructions: `You are acting as a QA Engineer and Playtester. Your role is to test software thoroughly, identify bugs, report issues with clear reproduction steps, and suggest quality improvements.

Before starting:
1. Read mission-control/data/ai-context.md for current project context
2. Check the project's codebase for existing test files and test patterns
3. Understand the feature requirements and acceptance criteria before testing

## Testing Process
1. Read the task's acceptance criteria carefully — these define your test cases
2. Run the code or application to verify functionality
3. Test edge cases: invalid inputs, boundary values, empty states, error conditions
4. Test across different scenarios: first-time use, repeated use, concurrent use
5. Check performance: load times, memory usage, frame rates (for games)
6. Verify visual consistency: layout, alignment, responsive behavior

## Bug Reporting Format
For each bug found, report:
- **Summary**: One-line description
- **Severity**: Critical / Major / Minor / Cosmetic
- **Steps to Reproduce**: Numbered steps to trigger the bug
- **Expected Result**: What should happen
- **Actual Result**: What actually happens
- **Environment**: Browser, OS, screen size
- **Screenshots/Logs**: Any relevant console errors or visual evidence

## Quality Standards
- All acceptance criteria must pass before marking a task as done
- Performance must be acceptable (60fps for games, <2s load for web apps)
- No console errors in production builds
- Graceful error handling for all user inputs
- Accessibility basics: keyboard navigation, color contrast, screen reader support

## Communication
- Post bug reports to inbox as type "report" with clear reproduction steps
- Request decisions when you find issues that could go either way
- Log all testing activity to the activity log
- Mark tasks as done only when ALL acceptance criteria are verified`,
      capabilities: [
        "manual-testing",
        "bug-reporting",
        "playtesting",
        "performance-testing",
        "regression-testing",
        "test-case-design",
        "quality-assurance",
        "accessibility-testing",
      ],
      skillIds: [],
      status: "active",
    });
    console.log(`   ✓ Agent created: ${agent.id}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("409")) {
      console.log("   ⓘ Tester agent already exists, skipping");
    } else {
      throw err;
    }
  }
  console.log("");

  // ─── Step 2: Create project ────────────────────────────────────────────────
  console.log("2. Creating project...");
  const proj = await post("/projects", {
    name: "Dad's Day Out",
    description:
      "A 2D NES-style platformer game where a Dad runs around the house with a baby in his arms. Features pixel art aesthetic, a baby cry meter mechanic, household hazards (legos, debris), and chore-based gameplay mechanics (dishwasher, laundry, dishes). Built with HTML5 Canvas and vanilla JavaScript — no heavy game engine. Progressive difficulty across multiple levels with 8-bit sound effects and music.\n\nGame code lives in projects/dads-day-out/.",
    status: "active",
    color: "#10B981",
    teamMembers: ["developer", "tester"],
    tags: ["game", "html5-canvas", "pixel-art", "nes-style", "platformer", "javascript"],
  });
  const projId = proj.id;
  console.log(`   ✓ Project: ${projId}\n`);

  // ─── Step 3: Create goal + milestones ──────────────────────────────────────
  console.log("3. Creating goal and milestones...");
  const goal = await post("/goals", {
    title: "Launch Dad's Day Out as a playable, polished 2D platformer game",
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
    title: "Build game engine foundation (loop, rendering, input, physics)",
    type: "medium-term",
    timeframe: "2026-03-08",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile2 = await post("/goals", {
    title:
      "Implement core gameplay (dad character, baby cry meter, hazards, bottles)",
    type: "medium-term",
    timeframe: "2026-03-15",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile3 = await post("/goals", {
    title: "Add household chore mechanics (dishwasher, dishes, laundry)",
    type: "medium-term",
    timeframe: "2026-03-22",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile4 = await post("/goals", {
    title: "Build level progression system and difficulty scaling",
    type: "medium-term",
    timeframe: "2026-03-29",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile5 = await post("/goals", {
    title: "Add polish: 8-bit audio, menus, screens, effects, tutorial",
    type: "medium-term",
    timeframe: "2026-04-05",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  const mile6 = await post("/goals", {
    title: "Playtest, balance, optimize, and ship",
    type: "medium-term",
    timeframe: "2026-04-12",
    parentGoalId: goalId,
    projectId: projId,
    status: "not-started",
    milestones: [],
    tasks: [],
  });

  console.log(`   ✓ Goal: ${goalId}`);
  console.log(
    `   ✓ Milestones: ${mile1.id}, ${mile2.id}, ${mile3.id}, ${mile4.id}, ${mile5.id}, ${mile6.id}\n`
  );

  // Update goal with milestone IDs
  await put("/goals", {
    id: goalId,
    milestones: [
      mile1.id,
      mile2.id,
      mile3.id,
      mile4.id,
      mile5.id,
      mile6.id,
    ],
  });

  // ─── Step 4: Create tasks ─────────────────────────────────────────────────
  console.log("4. Creating tasks...\n");
  const taskIds: Record<string, string> = {};

  // ── T1: Engine Core (DO — no blockers) ────────────────────────────────────
  const t1 = await post("/tasks", {
    title: "Set up project structure and game engine core",
    description:
      "Create the project scaffold at projects/dads-day-out/ with HTML5 Canvas. Implement the core game engine: game loop (requestAnimationFrame with fixed timestep), canvas rendering system, input handler (keyboard events for arrow keys and spacebar), and a basic entity system. Include a simple state machine for game states (menu, playing, paused, game-over). Set up a CLAUDE.md with project conventions. Use vanilla JS — no heavy game engines.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile1.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_1a",
        title:
          "Create projects/dads-day-out/ with index.html, main.js, and folder structure",
        done: false,
      },
      {
        id: "sub_ddo_1b",
        title: "Implement game loop with fixed timestep (60fps target)",
        done: false,
      },
      {
        id: "sub_ddo_1c",
        title: "Build canvas rendering system with sprite drawing",
        done: false,
      },
      {
        id: "sub_ddo_1d",
        title: "Implement keyboard input handler (arrow keys + spacebar)",
        done: false,
      },
      {
        id: "sub_ddo_1e",
        title:
          "Create game state machine (menu, playing, paused, game-over)",
        done: false,
      },
      {
        id: "sub_ddo_1f",
        title: "Write CLAUDE.md with project conventions",
        done: false,
      },
    ],
    blockedBy: [],
    estimatedMinutes: 120,
    acceptanceCriteria: [
      "Game loop runs at stable 60fps with fixed timestep",
      "Canvas renders and clears each frame correctly",
      "Arrow keys and spacebar input detected and processed",
      "Game states transition correctly (menu -> playing -> paused -> game-over)",
      "Project opens in browser via simple file:// or local server",
    ],
    tags: ["game-engine", "setup", "phase-1", "dads-day-out"],
    notes:
      "Use vanilla JS with HTML5 Canvas. No game engines (Phaser, Pixi, etc.) — keep it lightweight. NES resolution reference: 256x240, but scale up to fit modern screens with pixel-perfect scaling.",
  });
  taskIds["t1"] = t1.id;
  console.log(`   T1  [developer] ${t1.id} — Engine Core`);

  // ── T2: Physics (DO — blocked by T1) ─────────────────────────────────────
  const t2 = await post("/tasks", {
    title:
      "Build physics system with gravity, collision detection, and platforming",
    description:
      "Implement the core physics engine for platforming gameplay. Include: gravity with configurable strength, AABB collision detection, platform collision response (land on top, block from sides), jump mechanics with variable jump height (hold spacebar longer = jump higher, like NES Mario), and velocity/acceleration system. Support one-way platforms. Include a tile-based level collision system.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile1.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_2a",
        title: "Implement gravity and velocity/acceleration system",
        done: false,
      },
      {
        id: "sub_ddo_2b",
        title: "Build AABB collision detection",
        done: false,
      },
      {
        id: "sub_ddo_2c",
        title: "Add platform collision response (top, sides, bottom)",
        done: false,
      },
      {
        id: "sub_ddo_2d",
        title:
          "Implement variable-height jump mechanic (hold spacebar for higher)",
        done: false,
      },
      {
        id: "sub_ddo_2e",
        title: "Add tile-based level collision system",
        done: false,
      },
      {
        id: "sub_ddo_2f",
        title: "Support one-way platforms (jump through bottom, land on top)",
        done: false,
      },
    ],
    blockedBy: [taskIds["t1"]],
    estimatedMinutes: 150,
    acceptanceCriteria: [
      "Character falls with gravity and lands on platforms",
      "Variable jump height works (short tap vs hold)",
      "No clipping through walls or floors",
      "One-way platforms work (jump through bottom, land on top)",
      "Physics feels responsive and fun (not floaty or stiff)",
    ],
    tags: ["physics", "collision", "phase-1", "dads-day-out"],
    notes:
      "NES platformer feel: snappy jumps, tight controls. Add coyote time (brief window to jump after walking off edge) for forgiving controls.",
  });
  taskIds["t2"] = t2.id;
  console.log(`   T2  [developer] ${t2.id} — Physics (blocked by T1)`);

  // ── T3: Sprites & Animation (DO — blocked by T1) ─────────────────────────
  const t3 = await post("/tasks", {
    title: "Create sprite/animation system and Dad character with baby",
    description:
      "Build a sprite sheet loading and animation system. Create the Dad character carrying a baby — NES-style pixel art. Animations: idle, walk, jump, land, take damage, interact. Baby visible on Dad's arm with simple idle animation. Implement sprite flipping for direction. Build animation state machine tied to character state.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile1.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_3a",
        title: "Build sprite sheet loader and frame extraction",
        done: false,
      },
      {
        id: "sub_ddo_3b",
        title:
          "Implement animation system (frame timing, looping, one-shot)",
        done: false,
      },
      {
        id: "sub_ddo_3c",
        title:
          "Create Dad sprite sheet (idle, walk, jump, damage, interact)",
        done: false,
      },
      {
        id: "sub_ddo_3d",
        title: "Create baby sprite overlay with idle wiggle animation",
        done: false,
      },
      {
        id: "sub_ddo_3e",
        title: "Add sprite flipping for left/right facing",
        done: false,
      },
      {
        id: "sub_ddo_3f",
        title: "Wire animation state machine to character movement",
        done: false,
      },
    ],
    blockedBy: [taskIds["t1"]],
    estimatedMinutes: 180,
    acceptanceCriteria: [
      "Sprite sheet loads and renders individual frames correctly",
      "Dad animates smoothly when walking, jumping, and idling",
      "Baby is visibly attached to Dad and has idle animation",
      "Sprite flips horizontally when changing direction",
      "Animation transitions are smooth (no popping or missing frames)",
    ],
    tags: ["sprites", "animation", "character", "pixel-art", "phase-1", "dads-day-out"],
    notes:
      "Start with placeholder rectangles if pixel art takes too long — gameplay first, polish later.",
  });
  taskIds["t3"] = t3.id;
  console.log(`   T3  [developer] ${t3.id} — Sprites & Dad (blocked by T1)`);

  // ── T4: Cry Meter & Bottles (DO — blocked by T2, T3) ─────────────────────
  const t4 = await post("/tasks", {
    title: "Implement baby cry meter and bottle pickup/feeding mechanic",
    description:
      "Build the core urgency mechanic: the baby's cry meter fills over time. If it reaches full, lose a life. Bottles spawn at random reachable locations — picking one up and feeding the baby resets the meter. Visual feedback: meter bar, baby expression changes, screen shake near full. Sound cues at 50%, 75%, 90% thresholds. Brief feeding animation when using a bottle.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile2.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_4a",
        title: "Implement cry meter that fills over time",
        done: false,
      },
      {
        id: "sub_ddo_4b",
        title: "Add visual cry meter HUD (bar + baby expression)",
        done: false,
      },
      {
        id: "sub_ddo_4c",
        title: "Create bottle pickup item with spawn system",
        done: false,
      },
      {
        id: "sub_ddo_4d",
        title: "Implement feeding animation and meter reset",
        done: false,
      },
      {
        id: "sub_ddo_4e",
        title: "Add screen shake and urgency effects near full meter",
        done: false,
      },
      {
        id: "sub_ddo_4f",
        title: "Trigger life loss when meter fills completely",
        done: false,
      },
    ],
    blockedBy: [taskIds["t2"], taskIds["t3"]],
    estimatedMinutes: 120,
    acceptanceCriteria: [
      "Cry meter fills at a steady rate and is visible in the HUD",
      "Baby expression changes at meter thresholds (happy, fussy, crying)",
      "Bottles spawn in reachable locations and can be picked up",
      "Feeding resets the meter with a satisfying animation",
      "Life lost when meter reaches 100%",
      "Urgency feedback escalates (visual + audio cues at 50%, 75%, 90%)",
    ],
    tags: ["mechanic", "cry-meter", "gameplay", "phase-2", "dads-day-out"],
    notes:
      "This is the core tension mechanic — make it urgent but not frustrating. Generous on early levels, punishing on later ones. Brief grace period after feeding before meter starts filling again.",
  });
  taskIds["t4"] = t4.id;
  console.log(
    `   T4  [developer] ${t4.id} — Cry Meter & Bottles (blocked by T2, T3)`
  );

  // ── T5: Hazards & Obstacles (DO — blocked by T2, T3) ─────────────────────
  const t5 = await post("/tasks", {
    title: "Build household hazards: legos, debris, and obstacle system",
    description:
      "Create the obstacle system. Legos cause damage/slowdown + funny hop animation. Scattered debris (toys, shoes, books) as platforms and obstacles. Furniture as level geometry (couch, table, counters). Hazard types: static (lego, debris), moving (rolling toy car), timed (opening/closing cabinet doors). Design the first complete level room with a mix of hazards.",
    importance: "important",
    urgency: "urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile2.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_5a",
        title:
          "Create lego hazard (damage + slowdown + hop-on-one-foot animation)",
        done: false,
      },
      {
        id: "sub_ddo_5b",
        title: "Build debris/toy obstacle sprites and collision",
        done: false,
      },
      {
        id: "sub_ddo_5c",
        title:
          "Add furniture as level geometry (couch, table, counters, shelves)",
        done: false,
      },
      {
        id: "sub_ddo_5d",
        title: "Implement moving hazards (rolling toy car)",
        done: false,
      },
      {
        id: "sub_ddo_5e",
        title: "Add timed hazards (opening/closing cabinet doors)",
        done: false,
      },
      {
        id: "sub_ddo_5f",
        title: "Design and build first complete level room",
        done: false,
      },
    ],
    blockedBy: [taskIds["t2"], taskIds["t3"]],
    estimatedMinutes: 150,
    acceptanceCriteria: [
      "Legos cause a visible damage/slowdown reaction when stepped on",
      "Debris objects have correct collision boxes",
      "Furniture works as solid level geometry",
      "Moving and timed hazards function on their patterns",
      "First level room is playable from start to end",
    ],
    tags: ["hazards", "obstacles", "level-design", "phase-2", "dads-day-out"],
    notes:
      "Humor is key. The lego hop-on-one-foot animation should be exaggerated and funny — universally relatable pain. NES-style blinking invincibility after taking damage.",
  });
  taskIds["t5"] = t5.id;
  console.log(
    `   T5  [developer] ${t5.id} — Hazards & Obstacles (blocked by T2, T3)`
  );

  // ── T6: Chore Mechanics (SCHEDULE — blocked by T4, T5) ───────────────────
  const t6 = await post("/tasks", {
    title:
      "Implement household chore mechanics (dishwasher, dishes, laundry)",
    description:
      "Build the chore interaction system — mini-tasks embedded in gameplay. Dishwasher: walk up, press interact for timed button press sequence. Putting away dishes: carry from dishwasher to cabinet. Laundry: washer -> dryer -> fold (three-step at different locations). Chores award points, may spawn bottles, and slightly calm the cry meter. Add a chore checklist HUD showing required chores for level completion.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile3.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_6a",
        title: "Build interaction prompt system (press key near objects)",
        done: false,
      },
      {
        id: "sub_ddo_6b",
        title:
          "Implement dishwasher load/unload mechanic (timed button press)",
        done: false,
      },
      {
        id: "sub_ddo_6c",
        title: "Add dish carrying and put-away mechanic",
        done: false,
      },
      {
        id: "sub_ddo_6d",
        title: "Build laundry cycle mechanic (washer -> dryer -> fold)",
        done: false,
      },
      {
        id: "sub_ddo_6e",
        title: "Add scoring and rewards for completed chores",
        done: false,
      },
      {
        id: "sub_ddo_6f",
        title: "Create chore checklist HUD",
        done: false,
      },
    ],
    blockedBy: [taskIds["t4"], taskIds["t5"]],
    estimatedMinutes: 180,
    acceptanceCriteria: [
      "Interaction prompt appears when near chore stations",
      "Dishwasher mechanic works (load dishes, start, unload when done)",
      "Dish put-away requires carrying from dishwasher to cabinet",
      "Laundry has three distinct steps at different stations",
      "Chore completion awards score and may spawn bottle",
      "Chore checklist HUD shows progress toward level completion",
    ],
    tags: ["chores", "mechanics", "interaction", "phase-3", "dads-day-out"],
    notes:
      "The chores should feel like real-life multitasking hell — juggling the baby's needs while doing mundane tasks. Humor comes from the chaos.",
  });
  taskIds["t6"] = t6.id;
  console.log(
    `   T6  [developer] ${t6.id} — Chore Mechanics (blocked by T4, T5)`
  );

  // ── T7: Level Progression (SCHEDULE — blocked by T6) ─────────────────────
  const t7 = await post("/tasks", {
    title: "Build level progression system and difficulty scaling",
    description:
      "Create a level system with 5+ levels of progressive difficulty. Level 1: Kitchen (tutorial, few hazards, slow cry meter). Level 2: Living Room (more obstacles, moving hazards). Level 3: Bedroom + Bathroom (multi-room, laundry chores). Level 4: Whole House (all rooms, fast cry meter). Level 5: Nightmare Mode (everything at once). Implement level loader, difficulty scaling (faster cry meter, fewer bottles, more chores), score tracking, lives system (3 lives), and level completion screen.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile4.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_7a",
        title: "Build level data format and level loader",
        done: false,
      },
      {
        id: "sub_ddo_7b",
        title: "Design and build Level 1: Kitchen (tutorial)",
        done: false,
      },
      {
        id: "sub_ddo_7c",
        title:
          "Design and build Levels 2-3 with increasing complexity",
        done: false,
      },
      {
        id: "sub_ddo_7d",
        title:
          "Design and build Levels 4-5 (full house, nightmare mode)",
        done: false,
      },
      {
        id: "sub_ddo_7e",
        title:
          "Implement difficulty scaling (cry meter speed, obstacle density, bottle scarcity)",
        done: false,
      },
      {
        id: "sub_ddo_7f",
        title:
          "Add lives system (3 lives), score tracking, and level completion screen",
        done: false,
      },
    ],
    blockedBy: [taskIds["t6"]],
    estimatedMinutes: 240,
    acceptanceCriteria: [
      "At least 5 levels with distinct layouts and themes",
      "Level loader reads level data and constructs the level correctly",
      "Difficulty scales noticeably between levels",
      "Lives system works (3 lives, game over at 0)",
      "Score tracks across levels and displays on completion screen",
      "Player can progress from level 1 through level 5",
    ],
    tags: ["levels", "progression", "difficulty", "phase-4", "dads-day-out"],
    notes:
      "Fun level names: 'The Morning Shift', 'Afternoon Chaos', 'The Witching Hour', 'Full House Meltdown', 'Nightmare: Twins Edition'. Consider brief comic panels between levels for humor.",
  });
  taskIds["t7"] = t7.id;
  console.log(
    `   T7  [developer] ${t7.id} — Level Progression (blocked by T6)`
  );

  // ── T8: Audio System (SCHEDULE — blocked by T4) ──────────────────────────
  const t8 = await post("/tasks", {
    title: "Add 8-bit sound effects, music, and audio system",
    description:
      "Build an audio system with Web Audio API. Create/source 8-bit NES-style sounds: jump, land, lego step (ow!), bottle pickup, feeding, chore completion, baby fussing (escalating), game over jingle, level complete fanfare, menu select. Chiptune background music per level. Music tempo speeds up as cry meter increases. Mute toggle and volume control. Use jsfxr or similar for generating retro sounds.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile5.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_8a",
        title: "Build audio manager with Web Audio API",
        done: false,
      },
      {
        id: "sub_ddo_8b",
        title: "Generate/source 8-bit sound effects (10+ sounds)",
        done: false,
      },
      {
        id: "sub_ddo_8c",
        title: "Create or source chiptune background music tracks",
        done: false,
      },
      {
        id: "sub_ddo_8d",
        title: "Implement music tempo scaling with cry meter",
        done: false,
      },
      {
        id: "sub_ddo_8e",
        title: "Add mute toggle and volume control",
        done: false,
      },
    ],
    blockedBy: [taskIds["t4"]],
    estimatedMinutes: 120,
    acceptanceCriteria: [
      "All major actions have sound effects",
      "Background music loops per level without gaps",
      "Music tempo increases with cry meter level",
      "Mute toggle and volume control work",
      "Audio does not cause performance issues",
    ],
    tags: ["audio", "music", "8-bit", "polish", "phase-5", "dads-day-out"],
    notes:
      "jsfxr (sfxr.me) is great for generating retro sounds. For music, consider OpenGameArt.org or simple chiptune loops. Keep file sizes small.",
  });
  taskIds["t8"] = t8.id;
  console.log(`   T8  [developer] ${t8.id} — Audio System (blocked by T4)`);

  // ── T9: Menus & Screens (SCHEDULE — blocked by T7) ───────────────────────
  const t9 = await post("/tasks", {
    title: "Build title screen, menus, and game-over/victory screens",
    description:
      "Create the full menu and screen flow. Title screen: pixel art title 'Dad's Day Out' with Dad holding baby, press-start prompt. Main menu: Start Game, How to Play, Credits. How to Play: controls with animated examples. Pause menu: Resume, Restart, Quit. Game Over: score + retry. Victory: final score, time, chores completed, star rating (1-3). Screen transitions (fade, NES-style wipe).",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile5.id,
    assignedTo: "developer",
    collaborators: [],
    subtasks: [
      {
        id: "sub_ddo_9a",
        title:
          "Create title screen with pixel art title and press-start prompt",
        done: false,
      },
      {
        id: "sub_ddo_9b",
        title: "Build main menu (Start, How to Play, Credits)",
        done: false,
      },
      {
        id: "sub_ddo_9c",
        title:
          "Create How to Play screen with animated control instructions",
        done: false,
      },
      {
        id: "sub_ddo_9d",
        title: "Build pause menu (Resume, Restart, Quit)",
        done: false,
      },
      {
        id: "sub_ddo_9e",
        title: "Create game-over screen with retry option",
        done: false,
      },
      {
        id: "sub_ddo_9f",
        title:
          "Create victory screen with score, time, star rating",
        done: false,
      },
      {
        id: "sub_ddo_9g",
        title: "Add screen transitions (fade, wipe)",
        done: false,
      },
    ],
    blockedBy: [taskIds["t7"]],
    estimatedMinutes: 150,
    acceptanceCriteria: [
      "Title screen displays with animated press-start prompt",
      "Main menu navigates correctly to all sub-screens",
      "Pause works mid-game and can resume correctly",
      "Game over shows score and allows retry",
      "Victory screen shows stats and star rating",
      "Screen transitions are smooth and NES-appropriate",
    ],
    tags: ["ui", "menus", "screens", "polish", "phase-5", "dads-day-out"],
    notes:
      "Title screen sets the tone — Dad looking exhausted, baby looking happy. Consider a short NES-style intro where Dad looks at his to-do list and sighs.",
  });
  taskIds["t9"] = t9.id;
  console.log(`   T9  [developer] ${t9.id} — Menus & Screens (blocked by T7)`);

  // ── T10: QA & Balance (SCHEDULE — blocked by T8, T9) ─────────────────────
  const t10 = await post("/tasks", {
    title: "Playtest, balance, fix bugs, and optimize performance",
    description:
      "Comprehensive QA pass on the complete game. Playtest all 5 levels start to finish. Test all mechanics: jumping, collision, cry meter, bottles, chores, hazards, lives, scoring. Verify difficulty curve. Check edge cases: walking off screen, getting stuck in geometry, cry meter during transitions. Performance test: stable 60fps. Balance cry meter rates, bottle spawn frequency, chore timing per level. Test in Chrome, Firefox, Edge.",
    importance: "important",
    urgency: "not-urgent",
    kanban: "not-started",
    projectId: projId,
    milestoneId: mile6.id,
    assignedTo: "tester",
    collaborators: ["developer"],
    subtasks: [
      {
        id: "sub_ddo_10a",
        title:
          "Full playthrough of all 5 levels — document all bugs found",
        done: false,
      },
      {
        id: "sub_ddo_10b",
        title:
          "Test edge cases (off-screen, geometry traps, state transitions)",
        done: false,
      },
      {
        id: "sub_ddo_10c",
        title:
          "Performance test: verify 60fps in Chrome, Firefox, Edge",
        done: false,
      },
      {
        id: "sub_ddo_10d",
        title:
          "Balance difficulty curve (cry meter, bottles, chores per level)",
        done: false,
      },
      {
        id: "sub_ddo_10e",
        title: "Fix all Critical and Major bugs",
        done: false,
      },
      {
        id: "sub_ddo_10f",
        title: "Final regression test after all fixes",
        done: false,
      },
    ],
    blockedBy: [taskIds["t8"], taskIds["t9"]],
    estimatedMinutes: 240,
    acceptanceCriteria: [
      "All 5 levels completable start to finish without game-breaking bugs",
      "60fps maintained in Chrome, Firefox, and Edge",
      "Difficulty curve feels fair (Level 1 easy, Level 5 challenging-but-fun)",
      "No Critical or Major bugs remaining",
      "Cry meter timing feels urgent but not frustrating on each level",
      "All chore mechanics work consistently across all levels",
    ],
    tags: ["qa", "testing", "balance", "performance", "phase-6", "dads-day-out"],
    notes:
      "This is the tester agent's primary task. Developer is collaborator to fix bugs found during testing.",
  });
  taskIds["t10"] = t10.id;
  console.log(
    `   T10 [tester]    ${t10.id} — QA & Balance (blocked by T8, T9)`
  );

  // ─── Step 5: Update milestones with task IDs ──────────────────────────────
  console.log("\n5. Updating milestones with task IDs...");
  const allTaskIds = Object.values(taskIds);

  await put("/goals", {
    id: mile1.id,
    tasks: [taskIds["t1"], taskIds["t2"], taskIds["t3"]],
  });
  await put("/goals", {
    id: mile2.id,
    tasks: [taskIds["t4"], taskIds["t5"]],
  });
  await put("/goals", { id: mile3.id, tasks: [taskIds["t6"]] });
  await put("/goals", { id: mile4.id, tasks: [taskIds["t7"]] });
  await put("/goals", {
    id: mile5.id,
    tasks: [taskIds["t8"], taskIds["t9"]],
  });
  await put("/goals", { id: mile6.id, tasks: [taskIds["t10"]] });
  await put("/goals", { id: goalId, tasks: allTaskIds });

  console.log("   ✓ Milestones updated\n");

  // ─── Done ──────────────────────────────────────────────────────────────────
  console.log("=== Dad's Day Out project seeded successfully ===");
  console.log(`   Project:    ${projId}`);
  console.log(`   Goal:       ${goalId}`);
  console.log(
    `   Milestones: ${[mile1.id, mile2.id, mile3.id, mile4.id, mile5.id, mile6.id].join(", ")}`
  );
  console.log(`   Tasks:      ${allTaskIds.length} created`);
  console.log(`\n   Phase 1 (DO — run first):     T1, then T2+T3 in parallel`);
  console.log(`   Phase 2 (DO — after Phase 1): T4+T5 in parallel`);
  console.log(`   Phase 3 (SCHEDULE):           T6, then T7, T8`);
  console.log(`   Phase 4 (SCHEDULE):           T9, then T10 (tester)`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
