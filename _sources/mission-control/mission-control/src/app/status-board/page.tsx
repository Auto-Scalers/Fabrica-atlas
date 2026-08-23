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
import { useTasks, useGoals, useProjects, useDecisions } from "@/hooks/use-data";
import { useActiveRunsContext as useActiveRuns } from "@/providers/active-runs-provider";
import { useFastTaskPoll } from "@/hooks/use-fast-task-poll";
import type { Task, KanbanStatus } from "@/lib/types";
import { KanbanSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";

const columns: ColumnConfig[] = [
  { id: "not-started", label: "Not Started", dotColor: "bg-status-not-started", borderColor: "border-status-not-started/30" },
  { id: "in-progress", label: "In Progress", dotColor: "bg-status-in-progress", borderColor: "border-status-in-progress/30" },
  { id: "done", label: "Done", dotColor: "bg-status-done", borderColor: "border-status-done/30" },
];

export default function KanbanPage() {
  const { tasks, update: updateTask, create: createTask, remove: deleteTask, bulkUpdate, bulkRemove, loading, error: tasksError, refetch } = useTasks();
  const { goals } = useGoals();
  const { projects } = useProjects();
  const { decisions } = useDecisions();
  const { runningTaskIds, runTask } = useActiveRuns();
  useFastTaskPoll(runningTaskIds.size > 0, refetch);
  const [filterProject, setFilterProject] = useState<string>("all");
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

  let filteredTasks = tasks;
  if (filterProject !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.projectId === filterProject);
  }

  const grouped: Record<KanbanStatus, Task[]> = { "not-started": [], "in-progress": [], done: [] };
  for (const task of filteredTasks) {
    grouped[task.kanban].push(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    baseDragEnd();
    const { active, over } = event;
    if (!over) return;
    const targetStatus = over.id as KanbanStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (!task || task.kanban === targetStatus) return;
    await updateTask(task.id, { kanban: targetStatus });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Status Board" }]} />
        <KanbanSkeleton />
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Status Board" }]} />
        <ErrorState message={tasksError} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BreadcrumbNav items={[{ label: "Status Board" }]} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Status Board</h1>
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
          <Tip content="Create a new task">
            <Button size="sm" onClick={() => setShowCreateTask(true)} className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> Task
            </Button>
          </Tip>
        </div>
      </div>

      <BoardDndWrapper activeTask={activeTask} projects={projects} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              config={col}
              tasks={grouped[col.id as KanbanStatus]}
              projects={projects}
              onTaskClick={setSelectedTask}
              minHeight="min-h-[400px]"
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
