"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useTasks, useGoals, useProjects, useBrainDump } from "@/hooks/use-data";
import {
  CheckSquare,
  Rocket,
  Crosshair,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

const QUADRANT_LABELS: Record<string, { label: string; className: string }> = {
  do: { label: "DO", className: "bg-red-500/20 text-red-400" },
  schedule: { label: "SCHEDULE", className: "bg-blue-500/20 text-blue-400" },
  delegate: { label: "DELEGATE", className: "bg-amber-500/20 text-amber-400" },
  eliminate: { label: "ELIMINATE", className: "bg-zinc-500/20 text-zinc-400" },
};

const KANBAN_LABELS: Record<string, { label: string; className: string }> = {
  "not-started": { label: "Todo", className: "bg-zinc-500/20 text-zinc-400" },
  "in-progress": { label: "Active", className: "bg-blue-500/20 text-blue-400" },
  "done": { label: "Done", className: "bg-emerald-500/20 text-emerald-400" },
};

function getQuadrantKey(task: Task): string {
  if (task.importance === "important" && task.urgency === "urgent") return "do";
  if (task.importance === "important" && task.urgency === "not-urgent") return "schedule";
  if (task.importance === "not-important" && task.urgency === "urgent") return "delegate";
  return "eliminate";
}

const MAX_RESULTS = 5;

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const { projects } = useProjects();
  const { entries: brainDumpEntries } = useBrainDump();

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sort by most recent first
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, MAX_RESULTS),
    [tasks]
  );

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, MAX_RESULTS),
    [goals]
  );

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, MAX_RESULTS),
    [projects]
  );

  const sortedBrainDump = useMemo(
    () =>
      [...brainDumpEntries]
        .filter((e) => !e.processed)
        .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
        .slice(0, MAX_RESULTS),
    [brainDumpEntries]
  );

  function handleSelect(type: string) {
    setOpen(false);
    switch (type) {
      case "task":
        router.push("/priority-matrix");
        break;
      case "project":
        router.push("/ventures");
        break;
      case "goal":
        router.push("/objectives");
        break;
      case "braindump":
        router.push("/brain-dump");
        break;
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search tasks, missions, objectives, ideas..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Tasks */}
        {sortedTasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {sortedTasks.map((task) => {
              const quad = QUADRANT_LABELS[getQuadrantKey(task)];
              const kanban = KANBAN_LABELS[task.kanban];
              return (
                <CommandItem
                  key={task.id}
                  value={`task ${task.title} ${task.description}`}
                  onSelect={() => handleSelect("task")}
                  className="flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{task.title}</span>
                  {quad && (
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", quad.className)}>
                      {quad.label}
                    </span>
                  )}
                  {kanban && (
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", kanban.className)}>
                      {kanban.label}
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {sortedTasks.length > 0 && sortedProjects.length > 0 && <CommandSeparator />}

        {/* Ventures (Projects) */}
        {sortedProjects.length > 0 && (
          <CommandGroup heading="Ventures">
            {sortedProjects.map((project) => (
              <CommandItem
                key={project.id}
                value={`venture project ${project.name} ${project.description}`}
                onSelect={() => handleSelect("project")}
                className="flex items-center gap-2"
              >
                <Rocket className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{project.name}</span>
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  project.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                  project.status === "paused" ? "bg-amber-500/20 text-amber-400" :
                  project.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                  "bg-zinc-500/20 text-zinc-400"
                )}>
                  {project.status}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {sortedProjects.length > 0 && sortedGoals.length > 0 && <CommandSeparator />}

        {/* Objectives (Goals) */}
        {sortedGoals.length > 0 && (
          <CommandGroup heading="Objectives">
            {sortedGoals.map((goal) => (
              <CommandItem
                key={goal.id}
                value={`objective goal ${goal.title} ${goal.type} ${goal.timeframe}`}
                onSelect={() => handleSelect("goal")}
                className="flex items-center gap-2"
              >
                <Crosshair className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{goal.title}</span>
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  goal.type === "long-term" ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/20 text-cyan-400"
                )}>
                  {goal.type === "long-term" ? "Long-term" : "Milestone"}
                </span>
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  goal.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                  goal.status === "in-progress" ? "bg-blue-500/20 text-blue-400" :
                  "bg-zinc-500/20 text-zinc-400"
                )}>
                  {goal.status}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {sortedGoals.length > 0 && sortedBrainDump.length > 0 && <CommandSeparator />}

        {/* Brain Dump */}
        {sortedBrainDump.length > 0 && (
          <CommandGroup heading="Brain Dump">
            {sortedBrainDump.map((entry) => (
              <CommandItem
                key={entry.id}
                value={`braindump idea ${entry.content}`}
                onSelect={() => handleSelect("braindump")}
                className="flex items-center gap-2"
              >
                <Lightbulb className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{entry.content}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400">
                  unprocessed
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
