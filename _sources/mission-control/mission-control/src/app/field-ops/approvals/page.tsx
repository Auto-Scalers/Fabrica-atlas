"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Inbox,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { FieldTaskCard } from "@/components/field-ops/field-task-card";
import { GettingStartedCard } from "@/components/field-ops/getting-started-card";
import { RejectTaskDialog } from "@/components/field-ops/reject-task-dialog";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { FieldTask, FieldOpsService, FieldMission } from "@/lib/types";
import { showSuccess, showError } from "@/lib/toast";

// ─── Filter type ─────────────────────────────────────────────────────────────

type RiskFilter = "all" | "high" | "medium" | "low";

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [services, setServices] = useState<FieldOpsService[]>([]);
  const [missions, setMissions] = useState<FieldMission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<"approve" | "reject" | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [rejectTask, setRejectTask] = useState<FieldTask | null>(null);
  const [executingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tasksRes, servicesRes, missionsRes] = await Promise.all([
        apiFetch("/api/field-ops/tasks?status=pending-approval"),
        apiFetch("/api/field-ops/services"),
        apiFetch("/api/field-ops/missions"),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks ?? []);
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.services ?? data.data ?? []);
      }
      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setMissions(data.missions ?? []);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Compute risk for each task ──────────────────────────────────────────

  function getTaskRisk(task: FieldTask): "high" | "medium" | "low" {
    const highRiskTypes = ["payment", "crypto-transfer", "ad-campaign"];
    const mediumRiskTypes = ["email-campaign", "social-post", "publish"];
    if (highRiskTypes.includes(task.type)) return "high";
    if (mediumRiskTypes.includes(task.type)) return "medium";
    return "low";
  }

  // ─── Filtered tasks ──────────────────────────────────────────────────────

  const filteredTasks = riskFilter === "all"
    ? tasks
    : tasks.filter((t) => getTaskRisk(t) === riskFilter);

  const highCount = tasks.filter((t) => getTaskRisk(t) === "high").length;
  const mediumCount = tasks.filter((t) => getTaskRisk(t) === "medium").length;
  const lowCount = tasks.filter((t) => getTaskRisk(t) === "low").length;

  // ─── Selection handlers ──────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  }

  // ─── Individual task actions ─────────────────────────────────────────────

  async function handleStatusChange(taskId: string, status: string) {
    try {
      const res = await apiFetch("/api/field-ops/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status,
          ...(status === "approved" ? { approvedBy: "me" } : {}),
        }),
      });
      if (res.ok) {
        showSuccess(status === "approved" ? "Task approved" : "Status updated");
        loadData();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    } catch {
      showError("Failed to update task");
    }
  }

  async function handleReject(feedback: string) {
    if (!rejectTask) return;
    try {
      const res = await apiFetch("/api/field-ops/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectTask.id,
          status: "rejected",
          rejectedBy: "me",
          rejectionFeedback: feedback,
        }),
      });
      if (res.ok) {
        showSuccess("Task rejected");
        loadData();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(rejectTask.id);
          return next;
        });
      }
    } catch {
      showError("Failed to reject task");
    }
  }

  // ─── Batch actions ───────────────────────────────────────────────────────

  async function handleBatchApprove() {
    if (selectedIds.size === 0) return;
    setBatchAction("approve");
    try {
      const res = await apiFetch("/api/field-ops/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          taskIds: Array.from(selectedIds),
          actor: "me",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const failedCount = data.failed?.length ?? 0;
        showSuccess(
          `Approved ${data.succeeded?.length ?? 0} task(s)${failedCount > 0 ? ` (${failedCount} failed)` : ""}`,
        );
        setSelectedIds(new Set());
        loadData();
      }
    } catch {
      showError("Batch approve failed");
    } finally {
      setBatchAction(null);
    }
  }

  async function handleBatchReject(feedback: string) {
    if (selectedIds.size === 0) return;
    setBatchAction("reject");
    try {
      const res = await apiFetch("/api/field-ops/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          taskIds: Array.from(selectedIds),
          actor: "me",
          rejectionFeedback: feedback,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Rejected ${data.succeeded?.length ?? 0} task(s)`);
        setSelectedIds(new Set());
        loadData();
      }
    } catch {
      showError("Batch reject failed");
    } finally {
      setBatchAction(null);
    }
  }

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[
          { label: "Field Ops", href: "/field-ops" },
          { label: "Approvals" },
        ]} />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function getMissionTitle(missionId: string | null): string | null {
    if (!missionId) return null;
    return missions.find((m) => m.id === missionId)?.title ?? null;
  }

  // ─── Empty State ─────────────────────────────────────────────────────────

  const isEmpty = tasks.length === 0;

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Field Ops", href: "/field-ops" },
        { label: "Approvals" },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold">Approval Queue</h1>
            <p className="text-sm text-muted-foreground">
              {isEmpty
                ? "No tasks pending approval"
                : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} awaiting your review`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/field-ops" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Field Ops
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <>
        <GettingStartedCard
          title="Approval Queue"
          description="When tasks are submitted for execution, they appear here for your review. You can approve, reject, or inspect the payload before anything runs. In Manual Approval mode, every task comes here first."
          steps={[
            "Create a field task from a mission page",
            "Submit it for approval",
            "Review and approve or reject it here",
          ]}
          learnMoreHref="/guide#field-ops"
          storageKey="mc-fieldops-approvals-intro"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">All Clear</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              No field tasks are pending approval. When agents submit tasks for review,
              they&apos;ll appear here.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/field-ops">Return to Field Ops</Link>
            </Button>
          </CardContent>
        </Card>
        </>
      )}

      {/* Stats Row */}
      {!isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card
              className={cn(
                "cursor-pointer transition-all",
                riskFilter === "high" && "ring-1 ring-red-500/50",
              )}
              onClick={() => setRiskFilter(riskFilter === "high" ? "all" : "high")}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  High Risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">{highCount}</div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                riskFilter === "medium" && "ring-1 ring-amber-500/50",
              )}
              onClick={() => setRiskFilter(riskFilter === "medium" ? "all" : "medium")}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  Medium Risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">{mediumCount}</div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                riskFilter === "low" && "ring-1 ring-emerald-500/50",
              )}
              onClick={() => setRiskFilter(riskFilter === "low" ? "all" : "low")}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Low Risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">{lowCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Controls */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={filteredTasks.length > 0 && selectedIds.size === filteredTasks.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : "Select tasks for batch actions"}
                </span>

                {riskFilter !== "all" && (
                  <Badge
                    variant="outline"
                    className="gap-1 cursor-pointer"
                    onClick={() => setRiskFilter("all")}
                  >
                    <Filter className="h-3 w-3" />
                    {riskFilter} risk
                    <XCircle className="h-3 w-3 ml-0.5" />
                  </Badge>
                )}

                <div className="flex-1" />

                {selectedIds.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={batchAction !== null}
                      onClick={handleBatchApprove}
                    >
                      {batchAction === "approve" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve {selectedIds.size}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      disabled={batchAction !== null}
                      onClick={() => setRejectTask({ id: "__batch__" } as FieldTask)}
                    >
                      {batchAction === "reject" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Reject {selectedIds.size}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const missionTitle = getMissionTitle(task.missionId);
              return (
                <div key={task.id} className="flex items-start gap-3">
                  <div className="pt-4">
                    <Checkbox
                      checked={selectedIds.has(task.id)}
                      onCheckedChange={() => toggleSelect(task.id)}
                      aria-label={`Select ${task.title}`}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    {missionTitle && (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {missionTitle}
                      </span>
                    )}
                    <FieldTaskCard
                      task={task}
                      services={services}
                      onStatusChange={handleStatusChange}
                      onEdit={() => {/* no-op in approval queue */}}
                      onDelete={() => {/* no-op in approval queue */}}
                      onReject={(t) => setRejectTask(t)}
                      onExecute={undefined}
                      executing={executingId === task.id}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filtered empty */}
          {filteredTasks.length === 0 && tasks.length > 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Filter className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No {riskFilter}-risk tasks pending approval.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => setRiskFilter("all")}
                >
                  Show all tasks
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Reject dialog — handles single + batch */}
      <RejectTaskDialog
        open={rejectTask !== null}
        onOpenChange={(open) => { if (!open) setRejectTask(null); }}
        taskTitle={
          rejectTask?.id === "__batch__"
            ? `${selectedIds.size} selected task(s)`
            : rejectTask?.title ?? ""
        }
        onReject={async (feedback) => {
          if (rejectTask?.id === "__batch__") {
            await handleBatchReject(feedback);
          } else {
            await handleReject(feedback);
          }
          setRejectTask(null);
        }}
      />
    </div>
  );
}
