"use client";

import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Loader2, Square, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import type { ProjectRun, ActiveRun } from "@/lib/types";

interface ProjectRunProgressProps {
  projectRun: ProjectRun;
  runs: ActiveRun[];
  onStop: () => void;
}

function formatElapsed(startedAt: string): string {
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function ProjectRunProgress({ projectRun, runs, onStop }: ProjectRunProgressProps) {
  const { completedTasks, failedTasks, totalTasks, skippedTasks, status, startedAt } = projectRun;

  // Currently running tasks for this project run
  const runningTasks = useMemo(
    () => runs.filter((r) => r.status === "running" && r.missionId === projectRun.id),
    [runs, projectRun.id]
  );

  const progress = totalTasks > 0 ? Math.round(((completedTasks + failedTasks) / totalTasks) * 100) : 0;
  const isActive = status === "running" || status === "stalled";

  const statusColor = {
    running: "bg-emerald-500",
    completed: "bg-blue-500",
    stopped: "bg-orange-500",
    stalled: "bg-amber-500",
  }[status];

  const statusLabel = {
    running: "Running",
    completed: "Completed",
    stopped: "Stopped",
    stalled: "Stalled",
  }[status];

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Run Progress</span>
            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
              <div className={`h-1.5 w-1.5 rounded-full ${statusColor} ${status === "running" ? "animate-pulse" : ""}`} />
              {statusLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <Clock className="h-3 w-3" />
                {formatElapsed(startedAt)}
              </span>
            )}
            {isActive && (
              <Tip content="Stop project run">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onStop}
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              </Tip>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {completedTasks} done
              </span>
              {failedTasks > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  {failedTasks} failed
                </span>
              )}
              {skippedTasks > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {skippedTasks} blocked
                </span>
              )}
            </div>
            <span className="tabular-nums">{progress}% · {completedTasks + failedTasks}/{totalTasks}</span>
          </div>
        </div>

        {/* Running agents */}
        {runningTasks.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Running now</span>
            <div className="flex flex-wrap gap-1.5">
              {runningTasks.map((run) => (
                <Badge key={run.id} variant="secondary" className="gap-1 text-[11px] font-normal">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {run.agentId}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Stalled warning */}
        {status === "stalled" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Run stalled — remaining tasks are blocked by dependencies, pending decisions, or repeated failures.
              Check the Decisions page for items that need your input.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
