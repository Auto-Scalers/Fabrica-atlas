const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// 1. Reset IFA tasks 001-006 from "in-progress" to "not-started"
const tasksFile = path.join(dataDir, 'tasks.json');
const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
const ifaTaskIds = ['task_IFA_001', 'task_IFA_002', 'task_IFA_003', 'task_IFA_004', 'task_IFA_005', 'task_IFA_006'];
let tasksReset = 0;
tasks.tasks.forEach(t => {
  if (ifaTaskIds.includes(t.id) && t.kanban === 'in-progress') {
    t.kanban = 'not-started';
    t.attempts = 0;
    tasksReset++;
    console.log('  Reset task:', t.id, t.title.substring(0, 50));
  }
});
fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
console.log('Tasks reset:', tasksReset);

// 2. Dismiss all pending decisions
const decisionsFile = path.join(dataDir, 'decisions.json');
const decisions = JSON.parse(fs.readFileSync(decisionsFile, 'utf-8'));
let dismissed = 0;
decisions.decisions.forEach(d => {
  if (d.status === 'pending') {
    d.status = 'dismissed';
    d.answer = 'Auto-dismissed: stale auth errors cleared';
    d.answeredAt = new Date().toISOString();
    dismissed++;
    console.log('  Dismissed decision:', d.id, 'for', d.taskId);
  }
});
fs.writeFileSync(decisionsFile, JSON.stringify(decisions, null, 2));
console.log('Decisions dismissed:', dismissed);

// 3. Clear all failed runs from active-runs.json
const runsFile = path.join(dataDir, 'active-runs.json');
const runs = JSON.parse(fs.readFileSync(runsFile, 'utf-8'));
const oldCount = runs.runs.length;
runs.runs = runs.runs.filter(r => r.status !== 'failed');
fs.writeFileSync(runsFile, JSON.stringify(runs, null, 2));
console.log('Cleared', oldCount - runs.runs.length, 'failed runs (kept', runs.runs.length, 'active)');

console.log('\nAll fixes applied successfully!');
