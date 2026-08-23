"use client";

import { useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { Plus, Filter } from "lucide-react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Tip } from "@/components/ui/tip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BoardColumn,
  BoardDndWrapper,
  BoardPanels,
  useTaskHandlers,
  useSelection,
  type ColumnConfig,
} from "@/components/board-view";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { useTasks, useGoals, useProjects, useAgents, useDecisions } from "@/hooks/use-data";
import { useActiveRunsContext as useActiveRuns } from "@/providers/active-runs-provider";
import { useFastTaskPoll } from "@/hooks/use-fast-task-poll";
import type { Task, EisenhowerQuadrant } from "@/lib/types";
import { getQuadrant, valuesFromQuadrant } from "@/lib/types";
import { EisenhowerSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";

const quadrants: ColumnConfig[] = [
  { id: "do", label: "DO", subtitle: "Important & Urgent", borderColor: "border-quadrant-do/40", dotColor: "bg-quadrant-do", textColor: "text-quadrant-do" },
  { id: "schedule", label: "SCHEDULE", subtitle: "Important & Not Urgent", borderColor: "border-quadrant-schedule/40", dotColor: "bg-quadrant-schedule", textColor: "text-quadrant-schedule" },
  { id: "delegate", label: "DELEGATE", subtitle: "Not Important & Urgent", borderColor: "border-quadrant-delegate/40", dotColor: "bg-quadrant-delegate", textColor: "text-quadrant-delegate" },
  { id: "eliminate", label: "ELIMINATE", subtitle: "Not Important & Not Urgent", borderColor: "border-quadrant-eliminate/40", dotColor: "bg-quadrant-eliminate", textColor: "text-quadrant-eliminate" },
];

export default function EisenhowerPage() {
  const { tasks, update: updateTask, create: createTask, remove: deleteTask, bulkUpdate, bulkRemove, loading, error: tasksError, refetch } = useTasks();
  const { goals } = useGoals();
  const { projects } = useProjects();
  const { agents } = useAgents();
  const { decisions } = useDecisions();
  const { runningTaskIds, runTask } = useActiveRuns();
  useFastTaskPoll(runningTaskIds.size > 0, refetch);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const pendingDecisionTaskIds = new Set(
    decisions.filter((d) => d.status === "pending" && d.taskId).map((d) => d.taskId as string)
  );
  const selection = useSelection();

  const {
    activeTask,
    selectedTask,
    setSelectedTask,
    showCreateTask,
    setShowCreateTask,
    handleDragStart,
    handleDragEnd: baseDragEnd,
    handleUpdateTask,
    handleCreateTask,
    handleDeleteTask,
  } = useTaskHandlers(tasks, updateTask, createTask, deleteTask);

  let activeTasks = tasks.filter((t) => t.kanban !== "done");
  if (filterProject !== "all") {
    activeTasks = activeTasks.filter((t) => t.projectId === filterProject);
  }
  if (filterAssignee !== "all") {
    activeTasks = activeTasks.filter((t) => (t.assignedTo ?? "unassigned") === filterAssignee);
  }

  const grouped: Record<EisenhowerQuadrant, Task[]> = { do: [], schedule: [], delegate: [], eliminate: [] };
  for (const task of activeTasks) {
    grouped[getQuadrant(task)].push(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    baseDragEnd();
    const { active, over } = event;
    if (!over) return;
    const targetQuadrant = over.id as EisenhowerQuadrant;
    const task = tasks.find((t) => t.id === active.id);
    if (!task || getQuadrant(task) === targetQuadrant) return;
    const { importance, urgency } = valuesFromQuadrant(targetQuadrant);
    await updateTask(task.id, { importance, urgency });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Priority Matrix" }]} />
        <EisenhowerSkeleton />
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Priority Matrix" }]} />
        <ErrorState message={tasksError} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BreadcrumbNav items={[{ label: "Priority Matrix" }]} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Priority Matrix</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {agents.filter(a => a.status === "active").map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tip content="Create a new task">
            <Button size="sm" onClick={() => setShowCreateTask(true)} className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> Task
            </Button>
          </Tip>
        </div>
      </div>

      <BoardDndWrapper activeTask={activeTask} projects={projects} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quadrants.map((q) => (
            <BoardColumn
              key={q.id}
              config={q}
              tasks={grouped[q.id as EisenhowerQuadrant]}
              projects={projects}
              onTaskClick={setSelectedTask}
              maxHeight="max-h-[calc(100vh-320px)]"
              selected={selection.selected}
              onToggleSelect={selection.toggle}
              runningTaskIds={runningTaskIds}
              onRunTask={runTask}
              pendingDecisionTaskIds={pendingDecisionTaskIds}
            />
          ))}
        </div>
      </BoardDndWrapper>

      <BulkActionBar
        count={selection.count}
        onMarkDone={async () => {
          await bulkUpdate(selection.ids, { kanban: "done" } as Partial<Task>);
          selection.clear();
        }}
        onDelete={async () => {
          await bulkRemove(selection.ids);
          selection.clear();
        }}
        onClear={selection.clear}
      />

      <BoardPanels
        tasks={tasks}
        projects={projects}
        goals={goals}
        selectedTask={selectedTask}
        showCreateTask={showCreateTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onCloseDetail={() => setSelectedTask(null)}
        onCloseCreate={setShowCreateTask}
        onSubmitCreate={handleCreateTask}
      />
    </div>
  );
}
