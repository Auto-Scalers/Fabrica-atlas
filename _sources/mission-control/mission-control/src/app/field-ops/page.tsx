"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Plus,
  Rocket,
  Globe,
  Clock,
  CheckCircle2,
  Activity,
  Radio,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { MissionFormDialog } from "@/components/field-ops/mission-form-dialog";
import { FinancialOverviewCard } from "@/components/field-ops/financial-overview-card";
import { GettingStartedCard } from "@/components/field-ops/getting-started-card";
import { apiFetch } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/use-data";
import type {
  AutonomyLevel,
  FieldMission,
  FieldTask,
  FieldOpsActivityEvent,
  FieldOpsEventType,
  ApprovalConfig,
} from "@/lib/types";

// ─── Autonomy Mode Definitions ──────────────────────────────────────────────

interface AutonomyModeInfo {
  mode: AutonomyLevel;
  label: string;
  icon: typeof ShieldCheck;
  description: string;
  activeClasses: string;
}

const AUTONOMY_MODES: AutonomyModeInfo[] = [
  {
    mode: "approve-all",
    label: "Manual Approval",
    icon: ShieldCheck,
    description: "Every field task requires your explicit approval before execution. This is the safest mode.",
    activeClasses: "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600",
  },
  {
    mode: "approve-high-risk",
    label: "Supervised",
    icon: ShieldAlert,
    description: "Low-risk tasks execute automatically. High-risk actions (payments, publishing, etc.) still require approval.",
    activeClasses: "bg-amber-500 text-white hover:bg-amber-600 border-amber-500",
  },
  {
    mode: "full-autonomy",
    label: "Full Autonomy",
    icon: ShieldOff,
    description: "All field tasks execute automatically without approval. Use with extreme caution.",
    activeClasses: "bg-red-600 text-white hover:bg-red-700 border-red-600",
  },
];

// ─── Event Type Display Config ──────────────────────────────────────────────

const eventTypeLabels: Record<FieldOpsEventType, string> = {
  field_task_created: "Task Created",
  field_task_approved: "Task Approved",
  field_task_rejected: "Task Rejected",
  field_task_executing: "Executing",
  field_task_completed: "Task Completed",
  field_task_failed: "Task Failed",
  service_connected: "Service Connected",
  service_disconnected: "Service Disconnected",
  credential_added: "Credential Added",
  credential_rotated: "Credential Rotated",
  credential_accessed: "Credential Accessed",
  credential_access_denied: "Access Denied",
  vault_migrated: "Vault Migrated",
  autonomy_changed: "Autonomy Changed",
  service_saved: "Service Saved",
  service_activated: "Service Activated",
  field_task_deleted: "Task Deleted",
  circuit_breaker_tripped: "Circuit Breaker",
  mission_created: "Mission Created",
  mission_status_changed: "Mission Status Changed",
  mission_deleted: "Mission Deleted",
  approval_config_changed: "Config Changed",
};

const eventTypeColors: Record<FieldOpsEventType, string> = {
  field_task_created: "bg-blue-500/20 text-blue-400",
  field_task_approved: "bg-emerald-500/20 text-emerald-400",
  field_task_rejected: "bg-red-500/20 text-red-400",
  field_task_executing: "bg-yellow-500/20 text-yellow-400",
  field_task_completed: "bg-green-500/20 text-green-400",
  field_task_failed: "bg-red-500/20 text-red-400",
  service_connected: "bg-cyan-500/20 text-cyan-400",
  service_disconnected: "bg-orange-500/20 text-orange-400",
  credential_added: "bg-purple-500/20 text-purple-400",
  credential_rotated: "bg-indigo-500/20 text-indigo-400",
  credential_accessed: "bg-purple-500/20 text-purple-400",
  credential_access_denied: "bg-red-500/20 text-red-400",
  vault_migrated: "bg-green-500/20 text-green-400",
  autonomy_changed: "bg-amber-500/20 text-amber-400",
  service_saved: "bg-amber-500/20 text-amber-400",
  service_activated: "bg-green-500/20 text-green-400",
  field_task_deleted: "bg-zinc-500/20 text-zinc-400",
  circuit_breaker_tripped: "bg-red-500/20 text-red-400",
  mission_created: "bg-blue-500/20 text-blue-400",
  mission_status_changed: "bg-amber-500/20 text-amber-400",
  mission_deleted: "bg-zinc-500/20 text-zinc-400",
  approval_config_changed: "bg-amber-500/20 text-amber-400",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function autonomyBadgeClasses(level: AutonomyLevel): string {
  switch (level) {
    case "approve-all":
      return "bg-emerald-500/20 text-emerald-400";
    case "approve-high-risk":
      return "bg-amber-500/20 text-amber-400";
    case "full-autonomy":
      return "bg-red-500/20 text-red-400";
  }
}

function autonomyBadgeLabel(level: AutonomyLevel): string {
  switch (level) {
    case "approve-all":
      return "Manual Approval";
    case "approve-high-risk":
      return "Supervised";
    case "full-autonomy":
      return "Full Autonomy";
  }
}

function missionStatusBadgeClasses(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-400";
    case "paused":
      return "bg-yellow-500/20 text-yellow-400";
    case "completed":
      return "bg-blue-500/20 text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FieldOpsPage() {
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<FieldMission[]>([]);
  const [fieldTasks, setFieldTasks] = useState<FieldTask[]>([]);
  const [connectedServicesCount, setConnectedServicesCount] = useState(0);
  const [savedServicesCount, setSavedServicesCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<FieldOpsActivityEvent[]>([]);
  const [approvalConfig, setApprovalConfig] = useState<ApprovalConfig>({
    mode: "approve-all",
    overrides: {},
  });
  const [updatingMode, setUpdatingMode] = useState(false);
  const [pendingMode, setPendingMode] = useState<AutonomyLevel | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [missionFormOpen, setMissionFormOpen] = useState(false);
  const { projects } = useProjects();

  const loadData = useCallback(async () => {
    try {
      const [missionsRes, tasksRes, servicesRes, activityRes, configRes] = await Promise.all([
        apiFetch("/api/field-ops/missions"),
        apiFetch("/api/field-ops/tasks"),
        apiFetch("/api/field-ops/services"),
        apiFetch("/api/field-ops/activity?limit=10"),
        apiFetch("/api/field-ops/approval-config"),
      ]);

      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setMissions(data.missions ?? []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setFieldTasks(data.tasks ?? []);
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        const allServices = data.services ?? data.data ?? [];
        setConnectedServicesCount(allServices.filter((s: { status: string }) => s.status === "connected").length);
        setSavedServicesCount(allServices.filter((s: { status: string }) => s.status === "saved").length);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data.events ?? []);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        if (data.config) {
          setApprovalConfig(data.config);
        }
      }
    } catch {
      // Silently handle — data will show as empty/zero
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleAutonomyChange(mode: AutonomyLevel) {
    if (mode === approvalConfig.mode || updatingMode) return;
    setPendingMode(mode);
    setMasterPassword("");
    setDialogError("");
    setShowPassword(false);
    setShowPasswordDialog(true);
  }

  async function handleConfirmAutonomyChange() {
    if (!pendingMode) return;
    if (!masterPassword.trim()) {
      setDialogError("Master password is required.");
      return;
    }
    setUpdatingMode(true);
    setDialogError("");
    try {
      const res = await apiFetch("/api/field-ops/approval-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: pendingMode, masterPassword: masterPassword.trim() }),
        retries: 0,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setApprovalConfig(data.config);
        }
        showSuccess(`Autonomy level changed to ${pendingMode}`);
        setShowPasswordDialog(false);
        setMasterPassword("");
        setPendingMode(null);
        // Refresh activity to show the autonomy change event
        const activityRes = await apiFetch("/api/field-ops/activity?limit=10");
        if (activityRes.ok) {
          const actData = await activityRes.json();
          setRecentActivity(actData.events ?? []);
        }
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setDialogError(err.error ?? "Failed to change autonomy level");
      }
    } catch {
      setDialogError("Failed to change autonomy level");
    } finally {
      setUpdatingMode(false);
    }
  }

  // ─── Derived Stats ──────────────────────────────────────────────────────────

  const activeMissions = missions.filter((m) => m.status === "active");
  const pendingApprovals = fieldTasks.filter((t) => t.status === "pending-approval").length;

  // Completed tasks this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const completedThisWeek = fieldTasks.filter(
    (t) => t.status === "completed" && t.completedAt && new Date(t.completedAt) >= weekAgo
  ).length;

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Field Ops" }]} />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ─── Current Autonomy Info ────────────────────────────────────────────────

  const currentModeInfo = AUTONOMY_MODES.find((m) => m.mode === approvalConfig.mode) ?? AUTONOMY_MODES[0];

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Field Ops" }]} />

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Field Ops</h1>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setMissionFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Mission
        </Button>
      </div>

      {/* Autonomy Toggle Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Autonomy Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {AUTONOMY_MODES.map((modeInfo) => {
              const Icon = modeInfo.icon;
              const isActive = approvalConfig.mode === modeInfo.mode;
              return (
                <Button
                  key={modeInfo.mode}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  disabled={updatingMode}
                  onClick={() => handleAutonomyChange(modeInfo.mode)}
                  className={cn(
                    "gap-1.5 transition-all",
                    isActive && modeInfo.activeClasses,
                    modeInfo.mode === "full-autonomy" && isActive && "animate-pulse",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {modeInfo.label}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentModeInfo.description}
          </p>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <GettingStartedCard
        title="Welcome to Field Ops"
        description="Field Ops lets your AI agents take real actions — posting to social media, sending transactions, calling APIs — with your approval at every step. Start by connecting a service, then create a mission to organize your tasks."
        steps={[
          "Choose an autonomy level above (start with Manual Approval)",
          "Go to Services to browse and connect integrations",
          "Create a Mission to group related tasks",
          "Add tasks to your mission — they'll go through your approval workflow",
        ]}
        learnMoreHref="/guide#field-ops"
        storageKey="mc-fieldops-dashboard-intro"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Rocket className="h-3.5 w-3.5" />
              Active Missions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMissions.length}</div>
          </CardContent>
        </Card>

        <Link href="/field-ops/approvals">
          <Card className={cn(
            "transition-all hover:border-primary/30 cursor-pointer",
            pendingApprovals > 0 && "ring-1 ring-amber-500/30",
          )}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pending Approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingApprovals}
                {pendingApprovals > 0 && (
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              {pendingApprovals > 0 && (
                <p className="text-xs text-amber-400 mt-0.5">Click to review →</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedServicesCount}</div>
            {savedServicesCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                +{savedServicesCount} saved (pending setup)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed This Week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <FinancialOverviewCard variant="detailed" />

      {/* Active Missions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Active Missions
          </CardTitle>
          <CardDescription>
            {activeMissions.length === 0
              ? "No active missions. Create one to get started."
              : `${activeMissions.length} mission${activeMissions.length !== 1 ? "s" : ""} in progress`}
          </CardDescription>
        </CardHeader>
        {activeMissions.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              {activeMissions.map((mission) => {
                const missionTasks = fieldTasks.filter((t) => t.missionId === mission.id);
                const completedCount = missionTasks.filter((t) => t.status === "completed").length;
                const totalCount = missionTasks.length;
                const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                const pendingCount = missionTasks.filter((t) => t.status === "pending-approval").length;

                return (
                  <Link key={mission.id} href={`/field-ops/missions/${mission.id}`} className="block">
                    <div className="rounded-lg border p-4 space-y-3 hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">{mission.title}</h3>
                          {mission.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {mission.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pendingCount > 0 && (
                            <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30 gap-0.5">
                              <Clock className="h-2.5 w-2.5 animate-pulse" />
                              {pendingCount}
                            </Badge>
                          )}
                          <Badge className={cn("text-xs", autonomyBadgeClasses(mission.autonomyLevel))}>
                            {autonomyBadgeLabel(mission.autonomyLevel)}
                          </Badge>
                          <Badge className={cn("text-xs", missionStatusBadgeClasses(mission.status))}>
                            {mission.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{completedCount} / {totalCount} tasks</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recent Field Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Field Activity
          </CardTitle>
          <CardDescription>
            {recentActivity.length === 0
              ? "No field activity recorded yet."
              : `Last ${recentActivity.length} event${recentActivity.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        {recentActivity.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("text-xs px-1.5", eventTypeColors[event.type])}>
                        {eventTypeLabels[event.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{event.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
      {/* Mission form dialog */}
      <MissionFormDialog
        open={missionFormOpen}
        onOpenChange={setMissionFormOpen}
        projects={projects}
        onSubmit={async (data) => {
          const res = await apiFetch("/api/field-ops/missions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, status: "active", tasks: [] }),
          });
          if (res.ok) {
            loadData();
          }
        }}
      />

      {/* ═══ Autonomy Change Password Dialog ═══ */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPasswordDialog(false);
          setPendingMode(null);
          setMasterPassword("");
          setDialogError("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirm Autonomy Change
            </DialogTitle>
            <DialogDescription>
              {pendingMode === "full-autonomy"
                ? "You are switching to Full Autonomy. All field tasks will execute automatically without your approval. Enter your master password to confirm."
                : pendingMode === "approve-high-risk"
                ? "You are switching to Supervised mode. Only high-risk tasks will require approval. Enter your master password to confirm."
                : "Enter your master password to change the autonomy level."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pendingMode === "full-autonomy" && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">
                  Full Autonomy allows agents to execute all tasks — including financial
                  transactions — without your approval. Make sure your safety limits are
                  configured before enabling this mode.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="autonomy-master-pw">Master Password</Label>
              <div className="relative">
                <Input
                  id="autonomy-master-pw"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your master password"
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    setDialogError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmAutonomyChange();
                    }
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
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

            {dialogError && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{dialogError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPendingMode(null);
                  setMasterPassword("");
                  setDialogError("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={updatingMode || !masterPassword.trim()}
                onClick={handleConfirmAutonomyChange}
                className={cn(
                  pendingMode === "full-autonomy" && "bg-red-600 hover:bg-red-700"
                )}
              >
                {updatingMode ? "Updating..." : "Confirm Change"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
