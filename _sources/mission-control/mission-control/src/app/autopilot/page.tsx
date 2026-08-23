"use client";

import { useState } from "react";
import Link from "next/link";
import { useDaemon } from "@/hooks/use-daemon";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tip } from "@/components/ui/tip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Rocket, Square, Clock, CheckCircle2, XCircle, Timer, RefreshCw, Zap, AlertTriangle, Pencil, Save, X, Plus, Trash2, Lock, Eye, EyeOff } from "lucide-react";
import { showError } from "@/lib/toast";

function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const FREQUENCY_PRESETS: { label: string; cron: string }[] = [
  { label: "Every day at 7:00 AM", cron: "0 7 * * *" },
  { label: "Every day at 9:00 AM", cron: "0 9 * * *" },
  { label: "Every day at noon", cron: "0 12 * * *" },
  { label: "Every day at 5:00 PM", cron: "0 17 * * *" },
  { label: "Every day at 9:00 PM", cron: "0 21 * * *" },
  { label: "Weekdays at 7:00 AM", cron: "0 7 * * 1-5" },
  { label: "Weekdays at 9:00 AM", cron: "0 9 * * 1-5" },
  { label: "Weekdays at noon", cron: "0 12 * * 1-5" },
  { label: "Weekdays at 5:00 PM", cron: "0 17 * * 1-5" },
  { label: "Mondays at 9:00 AM", cron: "0 9 * * 1" },
  { label: "Fridays at 5:00 PM", cron: "0 17 * * 5" },
  { label: "Sundays at 7:00 PM", cron: "0 19 * * 0" },
];

const AVAILABLE_COMMANDS = [
  "standup", "daily-plan", "weekly-review", "brainstorm",
  "research", "plan-feature", "ship-feature", "pick-up-work",
  "report", "orchestrate",
];

function cronToHuman(cron: string): string {
  const preset = FREQUENCY_PRESETS.find((p) => p.cron === cron);
  return preset ? preset.label : cron;
}

export default function AutopilotPage() {
  const { status, config, isRunning, isLoading, error, start, stop, updateConfig } = useDaemon();

  // Daemon start password dialog
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [startPassword, setStartPassword] = useState("");
  const [showStartPw, setShowStartPw] = useState(false);
  const [startError, setStartError] = useState("");
  const [starting, setStarting] = useState(false);

  async function handleConfirmStart() {
    if (!startPassword.trim()) {
      setStartError("Master password is required.");
      return;
    }
    setStarting(true);
    setStartError("");
    try {
      await start(startPassword.trim());
      setShowStartDialog(false);
      setStartPassword("");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start daemon");
    } finally {
      setStarting(false);
    }
  }

  // Config editing state
  const [editingConfig, setEditingConfig] = useState(false);
  const [maxParallelAgents, setMaxParallelAgents] = useState(1);
  const [maxTurns, setMaxTurns] = useState(10);
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [retries, setRetries] = useState(1);
  const [pollingInterval, setPollingInterval] = useState(5);

  function startEditing() {
    setMaxParallelAgents(config.concurrency.maxParallelAgents);
    setMaxTurns(config.execution.maxTurns);
    setTimeoutMinutes(config.execution.timeoutMinutes);
    setRetries(config.execution.retries);
    setPollingInterval(config.polling.intervalMinutes);
    setEditingConfig(true);
  }

  async function saveConfig() {
    await updateConfig({
      concurrency: { maxParallelAgents },
      execution: {
        maxTurns,
        timeoutMinutes,
        retries,
        retryDelayMinutes: config.execution.retryDelayMinutes,
        skipPermissions: config.execution.skipPermissions,
        allowedTools: config.execution.allowedTools,
        agentTeams: config.execution.agentTeams,
        claudeBinaryPath: config.execution.claudeBinaryPath,
        maxTaskContinuations: config.execution.maxTaskContinuations,
      },
      polling: { enabled: config.polling.enabled, intervalMinutes: pollingInterval },
    });
    setEditingConfig(false);
  }

  async function toggleSchedule(name: string) {
    const entry = config.schedule[name];
    if (!entry) return;
    await updateConfig({
      schedule: {
        ...config.schedule,
        [name]: { ...entry, enabled: !entry.enabled },
      },
    });
  }

  // Schedule editing state
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editCron, setEditCron] = useState("");
  const [editCommand, setEditCommand] = useState("");

  function startEditingSchedule(name: string) {
    const entry = config.schedule[name];
    if (!entry) return;
    setEditCron(entry.cron);
    setEditCommand(entry.command);
    setEditingSchedule(name);
  }

  function cancelEditingSchedule() {
    setEditingSchedule(null);
    setEditCron("");
    setEditCommand("");
  }

  async function saveScheduleEntry(name: string) {
    await updateConfig({
      schedule: {
        ...config.schedule,
        [name]: { ...config.schedule[name], cron: editCron, command: editCommand },
      },
    });
    setEditingSchedule(null);
  }

  async function addScheduleEntry() {
    const newName = `schedule_${Date.now()}`;
    await updateConfig({
      schedule: {
        ...config.schedule,
        [newName]: { enabled: true, cron: "0 9 * * *", command: "daily-plan" },
      },
    });
  }

  async function removeScheduleEntry(name: string) {
    const updated = { ...config.schedule };
    delete updated[name];
    await updateConfig({ schedule: updated });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Autopilot" }]} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Autopilot" }]} />
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const completionRate = status.stats.tasksDispatched > 0
    ? Math.round((status.stats.tasksCompleted / status.stats.tasksDispatched) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Autopilot" }]} />

      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Autopilot</h2>
          <Badge variant={isRunning ? "default" : "secondary"} className={isRunning ? "bg-green-600" : ""}>
            {isRunning ? "Running" : "Stopped"}
          </Badge>
          {isRunning && status.pid && (
            <span className="text-sm text-muted-foreground">PID: {status.pid}</span>
          )}
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <Tip content="Stop all autonomous processing">
              <Button variant="destructive" size="sm" onClick={stop}>
                <Square className="h-4 w-4 mr-2" />
                Disengage Autopilot
              </Button>
            </Tip>
          ) : (
            <Tip content="Start autonomous agent processing">
              <Button size="sm" onClick={() => {
                setStartPassword("");
                setStartError("");
                setShowStartPw(false);
                setShowStartDialog(true);
              }}>
                <Rocket className="h-4 w-4 mr-2" />
                Launch Autopilot
              </Button>
            </Tip>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        The Autopilot daemon runs in the background, automatically polling for pending tasks and dispatching them to AI agents.
        It manages concurrency limits, retries failed tasks, and runs scheduled commands (standups, daily plans, weekly reviews) on cron schedules.
        Start it once and your task queue runs hands-free.
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uptime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isRunning ? formatDuration(status.stats.uptimeMinutes) : "\u2014"}
            </div>
            {status.startedAt && isRunning && (
              <p className="text-xs text-muted-foreground mt-1">
                Since {new Date(status.startedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasks Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{status.stats.tasksCompleted}</span>
              <span className="text-sm text-muted-foreground">/ {status.stats.tasksDispatched} dispatched</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completionRate}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{status.activeSessions.length}</span>
              <span className="text-sm text-muted-foreground">/ {config.concurrency.maxParallelAgents} max</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.stats.tasksFailed}</div>
            {status.lastPollAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last poll: {formatRelativeTime(status.lastPollAt)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${status.stats.totalCostUsd?.toFixed(2) ?? "0.00"}
            </div>
            {status.stats.tasksCompleted > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ~${(status.stats.totalCostUsd / status.stats.tasksCompleted).toFixed(2)} per task
              </p>
            )}
            {(status.stats.totalInputTokens > 0 || status.stats.totalOutputTokens > 0) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {((status.stats.totalInputTokens + status.stats.totalOutputTokens) / 1000).toFixed(0)}k tokens
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      {status.activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium">
                        {session.command === "task" ? `Task: ${session.taskId}` : `/${session.command}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Agent: {session.agentId} &middot; PID: {session.pid}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatRelativeTime(session.startedAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Schedule
              </CardTitle>
              <CardDescription className="mt-1.5">
                Polling every {config.polling.intervalMinutes} minutes
                {!config.polling.enabled && " (disabled)"}
              </CardDescription>
            </div>
            <Tip content="Add a new scheduled skill">
              <Button variant="outline" size="sm" onClick={addScheduleEntry} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </Tip>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(config.schedule).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No scheduled skills yet. Click &ldquo;Add&rdquo; to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(config.schedule).map(([name, schedule]) => (
                <div key={name} className="rounded-lg border p-3">
                  {editingSchedule === name ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Skill Command</p>
                          <Select value={editCommand} onValueChange={setEditCommand}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_COMMANDS.map((cmd) => (
                                <SelectItem key={cmd} value={cmd}>/{cmd}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Frequency</p>
                          <Select value={editCron} onValueChange={setEditCron}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCY_PRESETS.map((preset) => (
                                <SelectItem key={preset.cron} value={preset.cron}>{preset.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Tip content="Discard changes">
                          <Button variant="ghost" size="sm" onClick={cancelEditingSchedule}>
                            <X className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                        </Tip>
                        <Tip content="Save schedule changes">
                          <Button size="sm" onClick={() => saveScheduleEntry(name)}>
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Save
                          </Button>
                        </Tip>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSchedule(name)}
                          className="cursor-pointer"
                          title={schedule.enabled ? "Click to disable" : "Click to enable"}
                        >
                          <Badge
                            variant={schedule.enabled ? "default" : "outline"}
                            className="text-xs hover:opacity-80 transition-opacity"
                          >
                            {schedule.enabled ? "ON" : "OFF"}
                          </Badge>
                        </button>
                        <div>
                          <p className="font-medium">/{schedule.command}</p>
                          <p className="text-xs text-muted-foreground">{cronToHuman(schedule.cron)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status.nextScheduledRuns[schedule.command] && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            Next: {new Date(status.nextScheduledRuns[schedule.command]).toLocaleString()}
                          </span>
                        )}
                        <Tip content="Edit schedule entry">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => startEditingSchedule(name)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Tip>
                        <Tip content="Remove schedule entry">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => removeScheduleEntry(name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </Tip>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editable Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Configuration
            </CardTitle>
            {!editingConfig && (
              <Tip content="Edit configuration">
                <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1.5 text-muted-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Tip>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingConfig ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">Max Parallel Agents</p>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={maxParallelAgents}
                    onChange={(e) => setMaxParallelAgents(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">Max Turns per Task</p>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={maxTurns}
                    onChange={(e) => setMaxTurns(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">Timeout (minutes)</p>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={timeoutMinutes}
                    onChange={(e) => setTimeoutMinutes(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">Retries</p>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={retries}
                    onChange={(e) => setRetries(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">Polling Interval (min)</p>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={pollingInterval}
                    onChange={(e) => setPollingInterval(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Tip content="Discard changes">
                  <Button variant="ghost" size="sm" onClick={() => setEditingConfig(false)}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                </Tip>
                <Tip content="Save configuration changes">
                  <Button size="sm" onClick={saveConfig}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                </Tip>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Max Parallel Agents</p>
                <p className="font-bold">{config.concurrency.maxParallelAgents}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Turns per Task</p>
                <p className="font-bold">{config.execution.maxTurns}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Timeout</p>
                <p className="font-bold">{config.execution.timeoutMinutes} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retries</p>
                <p className="font-bold">{config.execution.retries}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Polling Interval</p>
                <p className="font-bold">{config.polling.intervalMinutes} min</p>
              </div>
            </div>
          )}
          {config.execution.skipPermissions && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                <span><strong>skipPermissions</strong> is enabled &mdash; Claude Code bypasses all permission prompts</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground underline decoration-dotted cursor-help ml-auto shrink-0">
                      Why can&apos;t I edit this?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px]">
                    <p className="text-xs">For safety, skipPermissions can only be changed by editing <code className="text-[10px]">data/daemon-config.json</code> directly.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            {config.execution.allowedTools.length > 0 && !config.execution.skipPermissions && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm">
                <Zap className="h-4 w-4 text-blue-500 shrink-0" />
                <span>
                  <strong>Allowed tools:</strong>{" "}
                  {config.execution.allowedTools.map((tool) => (
                    <Badge key={tool} variant="outline" className="text-xs mr-1">
                      {tool}
                    </Badge>
                  ))}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground underline decoration-dotted cursor-help ml-auto shrink-0">
                      What is this?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px]">
                    <p className="text-xs">These tools are pre-approved for agents via <code className="text-[10px]">--allowedTools</code>. Edit <code className="text-[10px]">data/daemon-config.json</code> to change.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Recent History */}
      {status.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent History</CardTitle>
            <CardDescription>Last {Math.min(status.history.length, 20)} sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.history.slice(0, 20).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {entry.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : entry.status === "timeout" ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {entry.command === "task" ? `Task: ${entry.taskId}` : `/${entry.command}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Agent: {entry.agentId} &middot; {formatDuration(entry.durationMinutes)}
                        {entry.costUsd != null && entry.costUsd > 0 && ` · $${entry.costUsd.toFixed(4)}`}
                        {entry.error && ` \u2014 ${entry.error.slice(0, 80)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={entry.status === "completed" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {entry.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.completedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Daemon Start Password Dialog ═══ */}
      <Dialog open={showStartDialog} onOpenChange={(open) => {
        if (!open) {
          setShowStartDialog(false);
          setStartPassword("");
          setStartError("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Launch Autopilot
            </DialogTitle>
            <DialogDescription>
              Starting the daemon enables autonomous task execution. Enter your master password to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                The daemon will automatically poll for tasks and dispatch them to AI agents.
                Make sure your autonomy level and safety limits are configured before launching.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daemon-start-pw">Master Password</Label>
              <div className="relative">
                <Input
                  id="daemon-start-pw"
                  type={showStartPw ? "text" : "password"}
                  placeholder="Enter your master password"
                  value={startPassword}
                  onChange={(e) => {
                    setStartPassword(e.target.value);
                    setStartError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmStart();
                    }
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowStartPw((prev) => !prev)}
                >
                  {showStartPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Forgot your password?{" "}
                <Link href="/field-ops/vault" className="text-red-400 hover:underline">
                  Reset vault
                </Link>
              </p>
            </div>

            {startError && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{startError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowStartDialog(false);
                  setStartPassword("");
                  setStartError("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={starting || !startPassword.trim()}
                onClick={handleConfirmStart}
              >
                {starting ? "Starting..." : "Launch Autopilot"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
