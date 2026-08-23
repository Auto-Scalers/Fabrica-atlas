const fs = require('fs');
const p = JSON.parse(fs.readFileSync('data/projects.json','utf-8'));
const g = JSON.parse(fs.readFileSync('data/goals.json','utf-8'));
const t = JSON.parse(fs.readFileSync('data/tasks.json','utf-8'));
const b = JSON.parse(fs.readFileSync('data/brain-dump.json','utf-8'));

const proj = p.projects.find(x => x.id === 'proj_InfantFeedingApp');
console.log('Project:', proj ? proj.name : 'NOT FOUND');
console.log('  Team:', proj && proj.teamMembers.join(', '));

const ifaGoals = g.goals.filter(x => x.projectId === 'proj_InfantFeedingApp');
console.log('Goals:', ifaGoals.length);
ifaGoals.forEach(function(gl) {
  console.log('  -', gl.id, ':', gl.title.substring(0, 60));
});

const ifaTasks = t.tasks.filter(x => x.projectId === 'proj_InfantFeedingApp');
console.log('Tasks:', ifaTasks.length);
ifaTasks.forEach(function(tk) {
  var sc = tk.subtasks ? tk.subtasks.length : 0;
  var bl = tk.blockedBy ? tk.blockedBy.length : 0;
  console.log('  -', tk.id, '|', tk.assignedTo, '|', sc, 'subtasks |', bl, 'blockers |', tk.kanban);
});

const bd = b.entries.find(x => x.id === 'bd_dNSQo28mjIhm');
console.log('Brain dump:', bd.processed ? 'PROCESSED' : 'not processed', '| convertedTo:', bd.convertedTo);

const taskIds = new Set(ifaTasks.map(function(tk) { return tk.id; }));
var brokenDeps = 0;
ifaTasks.forEach(function(tk) {
  (tk.blockedBy || []).forEach(function(dep) {
    if (!taskIds.has(dep)) {
      console.log('  BROKEN DEP:', tk.id, '->', dep);
      brokenDeps++;
    }
  });
});
console.log('Dependency integrity:', brokenDeps === 0 ? 'ALL OK' : brokenDeps + ' broken');
