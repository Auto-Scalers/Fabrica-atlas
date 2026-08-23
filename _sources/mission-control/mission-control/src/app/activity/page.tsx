"use client";

import { useState } from "react";
import { Activity, User, Search, Code, Megaphone, BarChart3, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { useActivityLog } from "@/hooks/use-data";
import { EventRowSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";
import type { EventType, ActivityEvent } from "@/lib/types";
import { AGENT_ROLES } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const agentIcons: Record<string, typeof User> = {
  me: User,
  researcher: Search,
  developer: Code,
  marketer: Megaphone,
  "business-analyst": BarChart3,
  system: Bot,
};

const eventTypeLabels: Record<EventType, string> = {
  task_created: "Task Created",
  task_updated: "Task Updated",
  task_completed: "Task Completed",
  task_delegated: "Task Delegated",
  task_failed: "Task Failed",
  message_sent: "Message Sent",
  decision_requested: "Decision Requested",
  decision_answered: "Decision Answered",
  brain_dump_triaged: "Brain Dump Processed",
  milestone_completed: "Milestone Completed",
  agent_checkin: "Agent Check-in",
  field_task_completed: "Field Task Completed",
  field_task_failed: "Field Task Failed",
  field_task_approved: "Field Task Approved",
  field_task_rejected: "Field Task Rejected",
};

const eventTypeColors: Record<EventType, string> = {
  task_created: "bg-blue-500/20 text-blue-400",
  task_updated: "bg-purple-500/20 text-purple-400",
  task_completed: "bg-green-500/20 text-green-400",
  task_delegated: "bg-orange-500/20 text-orange-400",
  task_failed: "bg-red-500/20 text-red-400",
  message_sent: "bg-cyan-500/20 text-cyan-400",
  decision_requested: "bg-yellow-500/20 text-yellow-400",
  decision_answered: "bg-emerald-500/20 text-emerald-400",
  brain_dump_triaged: "bg-pink-500/20 text-pink-400",
  milestone_completed: "bg-green-500/20 text-green-400",
  agent_checkin: "bg-indigo-500/20 text-indigo-400",
  field_task_completed: "bg-green-500/20 text-green-400",
  field_task_failed: "bg-red-500/20 text-red-400",
  field_task_approved: "bg-emerald-500/20 text-emerald-400",
  field_task_rejected: "bg-orange-500/20 text-orange-400",
};

function groupByDate(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const event of events) {
    const dateStr = new Date(event.timestamp).toDateString();
    let label: string;
    if (dateStr === today) label = "Today";
    else if (dateStr === yesterday) label = "Yesterday";
    else label = new Date(event.timestamp).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(event);
  }
  return groups;
}

export default function ActivityPage() {
  const { events, loading, error: activityError, refetch } = useActivityLog();
  const [filterActor, setFilterActor] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  let filtered = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filterActor !== "all") {
    filtered = filtered.filter((e) => e.actor === filterActor);
  }
  if (filterType !== "all") {
    filtered = filtered.filter((e) => e.type === filterType);
  }

  const grouped = groupByDate(filtered);

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Activity" }]} />
        <div className="space-y-2">
          <EventRowSkeleton />
          <EventRowSkeleton />
          <EventRowSkeleton />
          <EventRowSkeleton />
          <EventRowSkeleton />
        </div>
      </div>
    );
  }

  if (activityError) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Activity Log" }]} />
        <ErrorState message={activityError} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Activity" }]} />

      <h1 className="text-xl font-bold flex items-center gap-2">
        <Activity className="h-5 w-5" />
        Activity Log
      </h1>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterActor} onValueChange={setFilterActor}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="All actors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            {AGENT_ROLES.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
            ))}
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(eventTypeLabels) as EventType[]).map((type) => (
              <SelectItem key={type} value={type}>{eventTypeLabels[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {Array.from(grouped.entries()).map(([dateLabel, dateEvents]) => (
        <section key={dateLabel} className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{dateLabel}</h2>
          <div className="space-y-1.5">
            {dateEvents.map((evt) => {
              const ActorIcon = agentIcons[evt.actor] ?? User;
              const actorLabel = evt.actor === "system" ? "System" : (AGENT_ROLES.find((r) => r.id === evt.actor)?.label ?? evt.actor);
              return (
                <Card key={evt.id} className="bg-card/50">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <ActorIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs px-1.5 ${eventTypeColors[evt.type]}`}>
                          {eventTypeLabels[evt.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{actorLabel}</span>
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{evt.summary}</p>
                      {evt.details && (
                        <p className="text-xs text-muted-foreground mt-0.5">{evt.details}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Actions taken by you and your AI agents will be logged here."
        />
      )}
    </div>
  );
}
