"use client";

export const dynamic = "force-dynamic";

import {
  Rocket,
  CheckSquare,
  Target,
  Lightbulb,
  Bot,
  Radio,
  Shield,
  Database,
  Keyboard,
  Cloud,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

const sections = [
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "tasks", label: "Task Management", icon: CheckSquare },
  { id: "projects", label: "Projects & Goals", icon: Target },
  { id: "brain-dump", label: "Brain Dump", icon: Lightbulb },
  { id: "agents", label: "AI Agents", icon: Bot },
  { id: "field-ops", label: "Field Ops", icon: Radio },
  { id: "vault-security", label: "Vault Security", icon: Shield },
  { id: "data-management", label: "Data Management", icon: Database },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
  { id: "cloud", label: "Mission Control Cloud", icon: Cloud },
] as const;

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Guide" }]} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guide</h1>
        <p className="text-muted-foreground mt-1">
          Everything you need to know about Mission Control.
        </p>
      </div>

      {/* Table of Contents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Table of Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
            {sections.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card id="getting-started">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li><strong className="text-foreground">Local-first architecture</strong> -- all data stored as JSON files on your machine, no external databases</li>
            <li><strong className="text-foreground">AI-powered task management</strong> -- AI agents read and write data files directly, enabling autonomous task execution</li>
            <li><strong className="text-foreground">Solo entrepreneur focus</strong> -- Eisenhower matrix prioritization, Kanban workflow, goal hierarchy, and brain dump capture</li>
            <li><strong className="text-foreground">Multi-agent orchestration</strong> -- delegate work to specialized AI agents (Researcher, Developer, Marketer, Business Analyst)</li>
            <li><strong className="text-foreground">Field Ops</strong> -- connect to external platforms and automate real-world actions with configurable autonomy levels</li>
          </ul>
        </CardContent>
      </Card>

      {/* Task Management */}
      <Card id="tasks">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Task Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1.5">Eisenhower Matrix (Priority Matrix)</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">DO</strong> (important + urgent) -- work on immediately</li>
              <li><strong className="text-foreground">SCHEDULE</strong> (important + not urgent) -- block time, protect from neglect</li>
              <li><strong className="text-foreground">DELEGATE</strong> (not important + urgent) -- assign to an AI agent</li>
              <li><strong className="text-foreground">ELIMINATE</strong> (not important + not urgent) -- drop or defer</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Status Board (Kanban)</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Three columns: <strong className="text-foreground">Not Started</strong>, <strong className="text-foreground">In Progress</strong>, <strong className="text-foreground">Done</strong></li>
              <li>Drag and drop cards between columns to update status</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Task Features</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Subtasks</strong> -- break work into checkable sub-items</li>
              <li><strong className="text-foreground">Acceptance criteria</strong> -- define what &ldquo;done&rdquo; looks like</li>
              <li><strong className="text-foreground">Dependencies</strong> -- blockedBy links prevent work starting until predecessors complete</li>
              <li><strong className="text-foreground">Daily actions</strong> -- date-stamped micro-steps for incremental progress</li>
              <li><strong className="text-foreground">Time estimates</strong> -- estimated and actual minutes for tracking effort</li>
              <li><strong className="text-foreground">Tags</strong> -- freeform labels for filtering and grouping</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Projects & Goals */}
      <Card id="projects">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Projects & Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1.5">Ventures (Projects)</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Each venture groups related tasks, goals, and team members</li>
              <li>Status lifecycle: <strong className="text-foreground">Active</strong> &rarr; <strong className="text-foreground">Paused</strong> &rarr; <strong className="text-foreground">Completed</strong> &rarr; <strong className="text-foreground">Archived</strong></li>
              <li>Color-coded for visual identification across the UI</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Goals & Milestones</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Long-term goals</strong> -- strategic objectives with quarterly timeframes</li>
              <li><strong className="text-foreground">Milestones</strong> -- medium-term checkpoints linked to a parent goal</li>
              <li>Tasks link to milestones via milestoneId for progress tracking</li>
              <li>Objectives page shows goal hierarchy with completion percentages</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Brain Dump */}
      <Card id="brain-dump">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Brain Dump
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li><strong className="text-foreground">Quick capture</strong> -- press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+K</kbd> to open command palette, or use the brain dump capture bar</li>
            <li><strong className="text-foreground">Triage workflow</strong> -- unprocessed entries appear in the brain dump view for sorting</li>
            <li><strong className="text-foreground">Convert to task</strong> -- promote an idea into a full task with priority, project, and assignment</li>
            <li><strong className="text-foreground">Archive</strong> -- mark as processed without creating a task</li>
            <li>Keep entries short; elaboration goes in the task description after conversion</li>
          </ul>
        </CardContent>
      </Card>

      {/* AI Agents */}
      <Card id="agents">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1.5">Built-in Agents</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">You (me)</strong> -- decisions, approvals, creative direction</li>
              <li><strong className="text-foreground">Researcher</strong> -- market research, competitive analysis, evaluation</li>
              <li><strong className="text-foreground">Developer</strong> -- code, bug fixes, testing, deployment</li>
              <li><strong className="text-foreground">Marketer</strong> -- copy, growth strategy, content, SEO</li>
              <li><strong className="text-foreground">Business Analyst</strong> -- strategy, planning, prioritization, financials</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Custom Agents & Skills</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Create custom agents via the Crew page with unique instructions and capabilities</li>
              <li><strong className="text-foreground">Skills Library</strong> -- reusable skill definitions injected into agent prompts when linked</li>
              <li>Skills are managed through the Skills page and stored in skills-library.json</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Delegation & Orchestration</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Assign lead</strong> -- set assignedTo on a task to delegate</li>
              <li><strong className="text-foreground">Collaborators</strong> -- add additional agents as team members on a task</li>
              <li><strong className="text-foreground">Inbox messages</strong> -- agents communicate via delegation, report, question, and update messages</li>
              <li><strong className="text-foreground">Orchestration</strong> -- spawn sub-agents for pending tasks, coordinate multi-agent workflows</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Field Ops */}
      <Card id="field-ops">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Field Ops
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1.5">Autonomy Levels</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Manual Approval</strong> -- every action requires your explicit approval before execution</li>
              <li><strong className="text-foreground">Supervised</strong> -- agents execute within guardrails, flagging edge cases for review</li>
              <li><strong className="text-foreground">Full Autonomy</strong> -- agents execute freely within configured limits</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Missions</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Grouped containers for related field tasks</li>
              <li>Track overall mission progress, budget, and status</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Field Task Lifecycle</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Draft</strong> &rarr; <strong className="text-foreground">Pending Approval</strong> &rarr; <strong className="text-foreground">Approved</strong> &rarr; <strong className="text-foreground">Executing</strong> &rarr; <strong className="text-foreground">Completed</strong> / <strong className="text-foreground">Failed</strong></li>
              <li>Each transition can require approval depending on the autonomy level</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Services & Approvals</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Services catalog</strong> -- connect external platforms (APIs, tools, services)</li>
              <li><strong className="text-foreground">Approval queue</strong> -- review and approve/reject pending field tasks</li>
              <li><strong className="text-foreground">Financial overview</strong> -- track balances, spend per mission, and budget limits</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Vault Security */}
      <Card id="vault-security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Vault Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1.5">Encryption</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Master password</strong> -- hashed with scrypt (N=16384, r=8, p=1)</li>
              <li><strong className="text-foreground">Credential encryption</strong> -- AES-256-GCM per credential</li>
              <li><strong className="text-foreground">Key derivation</strong> -- scrypt KDF with unique 256-bit salt per credential</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Session & Rate Limiting</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Session</strong> -- cached in server memory for 30 minutes, never written to disk</li>
              <li><strong className="text-foreground">Rate limiting</strong> -- 3 soft / 10 hard limit on failed attempts, 15-minute lockout</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5">Audit & Storage</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Audit trail</strong> -- all vault access is logged</li>
              <li><strong className="text-foreground">File location</strong> -- <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">data/field-ops/.credentials.json</code></li>
              <li className="text-amber-500 font-medium">WARNING: No recovery if master password is forgotten</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card id="data-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li><strong className="text-foreground">Checkpoints</strong> -- save a snapshot of all data files, restore from any checkpoint</li>
            <li><strong className="text-foreground">Export</strong> -- download all data as a JSON bundle for backup or migration</li>
            <li><strong className="text-foreground">Import</strong> -- restore from a previously exported JSON bundle</li>
            <li><strong className="text-foreground">New Workspace</strong> -- reset all data files to empty state (creates a checkpoint first)</li>
            <li><strong className="text-foreground">Demo Data</strong> -- load sample data to explore the interface</li>
          </ul>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card id="shortcuts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+K</kbd> -- open the command palette (search, navigation, quick brain dump capture)
            </li>
            <li>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">?</kbd> -- show keyboard shortcuts overlay
            </li>
            <li>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+Click</kbd> -- multi-select tasks on the Status Board
            </li>
            <li>
              Brain dump capture bar is always accessible at the top of the Brain Dump page
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Mission Control Cloud */}
      <Card id="cloud">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Mission Control Cloud
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Want always-on daemon execution, automatic backups, and access from anywhere?
          </p>
          <div>
            <h3 className="font-semibold mb-1.5">Coming Soon</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Always-on agents</strong> &mdash; your daemon runs 24/7 in the cloud, no laptop required</li>
              <li><strong className="text-foreground">Automatic backups</strong> &mdash; checkpoints saved to cloud storage automatically</li>
              <li><strong className="text-foreground">Access anywhere</strong> &mdash; real domain, HTTPS, mobile-friendly access</li>
              <li><strong className="text-foreground">Auto-updates</strong> &mdash; always on the latest version without manual upgrades</li>
            </ul>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">
              Star the repo to stay updated &mdash; Mission Control Cloud is coming soon.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The self-hosted version will always remain free and open source.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
