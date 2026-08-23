"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, KanbanStatus, Project, AgentDefinition } from "@/lib/types";
import { Link2, ListChecks, CalendarDays, Clock, Ban } from "lucide-react";
import { getAgentIcon } from "@/lib/agent-icons";
import { RunButton } from "@/components/run-button";

const kanbanDot: Record<KanbanStatus, string> = {
  "not-started": "bg-status-not-started",
  "in-progress": "bg-status-in-progress",
  done: "bg-status-done",
};

const kanbanLabels: Record<KanbanStatus, string> = {
  "not-started": "Todo",
  "in-progress": "Active",
  done: "Done",
};

interface TaskCardProps {
  task: Task;
  project?: Project | null;
  agents?: AgentDefinition[];
  className?: string;
  isDragging?: boolean;
  onClick?: () => void;
  allTasks?: Task[];
  pendingDecisionTaskIds?: Set<string>;
  isRunning?: boolean;
  onRun?: (taskId: string) => void;
}

export function TaskCard({ task, project, agents = [], className, isDragging, onClick, allTasks, pendingDecisionTaskIds, isRunning, onRun }: TaskCardProps) {
  const assigneeAgent = task.assignedTo ? agents.find((a) => a.id === task.assignedTo) : null;
  const AssigneeIcon = task.assignedTo ? getAgentIcon(task.assignedTo, assigneeAgent?.icon) : null;
  const assigneeLabel = assigneeAgent?.name ?? task.assignedTo;

  // Collaborators (max 3 shown + overflow)
  const collaborators = task.collaborators ?? [];
  const visibleCollaborators = collaborators.slice(0, 3);
  const overflowCount = collaborators.length - visibleCollaborators.length;

  // Subtask progress
  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subtaskPercent = subtaskCount > 0 ? Math.round((subtaskDone / subtaskCount) * 100) : 0;

  // Three-tier blocking states: Dependencies → Awaiting Decision → Blocked
  const blockedBy = task.blockedBy ?? [];
  const hasDependencies = allTasks
    ? blockedBy.some((depId) => {
        const dep = allTasks.find((t) => t.id === depId);
        return dep && dep.kanban !== "done";
      })
    : blockedBy.length > 0;
  const hasAwaitingDecision = pendingDecisionTaskIds?.has(task.id) ?? false;
  const isBlocked = hasDependencies && hasAwaitingDecision; // Truly stuck: both deps + decision
  const isImpeded = hasDependencies || hasAwaitingDecision; // Any blocking reason (for styling)

  // Deadline check
  const dueDate = task.dueDate ? new Date(task.dueDate + "T23:59:59") : null;
  const now = new Date();
  const isOverdue = dueDate && task.kanban !== "done" && dueDate < now;
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isDueToday = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue < 1;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 1 && daysUntilDue <= 3;

  function formatDueLabel(): string | null {
    if (!task.dueDate) return null;
    if (task.kanban === "done") {
      return `Due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
    if (isOverdue) return `Overdue: ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    if (isDueToday) return "Due today";
    if (isDueSoon) return `Due in ${daysUntilDue}d`;
    return `Due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  const dueLabel = formatDueLabel();

  return (
    <Card
      className={cn(
        "cursor-grab select-none transition-all hover:shadow-md hover:border-primary/20 animate-fade-in-up",
        isDragging && "opacity-50 shadow-lg rotate-1",
        onClick && "cursor-pointer",
        isBlocked && "opacity-60 border-red-500/30",
        !isBlocked && hasDependencies && "opacity-75 border-blue-500/30",
        !isBlocked && hasAwaitingDecision && "opacity-75 border-amber-500/30",
        isOverdue && "border-red-500/30",
        isRunning && "ring-2 ring-green-500/50 border-green-500/30 shadow-green-500/10 shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className={cn("p-3 pb-1", isRunning && "bg-green-500/5 rounded-t-lg")}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight flex-1">
            {isBlocked && <Ban className="h-3 w-3 inline mr-1 text-red-500" />}
            {!isBlocked && hasDependencies && <Link2 className="h-3 w-3 inline mr-1 text-blue-500" />}
            {!isBlocked && !hasDependencies && hasAwaitingDecision && <Clock className="h-3 w-3 inline mr-1 text-amber-500" />}
            {task.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {/* Run button — only shown when agent assigned, not done, and handler provided */}
            {onRun && task.assignedTo && task.assignedTo !== "me" && task.kanban !== "done" && (
              <RunButton
                isRunning={isRunning ?? false}
                onClick={() => onRun(task.id)}
                disabled={isImpeded}
                title={isBlocked ? "Task is blocked" : hasDependencies ? "Waiting on dependencies" : hasAwaitingDecision ? "Awaiting decision" : undefined}
              />
            )}
            {/* Kanban status dot */}
            <div className={cn("h-2 w-2 rounded-full", kanbanDot[task.kanban])} />
            <span className="text-xs text-muted-foreground">{kanbanLabels[task.kanban]}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Subtask progress */}
        {subtaskCount > 0 && (
          <div className="flex items-center gap-2">
            <ListChecks className={`h-3 w-3 shrink-0 ${isRunning && subtaskDone < subtaskCount ? "text-green-500" : "text-muted-foreground"}`} />
            <div className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isRunning && subtaskDone < subtaskCount ? "bg-green-500/70" : "bg-primary/60"}`}
                style={{ width: `${subtaskPercent}%` }}
              />
              {isRunning && subtaskDone < subtaskCount && (
                <div className="absolute inset-0 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
              )}
            </div>
            <span className={`text-xs tabular-nums ${isRunning && subtaskDone < subtaskCount ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
              {subtaskDone}/{subtaskCount}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Project badge */}
          {project && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0"
              style={{ borderColor: project.color, color: project.color }}
            >
              {project.name}
            </Badge>
          )}
          {/* Assignee badge */}
          {task.assignedTo && AssigneeIcon && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 gap-1">
              <AssigneeIcon className="h-2.5 w-2.5" />
              {assigneeLabel}
            </Badge>
          )}
          {/* Collaborator avatars (stacked) */}
          {visibleCollaborators.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {visibleCollaborators.map((collab) => {
                const collabAgent = agents.find((a) => a.id === collab);
                const CollabIcon = getAgentIcon(collab, collabAgent?.icon);
                return (
                  <div
                    key={collab}
                    className="h-5 w-5 rounded-full border-2 border-card bg-muted flex items-center justify-center"
                    title={collabAgent?.name ?? collab}
                  >
                    <CollabIcon className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                );
              })}
              {overflowCount > 0 && (
                <div className="h-5 w-5 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                  <span className="text-[9px] text-muted-foreground font-medium">+{overflowCount}</span>
                </div>
              )}
            </div>
          )}
          {/* Blocking state indicators */}
          {isBlocked && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 border-red-500/50 text-red-500">
              Blocked
            </Badge>
          )}
          {!isBlocked && hasDependencies && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 border-blue-500/50 text-blue-500">
              Dependencies
            </Badge>
          )}
          {!isBlocked && hasAwaitingDecision && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-500/50 text-amber-500">
              Awaiting Decision
            </Badge>
          )}
          {/* Tags (max 2 visible) */}
          {task.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-1.5 py-0 bg-muted/50"
            >
              {tag}
            </Badge>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{task.tags.length - 2}
            </span>
          )}
          {/* Deadline badge */}
          {dueLabel && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0 gap-1",
                isOverdue
                  ? "text-red-500 border-red-500/50"
                  : isDueToday
                    ? "text-orange-500 border-orange-500/50"
                    : isDueSoon
                      ? "text-yellow-500 border-yellow-500/50"
                      : "text-muted-foreground"
              )}
            >
              <CalendarDays className="h-2.5 w-2.5" />
              {dueLabel}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
