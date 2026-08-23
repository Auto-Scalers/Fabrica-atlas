"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Goal, Task, Project } from "@/lib/types";

interface GoalCardProps {
  goal: Goal;
  tasks: Task[];
  projects: Project[];
  milestones: Goal[];
}

export function GoalCard({ goal, tasks, projects, milestones }: GoalCardProps) {
  const project = projects.find((p) => p.id === goal.projectId);
  const goalMilestones = milestones.filter((m) => m.parentGoalId === goal.id);
  const completedMilestones = goalMilestones.filter((m) => m.status === "completed").length;

  // Task progress across all milestones
  const linkedTaskIds = new Set([...goal.tasks, ...goalMilestones.flatMap((m) => m.tasks)]);
  const linkedTasks = tasks.filter((t) => linkedTaskIds.has(t.id));
  const doneTasks = linkedTasks.filter((t) => t.kanban === "done").length;
  const totalTasks = linkedTasks.length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusColors: Record<string, string> = {
    "not-started": "text-muted-foreground",
    "in-progress": "text-status-in-progress",
    completed: "text-status-done",
  };

  return (
    <Card className="transition-all hover:shadow-md animate-fade-in-up">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{goal.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {project && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0"
                  style={{ borderColor: project.color, color: project.color }}
                >
                  {project.name}
                </Badge>
              )}
              {goal.timeframe && (
                <span className="text-xs text-muted-foreground">{goal.timeframe}</span>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs capitalize shrink-0 ${statusColors[goal.status] ?? ""}`}
          >
            {goal.status.replace("-", " ")}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {goalMilestones.length > 0
                ? `${completedMilestones}/${goalMilestones.length} milestones`
                : "No milestones"}
            </span>
            <span>{doneTasks}/{totalTasks} tasks</span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
