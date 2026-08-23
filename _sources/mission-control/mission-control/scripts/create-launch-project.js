#!/usr/bin/env node
// Creates the Mission Control Open-Source Launch project with all tasks
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
const write = (f, d) => fs.writeFileSync(path.join(dataDir, f), JSON.stringify(d, null, 2));

const projects = read('projects.json');
const goals = read('goals.json');
const tasks = read('tasks.json');
const inbox = read('inbox.json');
const activity = read('activity-log.json');

const now = new Date().toISOString();
const projectId = 'proj_MCLaunch';
const goalMainId = 'goal_MCL_main';
const m1Id = 'goal_MCL_m1_prep';
const m2Id = 'goal_MCL_m2_social';
const m3Id = 'goal_MCL_m3_hn';
const m4Id = 'goal_MCL_m4_ph';
const m5Id = 'goal_MCL_m5_growth';

// Check if project already exists
if (projects.projects.find(p => p.id === projectId)) {
  console.log('Project already exists, skipping.');
  process.exit(0);
}

// === PROJECT ===
projects.projects.push({
  id: projectId,
  name: 'Mission Control \u2014 Open-Source Launch',
  description: 'Launch Mission Control v0.9 as open-source. Multi-channel launch across Reddit, Twitter/X, Hacker News, Dev.to, and Product Hunt. All launch content in research/Launch/. Strategy docs in research/mission-control-*.md.',
  status: 'active',
  color: '#2563EB',
  teamMembers: ['me', 'marketer', 'developer'],
  createdAt: now,
  tags: ['launch', 'open-source', 'marketing', 'mission-control', 'community'],
  deletedAt: null
});

// === GOALS ===
const allTaskIds = [];
const milestoneTaskMap = {};
[m1Id, m2Id, m3Id, m4Id, m5Id].forEach(m => milestoneTaskMap[m] = []);

goals.goals.push({
  id: goalMainId,
  title: 'Successfully launch Mission Control open-source and build community traction (100+ stars, 5+ contributors)',
  type: 'long-term',
  timeframe: 'Q1 2026',
  parentGoalId: null,
  projectId,
  status: 'in-progress',
  milestones: [m1Id, m2Id, m3Id, m4Id, m5Id],
  tasks: [],
  createdAt: now,
  deletedAt: null
});

goals.goals.push({
  id: m1Id,
  title: 'Complete pre-launch preparation (Discord, GitHub issues, content review)',
  type: 'medium-term',
  timeframe: '2026-02-25',
  parentGoalId: goalMainId,
  projectId,
  status: 'in-progress',
  milestones: [],
  tasks: [],
  createdAt: now,
  deletedAt: null
});

goals.goals.push({
  id: m2Id,
  title: 'Execute initial Reddit + Twitter launch wave',
  type: 'medium-term',
  timeframe: '2026-02-28',
  parentGoalId: goalMainId,
  projectId,
  status: 'not-started',
  milestones: [],
  tasks: [],
  createdAt: now,
  deletedAt: null
});

goals.goals.push({
  id: m3Id,
  title: 'Launch on Hacker News + Dev.to (when HN account restored)',
  type: 'medium-term',
  timeframe: '2026-03-05',
  parentGoalId: goalMainId,
  projectId,
  status: 'not-started',
  milestones: [],
  tasks: [],
  createdAt: now,
  deletedAt: null
});

goals.goals.push({
  id: m4Id,
  title: 'Launch on Product Hunt (requires 100+ GitHub stars)',
  type: 'medium-term',
  timeframe: '2026-03-08',
  parentGoalId: goalMainId,
  projectId,
  status: 'not-started',
  milestones: [],
  tasks: [],
  createdAt: now,
  deletedAt: null
});

goals.goals.push({
  id: m5Id,
  title: 'Build post-launch momentum, content marketing, and community growth',
  type: 'medium-term',
  timeframe: '2026-03-24',
  parentGoalId: goalMainId,
  projectId,
  status: 'not-started',
  milestones: [],
  tasks: [],
  createdAt: now,
  deletedAt: null
});

// === TASK HELPER ===
function T(id, title, desc, imp, urg, mId, agent, due, estMin, subs, blocked, collabs, tags2, notes2) {
  const t = {
    id,
    title,
    description: desc,
    importance: imp,
    urgency: urg,
    kanban: 'not-started',
    projectId,
    milestoneId: mId,
    assignedTo: agent,
    collaborators: collabs || [],
    dailyActions: [],
    subtasks: subs || [],
    blockedBy: blocked || [],
    estimatedMinutes: estMin,
    actualMinutes: null,
    acceptanceCriteria: [],
    comments: [],
    tags: ['launch', 'mission-control'].concat(tags2 || []),
    notes: notes2 || '',
    createdAt: now,
    updatedAt: now,
    dueDate: due,
    completedAt: null,
    deletedAt: null,
  };
  tasks.tasks.push(t);
  allTaskIds.push(id);
  milestoneTaskMap[mId].push(id);
}

// ============================================================
// MILESTONE 1: PRE-LAUNCH PREP (Feb 24-25)
// ============================================================

T('task_MCL_01',
  'Set up Discord server with launch channels',
  'Create the Mission Control community Discord server. Channels: #general, #feedback, #show-off (people sharing setups), #contributing, #bugs. Roles: Early Adopter (first 100 members), Contributor (PR authors). Add the Discord invite link to the GitHub README. See research/Launch/LAUNCH-CHECKLIST.md Phase 0 > Community Setup.',
  'important', 'urgent', m1Id, 'me', '2026-02-24', 30,
  [
    { id: 'sub_01a', title: 'Create Discord server', done: false },
    { id: 'sub_01b', title: 'Set up 5 channels (#general, #feedback, #show-off, #contributing, #bugs)', done: false },
    { id: 'sub_01c', title: 'Create roles (Early Adopter, Contributor)', done: false },
    { id: 'sub_01d', title: 'Add invite link to README', done: false },
  ],
  null, null, ['community', 'discord']);

T('task_MCL_02',
  'Create 12 GitHub issues from launch templates',
  'Create 12 GitHub issues from the templates in research/Launch/github-issues.md. Apply proper labels: 4 "good first issue", 4 "enhancement", 4 "help wanted". Each issue has detailed acceptance criteria in the template. These issues serve as an invitation for contributors. Also create the GitHub label set described in the document (good-first-issue, enhancement, help-wanted, keyboard-shortcuts, ui, responsive, feature, docker, github-integration, analytics, plugins, accessibility, data-portability).',
  'important', 'urgent', m1Id, 'developer', '2026-02-24', 45,
  [
    { id: 'sub_02a', title: 'Create GitHub labels from the reference list', done: false },
    { id: 'sub_02b', title: 'Create 4 good-first-issue tickets (#1-4)', done: false },
    { id: 'sub_02c', title: 'Create 4 enhancement tickets (#5-8)', done: false },
    { id: 'sub_02d', title: 'Create 4 help-wanted tickets (#9-12)', done: false },
  ],
  null, null, ['github', 'community'],
  'Issue templates: C:\\Users\\justs\\Documents\\Claude\\research\\Launch\\github-issues.md');

T('task_MCL_03',
  'Add GitHub topics, enable Discussions, finalize repo settings',
  'Configure GitHub repo for discoverability. Add topics: ai-agents, task-management, claude-code, open-source, nextjs, typescript, solo-entrepreneur, eisenhower-matrix. Enable GitHub Discussions with categories: Q&A, Ideas, Show & Tell, Agent Recipes. Verify social preview image is set (1280x640). Tag v0.9.0 release with comprehensive release notes (template in research/mission-control-launch-plan.md Appendix B).',
  'important', 'urgent', m1Id, 'me', '2026-02-24', 20,
  [
    { id: 'sub_03a', title: 'Add 8 GitHub topics', done: false },
    { id: 'sub_03b', title: 'Enable Discussions with 4 categories', done: false },
    { id: 'sub_03c', title: 'Verify social preview image (1280x640)', done: false },
    { id: 'sub_03d', title: 'Tag v0.9.0 release with changelog', done: false },
  ],
  null, null, ['github']);

T('task_MCL_04',
  'Review and personalize all draft launch content',
  'Review all pre-drafted content in research/Launch/ and add your personal voice. The drafts are solid but need to feel authentic. Key updates needed:\n- Update test count to 193 everywhere\n- Verify feature counts match current state\n- Add personal anecdotes\n- Adjust any details that changed since drafting\n\nFiles to review:\n- show-hn-post.md (HN submission)\n- twitter-thread.md (10-tweet thread)\n- reddit-posts.md (3 Reddit posts for r/ClaudeAI, r/SideProject, r/nextjs)\n- devto-article.md (technical deep-dive)',
  'important', 'urgent', m1Id, 'me', '2026-02-24', 60,
  [
    { id: 'sub_04a', title: 'Review and personalize show-hn-post.md', done: false },
    { id: 'sub_04b', title: 'Review and personalize twitter-thread.md', done: false },
    { id: 'sub_04c', title: 'Review and personalize reddit-posts.md (all 3)', done: false },
    { id: 'sub_04d', title: 'Review and personalize devto-article.md', done: false },
    { id: 'sub_04e', title: 'Update all stats to current numbers (193 tests, etc.)', done: false },
  ],
  null, null, ['content']);

T('task_MCL_05',
  'Resolve Hacker News account situation',
  'Follow up on the HN account deletion. The account was flagged and auto-deleted because it was brand new when posting a Show HN link.\n\nAction plan:\n1. Check email for response from HN mods (hn@ycombinator.com)\n2. If no response in 24h, send follow-up email with context: genuine OSS project, MIT license, 193 tests, not spam\n3. If account cannot be restored, create a new account and spend 1-2 weeks building comment history on other Show HN posts and technical threads before resubmitting\n4. DO NOT create a duplicate account while the first is under review (HN detects this)\n\nBackup plan: Launch Reddit + Twitter first, HN when account is sorted. This actually helps \u2014 you will have GitHub stars as social proof when HN goes live.',
  'important', 'urgent', m1Id, 'me', '2026-02-25', 15,
  [
    { id: 'sub_05a', title: 'Check email for HN mod response', done: false },
    { id: 'sub_05b', title: 'Follow up if no response in 24 hours', done: false },
    { id: 'sub_05c', title: 'If needed: create new account and build commenting history', done: false },
  ],
  null, null, ['hacker-news']);

// ============================================================
// MILESTONE 2: REDDIT + TWITTER LAUNCH (Feb 25-28)
// ============================================================

T('task_MCL_06',
  'Post Twitter/X launch thread (10 tweets with screenshots)',
  'Post the 10-tweet launch thread from research/Launch/twitter-thread.md. Insert the 5 screenshots into placeholder slots. Pin the thread to your profile.\n\nThread structure:\n1. Hook: Managing 5 AI agents = herding cats\n2. What it is: Asana meets orchestration\n3. Eisenhower matrix [screenshot]\n4. Agent crew [screenshot]\n5. Inbox system [screenshot]\n6. The daemon (KILLER FEATURE)\n7. Architecture quality (193 tests, mutex, Zod)\n8. Token optimization (50 vs 5,400 tokens)\n9. Open source, MIT licensed [screenshot]\n10. CTA: Star the repo\n\nHashtags: #buildinpublic #ClaudeCode #opensource #AI #solopreneur #NextJS\n\nPost in the morning for maximum US timezone reach.',
  'important', 'urgent', m2Id, 'me', '2026-02-25', 30,
  [
    { id: 'sub_06a', title: 'Add screenshots to tweet drafts', done: false },
    { id: 'sub_06b', title: 'Post all 10 tweets as a thread', done: false },
    { id: 'sub_06c', title: 'Pin thread to profile', done: false },
  ],
  null, null, ['twitter', 'social-media'],
  'Full thread: research/Launch/twitter-thread.md');

T('task_MCL_07',
  'Post to r/SideProject (most launch-friendly subreddit)',
  'Post to r/SideProject \u2014 explicitly welcomes self-promotion. Use Post 2 from research/Launch/reddit-posts.md.\n\nTitle: "I Built a Command Center for AI Agents \u2013 Solo Founders Can Now Delegate to Claude Code, Cursor, & Windsurf 24/7"\n\nFocus: the problem (no task visibility, manual coordination, no audit trail), what MC does (Eisenhower, kanban, inbox, daemon), tech stack, open source MIT. Put GitHub link in first comment. Respond to EVERY comment for 48 hours.',
  'important', 'urgent', m2Id, 'me', '2026-02-25', 20,
  [
    { id: 'sub_07a', title: 'Finalize r/SideProject post', done: false },
    { id: 'sub_07b', title: 'Post to r/SideProject', done: false },
    { id: 'sub_07c', title: 'Add GitHub link in first comment', done: false },
    { id: 'sub_07d', title: 'Monitor and respond to comments for 48h', done: false },
  ],
  null, null, ['reddit', 'social-media'],
  'Post content: research/Launch/reddit-posts.md (Post 2: r/SideProject)');

T('task_MCL_08',
  'Post to r/ClaudeAI (highest-conversion audience)',
  'Post to r/ClaudeAI \u2014 the most aligned audience. Use Post 1 from research/Launch/reddit-posts.md.\n\nTitle: "Built a Command Center for Claude Code \u2013 Now I Can Delegate 24/7 Without Losing Sanity"\n\nFocus on Claude Code specifics: 13 slash commands (/orchestrate, /daily-plan, /standup, /ship-feature), daemon spawning claude -p sessions, CLAUDE.md as operations manual, skills library, agent inbox. Space 1 day after r/SideProject to avoid looking spammy. Respond to every comment.',
  'important', 'urgent', m2Id, 'me', '2026-02-26', 20,
  [
    { id: 'sub_08a', title: 'Finalize r/ClaudeAI post', done: false },
    { id: 'sub_08b', title: 'Post to r/ClaudeAI', done: false },
    { id: 'sub_08c', title: 'Add GitHub link in first comment', done: false },
    { id: 'sub_08d', title: 'Monitor and respond to all comments', done: false },
  ],
  null, null, ['reddit', 'social-media', 'claude'],
  'Post content: research/Launch/reddit-posts.md (Post 1: r/ClaudeAI)');

T('task_MCL_09',
  'Post to r/nextjs (technical architecture angle)',
  'Post to r/nextjs with technical deep-dive angle. Use Post 3 from research/Launch/reddit-posts.md.\n\nTitle: "Built an AI Task Management App with Next.js 15 \u2013 Local-First JSON, Concurrent Write Safety, 193 Tests"\n\nFocus: Next.js 15 App Router patterns, async-mutex per-file concurrency, Zod v4 validation, Vitest testing strategy (193 tests across 5 suites), JSON-as-storage trade-offs. Include the mutex code snippet. This audience cares about architecture, not AI agent features.',
  'important', 'not-urgent', m2Id, 'me', '2026-02-27', 20,
  [
    { id: 'sub_09a', title: 'Finalize r/nextjs post', done: false },
    { id: 'sub_09b', title: 'Post to r/nextjs', done: false },
    { id: 'sub_09c', title: 'Respond to technical questions', done: false },
  ],
  null, null, ['reddit', 'nextjs', 'technical'],
  'Post content: research/Launch/reddit-posts.md (Post 3: r/nextjs)');

T('task_MCL_10',
  'Tweet Day 1-2 metrics update (build in public)',
  'Post a metrics update on Twitter after 24-48 hours. Share: GitHub stars count, clones, issues opened, Reddit upvotes, most interesting feedback received. Frame as a build-in-public update. Example: "24 hours since launch. X stars, Y issues opened, Z people trying it out. Here is the most interesting feedback so far..." This humanizes the launch and builds engagement.',
  'not-important', 'urgent', m2Id, 'me', '2026-02-26', 15,
  [], null, null, ['twitter', 'build-in-public']);

T('task_MCL_11',
  'Post to r/opensource (open-source community angle)',
  'Post to r/opensource.\n\nSuggested title: "Just open-sourced Mission Control v0.9 (MIT) \u2014 AI agent task management with autonomous daemon and 193 tests"\n\nFocus: MIT license, 193 automated tests, CI pipeline (typecheck + lint + build + test), CONTRIBUTING.md, 12 good-first-issue/help-wanted labels. This community values well-maintained, well-tested projects with clear contribution paths.',
  'not-important', 'not-urgent', m2Id, 'me', '2026-02-28', 15,
  [], null, null, ['reddit', 'open-source']);

// ============================================================
// MILESTONE 3: HN + DEV.TO (Feb 27 - Mar 5)
// ============================================================

T('task_MCL_12',
  'Publish Dev.to technical article',
  'Publish the technical deep-dive from research/Launch/devto-article.md on Dev.to.\n\nTitle: "How I Built an Autonomous Daemon to Manage My AI Agents"\nTags: ai, typescript, nextjs, opensource\n\nContent covers: JSON-as-IPC architecture, the daemon (polling, spawning claude -p, cron, security hardening), mutex concurrency pattern, token optimization (50 vs 5,400 tokens), testing strategy (193 tests across 5 suites). Add a cover image. Cross-post link to Twitter.',
  'important', 'not-urgent', m3Id, 'me', '2026-02-27', 30,
  [
    { id: 'sub_12a', title: 'Create Dev.to account if needed', done: false },
    { id: 'sub_12b', title: 'Publish article from devto-article.md', done: false },
    { id: 'sub_12c', title: 'Add cover image and tags', done: false },
    { id: 'sub_12d', title: 'Share article link on Twitter', done: false },
  ],
  null, null, ['devto', 'content-marketing'],
  'Full article: research/Launch/devto-article.md');

T('task_MCL_13',
  'Post Show HN (when HN account restored)',
  'Submit the Show HN post when HN account is restored. Use content from research/Launch/show-hn-post.md.\n\nTitle: "Show HN: Mission Control \u2013 Open-source task management for AI agents"\n\nTiming: 6-8 AM EST on a Tuesday, Wednesday, or Thursday. Post the introductory comment within 60 seconds. Be in comments answering questions for 4-6 hours. Lead with technical depth when answering. If a bug is reported, fix it live and respond "Fixed in [commit hash]. Thanks for catching this."\n\nSee research/mission-control-launch-plan.md Section 4.1 for the full HN playbook. Section 8 has prepared responses to 10 common objections (why not Linear, JSON scaling, concurrent writes, glorified todo list, business model, agent reliability, 193 tests overkill, why Next.js, difference from CrewAI).',
  'important', 'urgent', m3Id, 'me', '2026-03-03', 360,
  [
    { id: 'sub_13a', title: 'Verify HN account is active', done: false },
    { id: 'sub_13b', title: 'Submit Show HN post (6-8 AM EST, Tue-Thu)', done: false },
    { id: 'sub_13c', title: 'Post introductory comment within 60 seconds', done: false },
    { id: 'sub_13d', title: 'Monitor and respond every 15 min for 4 hours', done: false },
    { id: 'sub_13e', title: 'Continue engagement every 30 min for next 4 hours', done: false },
  ],
  ['task_MCL_05'], null, ['hacker-news'],
  'Post: research/Launch/show-hn-post.md\nObjections: research/mission-control-launch-plan.md Section 8\nFull HN playbook: research/mission-control-launch-plan.md Section 4.1');

T('task_MCL_14',
  'Fix any bugs reported during launch week (fast turnaround)',
  'Monitor GitHub issues, Reddit comments, and HN comments for bug reports. Fix reported bugs as fast as possible \u2014 ideally within 1 hour. Fast bug fixes during launch week are incredibly impressive to the developer community and build trust.\n\nResponse template: "Thanks for catching this! I have pushed a fix in [commit link]. Can you pull the latest and confirm it is resolved? I have also added a test case to prevent regression."\n\nThis is a recurring responsibility throughout launch week (Feb 25 - Mar 7).',
  'important', 'urgent', m3Id, 'developer', '2026-03-03', 120,
  [
    { id: 'sub_14a', title: 'Monitor GitHub issues daily', done: false },
    { id: 'sub_14b', title: 'Fix and push any reported bugs ASAP', done: false },
    { id: 'sub_14c', title: 'Reply to reporter with commit hash', done: false },
  ],
  null, null, ['bugfix', 'community']);

// ============================================================
// MILESTONE 4: PRODUCT HUNT (Mar 4-8)
// ============================================================

T('task_MCL_15',
  'Prepare Product Hunt listing',
  'Create the complete Product Hunt listing. Only launch if 100+ GitHub stars by this point.\n\nTagline (60 chars): "AI-native task management for solo entrepreneurs"\nTopics: Developer Tools, Open Source, Productivity, Task Management, Artificial Intelligence\n\nGallery (6-8 images):\n1. Dashboard overview (hero)\n2. Eisenhower matrix with agent assignments\n3. Kanban board with project filter\n4. Agent inbox showing delegation + completion report\n5. Daemon dashboard showing status, active sessions, cron schedule\n6. Crew/agent management page\n7. Brain Dump triage workflow\n8. Goals/milestones hierarchy\n\nDraft the maker first comment (template in research/mission-control-launch-plan.md Section 4.4). Schedule for Saturday 12:01 AM PT.',
  'important', 'not-urgent', m4Id, 'marketer', '2026-03-04', 60,
  [
    { id: 'sub_15a', title: 'Create Product Hunt maker profile', done: false },
    { id: 'sub_15b', title: 'Write tagline and description', done: false },
    { id: 'sub_15c', title: 'Upload 6-8 gallery screenshots', done: false },
    { id: 'sub_15d', title: 'Draft maker first comment', done: false },
    { id: 'sub_15e', title: 'Schedule for Saturday 12:01 AM PT', done: false },
  ],
  null, null, ['product-hunt'],
  'PH playbook: research/mission-control-launch-plan.md Section 4.4\nMarketing plan: research/mission-control-marketing-plan.md Section 3 > Product Hunt');

T('task_MCL_16',
  'Launch on Product Hunt (Saturday 12:01 AM PT)',
  'Execute the Product Hunt launch.\n\n1. Publish listing at 12:01 AM PT\n2. Post maker first comment immediately\n3. Tweet the PH link at 6 AM EST\n4. Share in Discord communities\n5. Monitor and respond to every PH comment throughout the day\n6. DO NOT ask for upvotes (violates PH rules)\n7. Engage genuinely with other products launching same day\n8. Post evening update tweet with PH metrics',
  'important', 'urgent', m4Id, 'me', '2026-03-07', 240,
  [
    { id: 'sub_16a', title: 'Publish listing at 12:01 AM PT', done: false },
    { id: 'sub_16b', title: 'Post maker first comment immediately', done: false },
    { id: 'sub_16c', title: 'Tweet PH link at 6 AM EST', done: false },
    { id: 'sub_16d', title: 'Respond to every PH comment all day', done: false },
  ],
  ['task_MCL_15'], null, ['product-hunt']);

// ============================================================
// MILESTONE 5: POST-LAUNCH MOMENTUM (Mar 4-24)
// ============================================================

T('task_MCL_17',
  'Write Week 1 retrospective Twitter thread',
  'Write a build-in-public thread covering Week 1 metrics and learnings. Include: GitHub stars, forks, clones, issues opened, PRs submitted, Reddit upvotes (per sub), Twitter impressions, top feedback quotes, biggest surprise, what you would do differently. The dev community loves transparent retrospectives.',
  'important', 'not-urgent', m5Id, 'me', '2026-03-04', 30,
  [], null, null, ['twitter', 'build-in-public', 'retrospective']);

T('task_MCL_18',
  'Write Dev.to Article #2: Week 1 retrospective with metrics',
  'Write and publish: "One Week of Open-Sourcing an AI-Native Task Manager: Numbers, Surprises, and Lessons".\n\nInclude full metrics dashboard, top feedback, community reactions, which channels drove the most GitHub stars, what worked, what did not, and plans for Month 2. Transparent retrospectives perform extremely well on Dev.to and get long-tail SEO traffic.\n\nSee research/mission-control-launch-plan.md Section 4.5 for article template.',
  'important', 'not-urgent', m5Id, 'marketer', '2026-03-07', 120,
  [
    { id: 'sub_18a', title: 'Compile all metrics from launch week', done: false },
    { id: 'sub_18b', title: 'Write article with honest metrics and learnings', done: false },
    { id: 'sub_18c', title: 'Publish on Dev.to', done: false },
    { id: 'sub_18d', title: 'Share on Twitter', done: false },
  ],
  null, null, ['devto', 'content-marketing', 'retrospective']);

T('task_MCL_19',
  'Ship 1-2 quick-win features from community feedback',
  'Review all GitHub issues, Reddit comments, HN feedback, and PH comments from launch week. Identify the most-requested or highest-impact small features. Ship 1-2 quickly.\n\nThis demonstrates active maintenance and responsiveness \u2014 the #1 predictor of open-source community trust. A fast feature ship impresses as much as a fast bug fix.\n\nIdeal candidates: small UI improvements, new keyboard shortcuts, documentation improvements, additional slash commands.',
  'important', 'not-urgent', m5Id, 'developer', '2026-03-10', 180,
  [
    { id: 'sub_19a', title: 'Review all launch week feedback', done: false },
    { id: 'sub_19b', title: 'Identify top 2-3 quick-win features', done: false },
    { id: 'sub_19c', title: 'Implement and ship feature #1', done: false },
    { id: 'sub_19d', title: 'Implement and ship feature #2', done: false },
    { id: 'sub_19e', title: 'Announce shipped features on Twitter + GitHub', done: false },
  ],
  null, null, ['feature', 'community']);

T('task_MCL_20',
  'Post on r/SoloFounders with workflow breakdown',
  'Post to r/SoloFounders.\n\nTitle: "How I manage 5 AI agents across 3 projects using an Eisenhower matrix \u2014 open-source tool + workflow breakdown"\n\nFocus on the solo entrepreneur angle: AI agents are your team, Eisenhower matrix decides what to delegate, inbox keeps you informed without micromanaging, daemon runs your team on autopilot. Include your real dashboard screenshot. This sub loves operational transparency and behind-the-scenes content.',
  'not-important', 'not-urgent', m5Id, 'me', '2026-03-10', 20,
  [], null, null, ['reddit', 'social-media']);

T('task_MCL_21',
  'Thank early contributors and stargazers publicly',
  'Write a Twitter thread thanking early contributors and engaged community members. Screenshot any merged PRs and credit the authors by name/handle. Add a Contributors section to the README with avatar links (use GitHub contributor graph). Personally DM 5-10 developers who engaged most during launch \u2014 they are potential core contributors.',
  'important', 'not-urgent', m5Id, 'me', '2026-03-10', 30,
  [
    { id: 'sub_21a', title: 'Write thank-you Twitter thread', done: false },
    { id: 'sub_21b', title: 'Add Contributors section to README with avatars', done: false },
    { id: 'sub_21c', title: 'DM top 5-10 engaged developers', done: false },
  ],
  null, null, ['community', 'twitter']);

T('task_MCL_22',
  'Submit to curated awesome-lists and directories',
  'Submit Mission Control to relevant curated lists for ongoing discoverability:\n\n1. awesome-nextjs (GitHub)\n2. awesome-self-hosted (GitHub)\n3. awesome-react (GitHub)\n4. Console.dev (OSS discovery newsletter \u2014 submit for featured tool review)\n\nEach submission: follow the list contributing guidelines, write a short description matching the list tone. These provide long-tail discoverability that compounds over months.',
  'not-important', 'not-urgent', m5Id, 'marketer', '2026-03-14', 45,
  [
    { id: 'sub_22a', title: 'Submit to awesome-nextjs', done: false },
    { id: 'sub_22b', title: 'Submit to awesome-self-hosted', done: false },
    { id: 'sub_22c', title: 'Submit to awesome-react', done: false },
    { id: 'sub_22d', title: 'Submit to Console.dev newsletter', done: false },
  ],
  null, null, ['seo', 'discoverability']);

T('task_MCL_23',
  'Create public roadmap based on community feedback',
  'Create a public ROADMAP.md or GitHub Projects board based on accumulated feedback from all launch channels. Organize features into: Next Release, Short-Term (1-3 months), Medium-Term (3-6 months), Long-Term. Tag features with "help wanted" to invite contributions. Share the roadmap on Twitter and link it in the README.',
  'important', 'not-urgent', m5Id, 'developer', '2026-03-14', 60,
  [
    { id: 'sub_23a', title: 'Compile all feature requests from launch channels', done: false },
    { id: 'sub_23b', title: 'Prioritize into timeframe buckets', done: false },
    { id: 'sub_23c', title: 'Create ROADMAP.md or GitHub Projects board', done: false },
    { id: 'sub_23d', title: 'Link roadmap in README', done: false },
  ],
  null, null, ['roadmap', 'community']);

T('task_MCL_24',
  'Begin planning cloud sync feature (first revenue feature)',
  'Start technical planning for cloud sync \u2014 the first feature that enables the Pro tier ($15/mo). Evaluate backend options: Supabase, Turso (SQLite edge), PlanetScale, or self-hosted PostgreSQL. Design the migration path from local JSON to database. Plan the hosted daemon (always-on agent execution without local process).\n\nThis is the bridge from free open-source to paid product. Revenue model details in research/mission-control-viability-and-launch.md Sections 2-3.',
  'important', 'not-urgent', m5Id, 'developer', '2026-03-17', 120,
  [
    { id: 'sub_24a', title: 'Evaluate database options (Supabase, Turso, PlanetScale)', done: false },
    { id: 'sub_24b', title: 'Design JSON-to-database migration path', done: false },
    { id: 'sub_24c', title: 'Plan hosted daemon architecture', done: false },
    { id: 'sub_24d', title: 'Estimate effort and timeline', done: false },
  ],
  null, ['business-analyst'], ['cloud-sync', 'revenue', 'planning'],
  'Revenue model: research/mission-control-viability-and-launch.md Sections 2-3');

T('task_MCL_25',
  'Write 30-day launch retrospective with full metrics',
  'Write a comprehensive 30-day retrospective covering all launch metrics vs targets. Publish on Dev.to and as a Twitter thread.\n\nMetrics to compare against targets:\n- GitHub: stars, forks, clones, issues, PRs, contributors\n- Social: HN points, Reddit upvotes (per sub), PH upvotes, Twitter impressions/followers\n- Content: Dev.to article views, Discord members\n\nTargets are in research/mission-control-marketing-plan.md Section 8. Success tiers in research/mission-control-launch-plan.md Section 7.4.\n\nIdentify which channels drove the most impact. Plan Month 2 strategy based on learnings.',
  'important', 'not-urgent', m5Id, 'marketer', '2026-03-24', 120,
  [
    { id: 'sub_25a', title: 'Compile all 30-day metrics', done: false },
    { id: 'sub_25b', title: 'Compare against targets from marketing plan', done: false },
    { id: 'sub_25c', title: 'Write retrospective article', done: false },
    { id: 'sub_25d', title: 'Publish on Dev.to', done: false },
    { id: 'sub_25e', title: 'Post summary Twitter thread', done: false },
  ],
  null, null, ['retrospective', 'content-marketing', 'metrics'],
  'Targets: research/mission-control-marketing-plan.md Section 8\nSuccess tiers: research/mission-control-launch-plan.md Section 7.4');

// === LINK TASKS TO GOALS ===
const mainGoal = goals.goals.find(g => g.id === goalMainId);
mainGoal.tasks = allTaskIds;
for (const [mId, tIds] of Object.entries(milestoneTaskMap)) {
  const m = goals.goals.find(g => g.id === mId);
  if (m) m.tasks = tIds;
}

// === ACTIVITY LOG ===
activity.events.push({
  id: 'evt_MCL_proj_created',
  type: 'task_created',
  actor: 'system',
  taskId: null,
  summary: 'Created project: Mission Control \u2014 Open-Source Launch (25 tasks, 5 milestones)',
  details: 'Full launch sequence: pre-launch prep (Feb 24-25), Reddit/Twitter wave (Feb 25-28), HN/Dev.to (Feb 27 - Mar 3), Product Hunt (Mar 4-7), 30-day momentum (Mar 4-24). Agent assignments: me (16 tasks), developer (5), marketer (4).',
  timestamp: now,
});

// === INBOX DELEGATION MESSAGES ===
inbox.messages.push({
  id: 'msg_MCL_dev',
  from: 'system',
  to: 'developer',
  type: 'delegation',
  taskId: null,
  subject: 'Mission Control Launch: 5 tasks assigned to you',
  body: 'You have been assigned 5 tasks for the Mission Control open-source launch project:\n\n1. Create 12 GitHub issues from templates (due Feb 24)\n2. Fix any bugs reported during launch week (ongoing, due Mar 3)\n3. Ship 1-2 quick-win features from community feedback (due Mar 10)\n4. Create public roadmap (due Mar 14)\n5. Begin planning cloud sync feature (due Mar 17)\n\nCheck your task queue for full details and due dates. Priority is on the GitHub issues (today) and launch week bug fixes.',
  status: 'unread',
  createdAt: now,
  readAt: null,
});

inbox.messages.push({
  id: 'msg_MCL_mkt',
  from: 'system',
  to: 'marketer',
  type: 'delegation',
  taskId: null,
  subject: 'Mission Control Launch: 4 tasks assigned to you',
  body: 'You have been assigned 4 tasks for the Mission Control open-source launch project:\n\n1. Prepare Product Hunt listing (due Mar 4)\n2. Write Dev.to Article #2: Week 1 retrospective (due Mar 7)\n3. Submit to curated awesome-lists and directories (due Mar 14)\n4. Write 30-day launch retrospective with full metrics (due Mar 24)\n\nCheck your task queue for full details and due dates.',
  status: 'unread',
  createdAt: now,
  readAt: null,
});

// === WRITE ALL FILES ===
write('projects.json', projects);
write('goals.json', goals);
write('tasks.json', tasks);
write('activity-log.json', activity);
write('inbox.json', inbox);

console.log('=== SUCCESS ===');
console.log('Created: 1 project, 6 goals (1 long-term + 5 milestones), 25 tasks');
console.log('');
console.log('Milestone 1 (Pre-Launch Prep):     5 tasks, due Feb 24-25');
console.log('Milestone 2 (Reddit + Twitter):     6 tasks, due Feb 25-28');
console.log('Milestone 3 (HN + Dev.to):          3 tasks, due Feb 27 - Mar 3');
console.log('Milestone 4 (Product Hunt):          2 tasks, due Mar 4-7');
console.log('Milestone 5 (Post-Launch Momentum):  9 tasks, due Mar 4-24');
console.log('');
console.log('Agent assignments: me=16, developer=5, marketer=4');
console.log('Inbox: 2 delegation messages sent (developer + marketer)');
console.log('Activity: 1 project creation event logged');
