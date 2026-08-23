"use client";

import { useState } from "react";
import { Plus, Target, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { CreateGoalDialog } from "@/components/create-goal-dialog";
import { EditGoalDialog } from "@/components/edit-goal-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useGoals, useTasks, useProjects } from "@/hooks/use-data";
import { GoalCardSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";
import { Tip } from "@/components/ui/tip";
import type { Goal, Task, GoalType, GoalStatus } from "@/lib/types";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function MilestoneCard({ milestone, tasks }: { milestone: Goal; tasks: Task[] }) {
  const linkedTasks = tasks.filter((t) => milestone.tasks.includes(t.id));
  const completedCount = linkedTasks.filter((t) => t.kanban === "done").length;
  const progress = linkedTasks.length > 0 ? (completedCount / linkedTasks.length) * 100 : 0;

  const statusColors: Record<string, string> = {
    "not-started": "text-muted-foreground",
    "in-progress": "text-status-in-progress",
    completed: "text-status-done",
  };

  return (
    <div className="ml-4 rounded-lg border bg-card/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{milestone.title}</h4>
        <Badge variant="outline" className={`text-xs capitalize ${statusColors[milestone.status] ?? ""}`}>
          {milestone.status.replace("-", " ")}
        </Badge>
      </div>
      {milestone.timeframe && <p className="text-xs text-muted-foreground">Target: {milestone.timeframe}</p>}
      <div className="flex items-center gap-3">
        <ProgressBar value={progress} />
        <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{completedCount}/{linkedTasks.length}</span>
      </div>
      {linkedTasks.length > 0 && (
        <div className="space-y-0.5 pt-1">
          {linkedTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-xs">
              <span className={task.kanban === "done" ? "text-status-done" : "text-muted-foreground"}>
                {task.kanban === "done" ? "✓" : "○"}
              </span>
              <span className={task.kanban === "done" ? "line-through text-muted-foreground" : ""}>{task.title}</span>
              {task.kanban === "in-progress" && <Badge variant="secondary" className="ml-auto text-xs h-4 px-1">active</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const { goals, loading: loadingGoals, create: createGoal, update: updateGoal, remove: deleteGoal, error: goalsError, refetch: refetchGoals } = useGoals();
  const { tasks, loading: loadingTasks } = useTasks();
  const { projects } = useProjects();

  const loading = loadingGoals || loadingTasks;
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  const longTermGoals = goals.filter((g) => g.type === "long-term");
  const milestones = goals.filter((g) => g.type === "medium-term");

  const handleCreateGoal = async (data: { title: string; type: GoalType; timeframe: string; projectId: string | null; parentGoalId: string | null }) => {
    await createGoal({
      title: data.title,
      type: data.type,
      timeframe: data.timeframe,
      parentGoalId: data.parentGoalId,
      projectId: data.projectId,
      status: "not-started",
      milestones: [],
      tasks: [],
    });
  };

  const handleEditGoal = async (data: { title: string; type: GoalType; timeframe: string; status: GoalStatus; projectId: string | null; parentGoalId: string | null }) => {
    if (!editingGoal) return;
    await updateGoal(editingGoal.id, data);
    setEditingGoal(null);
  };

  const handleDeleteGoal = async () => {
    if (!deletingGoalId) return;
    await deleteGoal(deletingGoalId);
    setDeletingGoalId(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Objectives" }]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <GoalCardSkeleton />
          <GoalCardSkeleton />
          <GoalCardSkeleton />
        </div>
      </div>
    );
  }

  if (goalsError) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Objectives" }]} />
        <ErrorState message={goalsError} onRetry={refetchGoals} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Objectives" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Objectives</h1>
          <p className="text-sm text-muted-foreground">Long-term objectives → milestones → tasks</p>
        </div>
        <Tip content="Create a new objective">
          <Button size="sm" onClick={() => setShowCreateGoal(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Objective
          </Button>
        </Tip>
      </div>

      {longTermGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No objectives yet"
          description="Set long-term objectives and break them into milestones to track your progress."
          actionLabel="Create an objective"
          onAction={() => setShowCreateGoal(true)}
        />
      ) : (
        longTermGoals.map((goal) => {
          const goalMilestones = milestones.filter((m) => m.parentGoalId === goal.id);
          const allTaskIds = new Set([...goal.tasks, ...goalMilestones.flatMap((m) => m.tasks)]);
          const allTasks = tasks.filter((t) => allTaskIds.has(t.id));
          const completedTasks = allTasks.filter((t) => t.kanban === "done").length;
          const overallProgress = allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0;
          const project = goal.projectId ? projects.find((p) => p.id === goal.projectId) : null;

          return (
            <Card key={goal.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                    {project && (
                      <Badge variant="outline" className="text-xs" style={{ borderColor: project.color, color: project.color }}>
                        {project.name}
                      </Badge>
                    )}
                    <Tip content="Edit objective">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingGoal(goal)}
                        aria-label="Edit objective"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </Tip>
                    <Tip content="Delete objective">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingGoalId(goal.id)}
                        aria-label="Delete objective"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Tip>
                  </div>
                  <Badge variant="outline" className={`text-xs capitalize ${goal.status === "completed" ? "text-status-done" : goal.status === "in-progress" ? "text-status-in-progress" : "text-muted-foreground"}`}>
                    {goal.status.replace("-", " ")}
                  </Badge>
                </div>
                {goal.timeframe && <p className="text-xs text-muted-foreground mt-1">Timeframe: {goal.timeframe}</p>}
                <div className="flex items-center gap-3 pt-2">
                  <ProgressBar value={overallProgress} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{Math.round(overallProgress)}%</span>
                </div>
              </CardHeader>
              {goalMilestones.length > 0 && (
                <CardContent>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                    Milestones ({goalMilestones.length})
                  </p>
                  <div className="space-y-2">
                    {goalMilestones.map((m) => (
                      <MilestoneCard key={m.id} milestone={m} tasks={tasks} />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      <CreateGoalDialog
        open={showCreateGoal}
        onOpenChange={setShowCreateGoal}
        projects={projects}
        goals={goals}
        onSubmit={handleCreateGoal}
      />

      {editingGoal && (
        <EditGoalDialog
          open={!!editingGoal}
          onOpenChange={(open) => { if (!open) setEditingGoal(null); }}
          goal={editingGoal}
          projects={projects}
          goals={goals}
          onSubmit={handleEditGoal}
        />
      )}

      <ConfirmDialog
        open={!!deletingGoalId}
        onOpenChange={(open) => { if (!open) setDeletingGoalId(null); }}
        title="Delete objective"
        description="This will permanently delete this objective and its milestones. Linked tasks will not be deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteGoal}
      />
    </div>
  );
}
