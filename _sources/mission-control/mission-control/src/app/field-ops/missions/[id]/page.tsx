"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  Plus,
  Pencil,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  MoreVertical,
  ArrowLeft,
  Shield,
  Clock,
  Activity,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { cn } from "@/lib/utils";
import { useFieldMissions, useFieldTasks, useFieldServices, useVaultSession, useExecuteTask } from "@/hooks/use-field-ops";
import { useProjects } from "@/hooks/use-data";
import { FieldTaskCard } from "@/components/field-ops/field-task-card";
import { MissionFormDialog } from "@/components/field-ops/mission-form-dialog";
import { FieldTaskFormDialog } from "@/components/field-ops/field-task-form-dialog";
import { RejectTaskDialog } from "@/components/field-ops/reject-task-dialog";
import { VaultUnlockDialog } from "@/components/field-ops/vault-unlock-dialog";
import { apiFetch } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import {
  shouldTripCircuitBreaker,
  TASK_STATUS_STYLES,
} from "@/lib/field-ops-security";
import type { FieldTask, FieldTaskType, AutonomyLevel, FieldTaskStatus, FieldOpsActivityEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── Autonomy badge ─────────────────────────────────────────────────────────

function autonomyIcon(level: AutonomyLevel) {
  switch (level) {
    case "approve-all": return ShieldCheck;
    case "approve-high-risk": return ShieldAlert;
    case "full-autonomy": return ShieldOff;
  }
}

function autonomyLabel(level: AutonomyLevel) {
  switch (level) {
    case "approve-all": return "Manual Approval";
    case "approve-high-risk": return "Supervised";
    case "full-autonomy": return "Full Autonomy";
  }
}

// ─── Activity event styling ─────────────────────────────────────────────────

function getEventColor(type: string): string {
  if (type.startsWith("field_task_")) return "bg-blue-500/20 text-blue-400";
  if (type.startsWith("service_")) return "bg-purple-500/20 text-purple-400";
  if (type.startsWith("credential_")) return "bg-amber-500/20 text-amber-400";
  if (type.startsWith("mission_")) return "bg-blue-500/20 text-blue-400";
  if (type.startsWith("circuit_breaker")) return "bg-red-500/20 text-red-400";
  return "bg-muted text-muted-foreground";
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const METADATA_LABELS: Record<string, string> = {
  approvedBy: "Approved by",
  rejectedBy: "Rejected by",
  rejectionFeedback: "Feedback",
  previousStatus: "Previous status",
  newStatus: "New status",
  taskType: "Task type",
  serviceId: "Service",
  durationMs: "Duration",
};

function formatMetadataValue(key: string, value: unknown): string {
  if (key === "durationMs" && typeof value === "number") {
    if (value < 1000) return `${value}ms`;
    if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
    return `${(value / 60_000).toFixed(1)}min`;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "\u2014";
  return String(value);
}

// ─── Mission Activity Section ───────────────────────────────────────────────

function MissionActivitySection({ missionId }: { missionId: string }) {
  const [events, setEvents] = useState<FieldOpsActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/field-ops/activity?missionId=${encodeURIComponent(missionId)}&limit=10`
      );
      if (!res.ok) return;
      const json = await res.json();
      setEvents(json.events ?? json.data ?? []);
    } catch {
      // Silent — activity is supplementary
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Don't render anything if no events and not loading
  if (!loading && events.length === 0) return null;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Mission Activity
            {!loading && events.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                {events.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Link
              href={`/field-ops/activity?missionId=${encodeURIComponent(missionId)}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="sm" className="text-xs h-7">
                View all
              </Button>
            </Link>
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const hasDetails = Boolean(event.details?.trim());
                const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;
                const isExpandable = hasDetails || hasMetadata;
                const isExpanded = expandedEvent === event.id;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "rounded-md border border-border/50 p-2.5",
                      isExpandable && "cursor-pointer hover:bg-muted/30 transition-colors"
                    )}
                    onClick={() => isExpandable && setExpandedEvent(isExpanded ? null : event.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Expand indicator */}
                      <div className="h-4 w-4 flex items-center justify-center shrink-0">
                        {isExpandable ? (
                          isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>

                      <Badge className={cn("text-[10px] px-1.5 py-0", getEventColor(event.type))}>
                        {formatEventType(event.type)}
                      </Badge>

                      {event.actor && event.actor !== "system" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {event.actor}
                        </Badge>
                      )}

                      {event.credentialId && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400">
                          <KeyRound className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[80px]">{event.credentialId}</span>
                        </span>
                      )}

                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {relativeTime(event.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs mt-1 ml-6 text-foreground/80">{event.summary}</p>

                    {/* Expanded details */}
                    {isExpanded && isExpandable && (
                      <>
                        <Separator className="my-2 ml-6" />
                        {hasDetails && (
                          <p className="ml-6 text-[11px] text-muted-foreground whitespace-pre-wrap">
                            {event.details}
                          </p>
                        )}
                        {hasMetadata && event.metadata && (
                          <div className={cn("ml-6", hasDetails && "mt-2")}>
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
                              {Object.entries(event.metadata).map(([key, value]) => {
                                if (value === null || value === undefined) return null;
                                const label = METADATA_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                                return (
                                  <div key={key} className="contents">
                                    <span className="text-muted-foreground font-medium">{label}</span>
                                    <span className="text-foreground/80">{formatMetadataValue(key, value)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as string;

  const { missions, update: updateMission, remove: removeMission, loading } = useFieldMissions();
  const { tasks, create: createTask, update: updateTask, remove: removeTask } = useFieldTasks();
  const { services } = useFieldServices();
  const { projects } = useProjects();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FieldTask | null>(null);
  const [rejectingTask, setRejectingTask] = useState<FieldTask | null>(null);
  const [vaultUnlockOpen, setVaultUnlockOpen] = useState(false);
  const [pendingExecuteTask, setPendingExecuteTask] = useState<FieldTask | null>(null);
  const [pendingDryRun, setPendingDryRun] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ taskId: string; status: string; feedback?: string } | null>(null);

  const vaultSession = useVaultSession();
  const { execute: executeTask, executingTaskId, dryRunTaskId } = useExecuteTask();
  const { refetch: refetchTasks } = useFieldTasks();

  const mission = missions.find((m) => m.id === missionId);
  const missionTasks = useMemo(
    () => tasks.filter((t) => t.missionId === missionId),
    [tasks, missionId],
  );

  // Task status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of missionTasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [missionTasks]);

  const completedCount = statusCounts["completed"] || 0;
  const totalCount = missionTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingApprovals = missionTasks.filter((t) => t.status === "pending-approval");

  // Circuit breaker check (ASI08)
  const circuitTripped = shouldTripCircuitBreaker(missionTasks.map((t) => t.status));

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleEditMission(data: {
    title: string;
    description: string;
    autonomyLevel: AutonomyLevel;
    linkedProjectId: string | null;
  }) {
    if (!mission) return;
    await updateMission(mission.id, data);
  }

  async function handleDeleteMission() {
    if (!mission) return;
    await removeMission(mission.id);
    router.push("/field-ops/missions");
  }

  async function handleTogglePause() {
    if (!mission) return;
    const newStatus = mission.status === "paused" ? "active" : "paused";
    await updateMission(mission.id, { status: newStatus });
  }

  async function handleCompleteMission() {
    if (!mission) return;
    await updateMission(mission.id, { status: "completed" });
  }

  async function handleCreateTask(data: {
    title: string;
    description: string;
    type: FieldTaskType;
    serviceId: string | null;
    approvalRequired: boolean;
    payload?: Record<string, unknown>;
  }) {
    await createTask({
      ...data,
      missionId,
      status: "draft",
      assignedTo: null,
      payload: data.payload ?? {},
      linkedTaskId: null,
      blockedBy: [],
    } as Partial<FieldTask>);
  }

  async function handleEditTask(data: {
    title: string;
    description: string;
    type: FieldTaskType;
    serviceId: string | null;
    approvalRequired: boolean;
    payload?: Record<string, unknown>;
  }) {
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      ...data,
      payload: data.payload ?? editingTask.payload,
    });
    setEditingTask(null);
  }

  async function handleStatusChange(taskId: string, status: string) {
    // Approve requires vault authentication
    if (status === "approved" && !vaultSession.active) {
      setPendingAction({ taskId, status });
      setVaultUnlockOpen(true);
      return;
    }
    try {
      await updateTask(taskId, { status } as Partial<FieldTask>);
    } catch {
      showError("Invalid status transition");
    }
  }

  async function handleRejectTask(feedback: string) {
    if (!rejectingTask) return;
    if (!vaultSession.active) {
      setPendingAction({ taskId: rejectingTask.id, status: "rejected", feedback });
      setVaultUnlockOpen(true);
      return;
    }
    try {
      await updateTask(rejectingTask.id, {
        status: "rejected",
        rejectionFeedback: feedback,
      } as Partial<FieldTask>);
      showSuccess("Task rejected with feedback");
      setRejectingTask(null);
    } catch {
      showError("Failed to reject task");
    }
  }

  // ── Execute flow ─────────────────────────────────────────────────────────

  async function handleExecute(task: FieldTask) {
    // Auto-reset failed tasks for re-execution (saves the "Resubmit as Draft" → re-approve dance)
    if (task.status === "failed") {
      try {
        await updateTask(task.id, { status: "approved" } as Partial<FieldTask>);
        await refetchTasks();
      } catch {
        showError("Could not reset task. Use 'Resubmit as Draft' first.");
        return;
      }
    }
    // Always try client-side cached password first — resilient to server restarts
    const pw = vaultSession.getCachedPassword();
    if (!vaultSession.active && !pw) {
      setPendingExecuteTask(task);
      setPendingDryRun(false);
      setVaultUnlockOpen(true);
      return;
    }
    const result = await executeTask(task.id, pw ?? undefined);
    // Auto-retry: if vault was locked (server lost session), show unlock dialog
    if (!result.success && result.error?.includes("Vault is locked")) {
      setPendingExecuteTask(task);
      setPendingDryRun(false);
      setVaultUnlockOpen(true);
      return;
    }
    await refetchTasks();
  }

  async function handleVaultUnlock(password: string): Promise<boolean> {
    const success = await vaultSession.unlock(password);
    if (success) {
      if (pendingExecuteTask) {
        // Vault unlocked — now execute the pending task with the password
        const taskToExecute = pendingExecuteTask;
        const isDryRun = pendingDryRun;
        setPendingExecuteTask(null);
        setPendingDryRun(false);
        // Small delay to allow dialog to close
        setTimeout(async () => {
          await executeTask(taskToExecute.id, password, isDryRun);
          await refetchTasks();
        }, 100);
      }
      if (pendingAction) {
        // Vault unlocked — now approve/reject the pending task
        const action = pendingAction;
        setPendingAction(null);
        setTimeout(async () => {
          try {
            const updates: Partial<FieldTask> = { status: action.status } as Partial<FieldTask>;
            if (action.feedback) {
              (updates as Record<string, unknown>).rejectionFeedback = action.feedback;
            }
            await updateTask(action.taskId, updates);
            if (action.status === "rejected") {
              showSuccess("Task rejected with feedback");
              setRejectingTask(null);
            }
          } catch {
            showError("Failed to update task status");
          }
        }, 100);
      }
    }
    return success;
  }

  async function handleDryRun(task: FieldTask) {
    // Auto-reset failed tasks for dry-run re-testing
    if (task.status === "failed") {
      try {
        await updateTask(task.id, { status: "approved" } as Partial<FieldTask>);
        await refetchTasks();
      } catch {
        showError("Could not reset task. Use 'Resubmit as Draft' first.");
        return;
      }
    }
    const pw = vaultSession.getCachedPassword();
    if (!vaultSession.active && !pw) {
      setPendingExecuteTask(task);
      setPendingDryRun(true);
      setVaultUnlockOpen(true);
      return;
    }
    const result = await executeTask(task.id, pw ?? undefined, true);
    // Auto-retry: if vault was locked, show unlock dialog
    if (!result.success && result.error?.includes("Vault is locked")) {
      setPendingExecuteTask(task);
      setPendingDryRun(true);
      setVaultUnlockOpen(true);
    }
  }

  // ── Loading / Not Found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[
          { label: "Field Ops", href: "/field-ops" },
          { label: "Missions", href: "/field-ops/missions" },
          { label: "Not Found" },
        ]} />
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-lg font-medium">Mission not found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This mission may have been deleted.
            </p>
            <Link href="/field-ops/missions">
              <Button className="mt-4 gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back to Missions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const AutonomyIcon = autonomyIcon(mission.autonomyLevel);

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Field Ops", href: "/field-ops" },
        { label: "Missions", href: "/field-ops/missions" },
        { label: mission.title },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 shrink-0" />
            <h1 className="text-2xl font-bold truncate">{mission.title}</h1>
          </div>
          {mission.description && (
            <p className="text-sm text-muted-foreground ml-9">
              {mission.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={cn(
            "text-xs",
            mission.status === "active" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
            mission.status === "paused" && "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
            mission.status === "completed" && "bg-green-500/20 text-green-400 border-green-500/30",
          )}>
            {mission.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Mission
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTogglePause}>
                {mission.status === "paused" ? (
                  <><Play className="h-3.5 w-3.5 mr-2" /> Resume</>
                ) : (
                  <><Pause className="h-3.5 w-3.5 mr-2" /> Pause</>
                )}
              </DropdownMenuItem>
              {mission.status !== "completed" && (
                <DropdownMenuItem onClick={handleCompleteMission}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Complete Mission
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-400" onClick={handleDeleteMission}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Mission
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Security summary bar */}
      <Card>
        <CardContent className="p-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <AutonomyIcon className="h-4 w-4" />
            <span className="text-muted-foreground">Approval:</span>
            <span className="font-medium">{autonomyLabel(mission.autonomyLevel)}</span>
          </div>
          {pendingApprovals.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="font-medium">{pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            <span className="text-muted-foreground">Tasks:</span>
            <span className="font-medium">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="font-medium">{completedCount} completed</span>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">{completedCount} / {totalCount} tasks</span>
              <div className="flex gap-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const style = TASK_STATUS_STYLES[status as FieldTaskStatus];
                  if (!style) return null;
                  return (
                    <Badge key={status} className={cn("text-[10px] px-1.5 py-0", style.classes)}>
                      {count} {style.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <span className="text-sm font-medium">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                progressPercent === 100 ? "bg-emerald-500" : "bg-blue-500",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Circuit breaker warning (ASI08) */}
      {circuitTripped && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-400">Circuit Breaker Triggered</h3>
              <p className="text-sm text-muted-foreground mt-1">
                3 or more consecutive tasks have failed. Consider pausing this mission to investigate
                before continuing. This prevents cascading failures from damaging external services.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                onClick={handleTogglePause}
              >
                <Pause className="h-3 w-3" />
                Pause Mission
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Approvals section */}
      {pendingApprovals.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
              Pending Approvals ({pendingApprovals.length})
            </CardTitle>
            <CardDescription>
              These tasks are waiting for your review before they can proceed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((task) => (
              <FieldTaskCard
                key={task.id}
                task={task}
                services={services}
                onStatusChange={handleStatusChange}
                onEdit={(t) => { setEditingTask(t); setTaskFormOpen(true); }}
                onDelete={(id) => removeTask(id)}
                onReject={(t) => setRejectingTask(t)}
                onExecute={handleExecute}
                executing={executingTaskId === task.id}
                onDryRun={handleDryRun}
                dryRunning={dryRunTaskId === task.id}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Tasks</CardTitle>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {missionTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No tasks yet. Add your first task to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missionTasks.map((task) => (
                <FieldTaskCard
                  key={task.id}
                  task={task}
                  services={services}
                  onStatusChange={handleStatusChange}
                  onEdit={(t) => { setEditingTask(t); setTaskFormOpen(true); }}
                  onDelete={(id) => removeTask(id)}
                  onReject={(t) => setRejectingTask(t)}
                  onExecute={handleExecute}
                  executing={executingTaskId === task.id}
                  onDryRun={handleDryRun}
                  dryRunning={dryRunTaskId === task.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mission Activity */}
      <MissionActivitySection missionId={missionId} />

      {/* Dialogs */}
      <MissionFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mission={mission}
        projects={projects}
        onSubmit={handleEditMission}
      />

      <FieldTaskFormDialog
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        missionId={missionId}
        missionAutonomy={mission.autonomyLevel}
        services={services}
        onSubmit={editingTask ? handleEditTask : handleCreateTask}
      />

      <RejectTaskDialog
        open={!!rejectingTask}
        onOpenChange={(open) => { if (!open) setRejectingTask(null); }}
        taskTitle={rejectingTask?.title ?? ""}
        onReject={handleRejectTask}
      />

      <VaultUnlockDialog
        open={vaultUnlockOpen}
        onOpenChange={(open) => {
          setVaultUnlockOpen(open);
          if (!open) {
            setPendingExecuteTask(null);
            setPendingAction(null);
          }
        }}
        onUnlock={handleVaultUnlock}
        context={
          pendingExecuteTask ? `Executing: ${pendingExecuteTask.title}` :
          pendingAction?.status === "approved" ? "Approving task" :
          pendingAction?.status === "rejected" ? "Rejecting task" :
          undefined
        }
      />
    </div>
  );
}
