"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Plus,
  Clock,
  CheckCircle2,
  Pause,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { cn } from "@/lib/utils";
import { useFieldMissions, useFieldTasks } from "@/hooks/use-field-ops";
import { useProjects } from "@/hooks/use-data";
import { MissionFormDialog } from "@/components/field-ops/mission-form-dialog";
import { GettingStartedCard } from "@/components/field-ops/getting-started-card";
import type { FieldMissionStatus, AutonomyLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── Styling helpers ────────────────────────────────────────────────────────

function missionStatusBadge(status: FieldMissionStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Active</Badge>;
    case "paused":
      return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[10px]">Paused</Badge>;
    case "completed":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Completed</Badge>;
  }
}

function autonomyBadge(level: AutonomyLevel) {
  switch (level) {
    case "approve-all":
      return (
        <Badge variant="outline" className="text-[10px] gap-0.5">
          <ShieldCheck className="h-2.5 w-2.5" /> Manual Approval
        </Badge>
      );
    case "approve-high-risk":
      return (
        <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-500/40 text-amber-400">
          <ShieldAlert className="h-2.5 w-2.5" /> Supervised
        </Badge>
      );
    case "full-autonomy":
      return (
        <Badge variant="outline" className="text-[10px] gap-0.5 border-red-500/40 text-red-400">
          <ShieldOff className="h-2.5 w-2.5" /> Full Autonomy
        </Badge>
      );
  }
}

// ─── Status filter ──────────────────────────────────────────────────────────

type StatusFilter = "all" | FieldMissionStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MissionsPage() {
  const { missions, loading, create } = useFieldMissions();
  const { tasks } = useFieldTasks();
  const { projects } = useProjects();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = statusFilter === "all"
    ? missions
    : missions.filter((m) => m.status === statusFilter);

  // Count missions by status for filter badges
  const counts = {
    all: missions.length,
    active: missions.filter((m) => m.status === "active").length,
    paused: missions.filter((m) => m.status === "paused").length,
    completed: missions.filter((m) => m.status === "completed").length,
  };

  async function handleCreate(data: {
    title: string;
    description: string;
    autonomyLevel: AutonomyLevel;
    linkedProjectId: string | null;
  }) {
    await create({
      ...data,
      status: "active",
      tasks: [],
    } as Partial<typeof missions[0]>);
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Field Ops", href: "/field-ops" },
        { label: "Missions" },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Missions</h1>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Mission
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
            <span className="text-xs opacity-60">({counts[f.value]})</span>
          </Button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && statusFilter === "all" && (
        <GettingStartedCard
          title="What are Missions?"
          description="Missions are containers for related field tasks. Each mission has its own autonomy level that controls whether tasks need your approval. Think of a mission as a campaign — like 'Social Media Launch' or 'Payment Processing Setup'."
          steps={[
            "Click '+ New Mission' above",
            "Give it a title and choose an autonomy level",
            "Add field tasks to execute through your connected services",
          ]}
          learnMoreHref="/guide#field-ops"
          storageKey="mc-fieldops-missions-intro"
        />
      )}
      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Rocket className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg">
              {statusFilter === "all" ? "No missions yet" : `No ${statusFilter} missions`}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {statusFilter === "all"
                ? "Create your first field ops mission to start managing external tasks with security controls."
                : "Try changing the filter to see other missions."}
            </p>
            {statusFilter === "all" && (
              <Button className="mt-4 gap-1.5" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Create First Mission
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mission cards */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((mission) => {
            const missionTasks = tasks.filter((t) => t.missionId === mission.id);
            const completedCount = missionTasks.filter((t) => t.status === "completed").length;
            const totalCount = missionTasks.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const pendingApprovals = missionTasks.filter((t) => t.status === "pending-approval").length;

            return (
              <Link key={mission.id} href={`/field-ops/missions/${mission.id}`}>
                <Card className="hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{mission.title}</h3>
                        {mission.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {mission.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pendingApprovals > 0 && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] gap-0.5">
                            <Clock className="h-2.5 w-2.5 animate-pulse" />
                            {pendingApprovals} pending
                          </Badge>
                        )}
                        {autonomyBadge(mission.autonomyLevel)}
                        {missionStatusBadge(mission.status)}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-3">
                          <span>{completedCount} / {totalCount} tasks</span>
                          {missionTasks.filter((t) => t.status === "executing").length > 0 && (
                            <span className="text-indigo-400">
                              {missionTasks.filter((t) => t.status === "executing").length} executing
                            </span>
                          )}
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            progressPercent === 100 ? "bg-emerald-500" : "bg-blue-500",
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer meta */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {mission.status === "paused" && (
                        <span className="flex items-center gap-1">
                          <Pause className="h-3 w-3" /> Paused
                        </span>
                      )}
                      {mission.status === "completed" && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                      <span>Created {new Date(mission.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mission form dialog */}
      <MissionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projects={projects}
        onSubmit={handleCreate}
      />
    </div>
  );
}
