"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Loader2,
  Rocket,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { apiFetch } from "@/lib/api-client";
import { GettingStartedCard } from "@/components/field-ops/getting-started-card";
import { showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { FieldOpsActivityEvent } from "@/lib/types";

// ─── Event type styling ─────────────────────────────────────────────────────

const eventTypeColors: Record<string, string> = {
  field_task_created: "bg-blue-500/20 text-blue-400",
  field_task_approved: "bg-blue-500/20 text-blue-400",
  field_task_rejected: "bg-blue-500/20 text-blue-400",
  field_task_executing: "bg-blue-500/20 text-blue-400",
  field_task_completed: "bg-blue-500/20 text-blue-400",
  field_task_failed: "bg-blue-500/20 text-blue-400",
  service_connected: "bg-purple-500/20 text-purple-400",
  service_disconnected: "bg-purple-500/20 text-purple-400",
  credential_added: "bg-amber-500/20 text-amber-400",
  credential_rotated: "bg-amber-500/20 text-amber-400",
  autonomy_changed: "bg-red-500/20 text-red-400",
  field_task_deleted: "bg-zinc-500/20 text-zinc-400",
  circuit_breaker_tripped: "bg-red-500/20 text-red-400",
  mission_deleted: "bg-zinc-500/20 text-zinc-400",
  credential_accessed: "bg-amber-500/20 text-amber-400",
  credential_access_denied: "bg-red-500/20 text-red-400",
  vault_migrated: "bg-green-500/20 text-green-400",
  service_saved: "bg-purple-500/20 text-purple-400",
  service_activated: "bg-green-500/20 text-green-400",
  mission_created: "bg-blue-500/20 text-blue-400",
  mission_status_changed: "bg-amber-500/20 text-amber-400",
};

function getEventColor(type: string): string {
  if (type.startsWith("field_task_")) return "bg-blue-500/20 text-blue-400";
  if (type.startsWith("service_")) return "bg-purple-500/20 text-purple-400";
  if (type.startsWith("credential_")) return "bg-amber-500/20 text-amber-400";
  if (type.startsWith("mission_")) return "bg-blue-500/20 text-blue-400";
  if (type.startsWith("autonomy_")) return "bg-red-500/20 text-red-400";
  return eventTypeColors[type] ?? "bg-muted text-muted-foreground";
}

function formatEventType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Metadata display helpers ──────────────────────────────────────────────

const METADATA_LABELS: Record<string, string> = {
  approvedBy: "Approved by",
  rejectedBy: "Rejected by",
  rejectionFeedback: "Feedback",
  previousStatus: "Previous status",
  newStatus: "New status",
  attemptedStatus: "Attempted status",
  taskType: "Task type",
  serviceId: "Service",
  linkedProjectId: "Project",
  autonomyLevel: "Autonomy level",
  previousLevel: "Previous level",
  newLevel: "New level",
  durationMs: "Duration",
  orphanedTaskCount: "Orphaned tasks",
  authType: "Auth type",
  riskLevel: "Risk level",
  reason: "Reason",
  attemptCount: "Attempt count",
  wasLegacy: "Legacy credential",
  migratedCount: "Migrated count",
  taskCount: "Task count",
  approvalRequired: "Approval required",
  assignedTo: "Assigned to",
  configKeys: "Config keys",
  suspiciousKeys: "Suspicious keys",
  hasExpiration: "Has expiration",
  attemptedBypass: "Attempted bypass",
  consecutiveFailures: "Consecutive failures",
};

function formatMetadataValue(key: string, value: unknown): string {
  if (key === "durationMs" && typeof value === "number") {
    if (value < 1000) return `${value}ms`;
    if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
    return `${(value / 60_000).toFixed(1)}min`;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "—";
  return String(value);
}

// ─── Relative time helper ───────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Filter categories ──────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "field_task_", label: "Field Tasks" },
  { value: "mission_", label: "Missions" },
  { value: "service_", label: "Services" },
  { value: "credential_", label: "Credentials" },
  { value: "circuit_breaker_", label: "Circuit Breaker" },
  { value: "autonomy_", label: "Autonomy" },
];

// ─── Page size ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Expandable Event Row ───────────────────────────────────────────────────

function EventRow({ event }: { event: FieldOpsActivityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(event.details && event.details.trim());
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;
  const isExpandable = hasDetails || hasMetadata;

  return (
    <Card className="bg-card/50">
      <CardContent className="p-3">
        <div
          className={cn(
            "flex items-start gap-3",
            isExpandable && "cursor-pointer"
          )}
          onClick={() => isExpandable && setExpanded((prev) => !prev)}
        >
          {/* Expand indicator */}
          <div className="h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
            {isExpandable ? (
              expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("text-xs px-1.5", getEventColor(event.type))}>
                {formatEventType(event.type)}
              </Badge>
              {event.actor && event.actor !== "system" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {event.actor}
                </Badge>
              )}
              {/* Mission link */}
              {event.missionId && (
                <Link
                  href={`/field-ops/missions/${event.missionId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Rocket className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{event.missionId}</span>
                </Link>
              )}
              {/* Credential badge */}
              {event.credentialId && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                  <KeyRound className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{event.credentialId}</span>
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {relativeTime(event.timestamp)}
              </span>
            </div>
            <p className="text-sm mt-1">{event.summary}</p>
          </div>
        </div>

        {/* Expanded details + metadata */}
        {expanded && isExpandable && (
          <>
            <Separator className="my-2 ml-8" />

            {/* Text details */}
            {hasDetails && (
              <div className="ml-8 text-xs text-muted-foreground whitespace-pre-wrap">
                {event.details}
              </div>
            )}

            {/* Structured metadata */}
            {hasMetadata && event.metadata && (
              <div className={cn("ml-8", hasDetails && "mt-2")}>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  {Object.entries(event.metadata).map(([key, value]) => {
                    // Skip internal/duplicate fields
                    if (value === null || value === undefined) return null;
                    const label = METADATA_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                    return (
                      <div key={key} className="contents">
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className="text-foreground/80">{formatMetadataValue(key, value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function FieldActivityPage() {
  const searchParams = useSearchParams();
  const urlMissionId = searchParams.get("missionId");

  const [events, setEvents] = useState<FieldOpsActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchEvents = useCallback(
    async (reset: boolean) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(currentOffset),
        });
        // If URL has ?missionId=xxx, use server-side filter
        if (urlMissionId) {
          params.set("missionId", urlMissionId);
        }
        const res = await apiFetch(`/api/field-ops/activity?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load activity");
        const json = await res.json();
        const fetched: FieldOpsActivityEvent[] = json.events ?? json.data ?? [];

        if (reset) {
          setEvents(fetched);
          setOffset(PAGE_SIZE);
        } else {
          setEvents((prev) => [...prev, ...fetched]);
          setOffset((prev) => prev + PAGE_SIZE);
        }

        setHasMore(fetched.length >= PAGE_SIZE);
      } catch {
        showError("Failed to load field activity");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [offset, urlMissionId]
  );

  // Initial load (and reload when URL missionId changes)
  useEffect(() => {
    fetchEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlMissionId]);

  // Filter events client-side by prefix
  const filteredEvents =
    filter === "all"
      ? events
      : events.filter((e) => e.type.startsWith(filter));

  function handleFilterChange(value: string) {
    setFilter(value);
  }

  function handleLoadMore() {
    fetchEvents(false);
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Field Ops", href: "/field-ops" },
          { label: "Activity" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Field Activity
        </h1>
        {urlMissionId && (
          <Badge variant="outline" className="text-xs">
            Mission: {urlMissionId}
          </Badge>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => handleFilterChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-64 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredEvents.length === 0 && (
        <>
          <GettingStartedCard
            title="Activity Trail"
            description="Every action in Field Ops is logged here — task creation, approval, execution, credential access, and more. This is your audit trail for monitoring what your agents have done."
            learnMoreHref="/guide#field-ops"
            storageKey="mc-fieldops-activity-intro"
          />
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold">No field ops activity yet</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Actions from field operations will appear here.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Event timeline */}
      {!loading && filteredEvents.length > 0 && (
        <div className="space-y-2">
          {filteredEvents.map((evt) => (
            <EventRow key={evt.id} event={evt} />
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && filteredEvents.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="gap-1.5"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
