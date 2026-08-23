import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-2 w-2 rounded-full" />
      </div>
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-2/3" />
      <div className="flex gap-1.5 pt-1">
        <Shimmer className="h-4 w-16 rounded-full" />
        <Shimmer className="h-4 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shimmer className="h-5 w-5 rounded" />
            <Shimmer className="h-8 w-12" />
          </div>
          <Shimmer className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shimmer className="h-3 w-3 rounded-full" />
          <Shimmer className="h-5 w-32" />
        </div>
        <Shimmer className="h-5 w-14 rounded-full" />
      </div>
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-1.5 w-full rounded-full" />
      <Shimmer className="h-3 w-24" />
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-5 w-48" />
        <Shimmer className="h-5 w-20 rounded-full" />
      </div>
      <Shimmer className="h-3 w-32" />
      <Shimmer className="h-1.5 w-full rounded-full" />
      <Shimmer className="h-3 w-20" />
    </div>
  );
}

export function MessageRowSkeleton() {
  return (
    <div className="rounded-xl border bg-card/50 p-3 flex items-center gap-3">
      <Shimmer className="h-4 w-4 rounded" />
      <Shimmer className="h-5 w-16 rounded-full" />
      <Shimmer className="h-4 flex-1" />
      <Shimmer className="h-3 w-20" />
    </div>
  );
}

export function EventRowSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2">
      <Shimmer className="h-5 w-16 rounded-full" />
      <div className="flex-1 space-y-1">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/3" />
      </div>
      <Shimmer className="h-3 w-16" />
    </div>
  );
}

export function EntryRowSkeleton() {
  return (
    <div className="rounded-xl border bg-card/50 p-3 flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-4/5" />
        <Shimmer className="h-3 w-24" />
      </div>
      <div className="flex gap-1">
        <Shimmer className="h-7 w-14 rounded-md" />
        <Shimmer className="h-7 w-7 rounded-md" />
        <Shimmer className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

export function DecisionCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <Shimmer className="h-5 w-3/4" />
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-2/3" />
      <div className="flex gap-2 pt-1">
        <Shimmer className="h-8 w-24 rounded-md" />
        <Shimmer className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <Shimmer className="h-5 w-24" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function EisenhowerSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card/50 p-4 min-h-[200px] space-y-2">
          <Shimmer className="h-5 w-24" />
          <Shimmer className="h-3 w-32" />
          <div className="space-y-2 pt-2">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card/50 p-4 min-h-[300px] space-y-2">
          <Shimmer className="h-5 w-24" />
          <div className="space-y-2 pt-2">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            {i === 0 && <TaskCardSkeleton />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Shimmer className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-3 w-40" />
          </div>
        </div>
        <Shimmer className="h-3 w-3 rounded-full" />
      </div>
      <div className="flex gap-1">
        <Shimmer className="h-4 w-16 rounded-full" />
        <Shimmer className="h-4 w-20 rounded-full" />
        <Shimmer className="h-4 w-14 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-16" />
      </div>
    </div>
  );
}

export function SkillCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="space-y-1.5">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-3 w-48" />
      </div>
      <div className="flex gap-1.5">
        <Shimmer className="h-5 w-5 rounded-full" />
        <Shimmer className="h-5 w-5 rounded-full" />
      </div>
      <div className="flex gap-1">
        <Shimmer className="h-4 w-14 rounded-full" />
        <Shimmer className="h-4 w-18 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <StatsBarSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={2} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetSkeleton rows={4} />
        <WidgetSkeleton rows={5} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    </div>
  );
}
