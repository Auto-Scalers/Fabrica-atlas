"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/lib/types";
import { getQuadrant } from "@/lib/types";

interface EisenhowerSummaryProps {
  tasks: Task[];
}

const quadrants = [
  { key: "do" as const, label: "DO", sublabel: "Important & Urgent", color: "bg-quadrant-do", textColor: "text-quadrant-do" },
  { key: "schedule" as const, label: "SCHEDULE", sublabel: "Important & Not Urgent", color: "bg-quadrant-schedule", textColor: "text-quadrant-schedule" },
  { key: "delegate" as const, label: "DELEGATE", sublabel: "Not Important & Urgent", color: "bg-quadrant-delegate", textColor: "text-quadrant-delegate" },
  { key: "eliminate" as const, label: "ELIMINATE", sublabel: "Not Important & Not Urgent", color: "bg-quadrant-eliminate", textColor: "text-quadrant-eliminate" },
];

export function EisenhowerSummary({ tasks }: EisenhowerSummaryProps) {
  const activeTasks = tasks.filter((t) => t.kanban !== "done");
  const grouped: Record<string, Task[]> = { do: [], schedule: [], delegate: [], eliminate: [] };
  activeTasks.forEach((t) => {
    grouped[getQuadrant(t)].push(t);
  });

  return (
    <Link href="/priority-matrix">
      <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Eisenhower Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {quadrants.map(({ key, label, sublabel, color, textColor }) => (
              <div
                key={key}
                className="rounded-lg border bg-muted/30 p-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${color}`} />
                    <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
                  </div>
                  <span className="text-lg font-bold tabular-nums">{grouped[key].length}</span>
                </div>
                <p className="text-xs text-muted-foreground">{sublabel}</p>
                {/* Show top 2 tasks from DO quadrant */}
                {key === "do" && grouped[key].slice(0, 2).map((t) => (
                  <p key={t.id} className="text-xs text-foreground/80 truncate">• {t.title}</p>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
