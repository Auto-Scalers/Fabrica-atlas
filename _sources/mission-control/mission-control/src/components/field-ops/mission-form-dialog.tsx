"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AutonomyLevel, FieldMission, Project } from "@/lib/types";

// ─── Autonomy mode definitions (reused from dashboard) ─────────────────────

const AUTONOMY_MODES = [
  {
    mode: "approve-all" as AutonomyLevel,
    label: "Manual Approval",
    icon: ShieldCheck,
    description: "Every task requires your explicit approval. Safest mode.",
    activeClasses: "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600",
  },
  {
    mode: "approve-high-risk" as AutonomyLevel,
    label: "Supervised",
    icon: ShieldAlert,
    description: "Only high and medium risk tasks need approval. Low risk auto-approves.",
    activeClasses: "bg-amber-600 text-white hover:bg-amber-700 border-amber-600",
  },
  {
    mode: "full-autonomy" as AutonomyLevel,
    label: "Full Autonomy",
    icon: ShieldOff,
    description: "Only HIGH risk tasks (payments, ads) still require approval. Everything else auto-approves.",
    activeClasses: "bg-red-600 text-white hover:bg-red-700 border-red-600",
  },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface MissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission?: FieldMission | null;
  projects: Project[];
  onSubmit: (data: {
    title: string;
    description: string;
    autonomyLevel: AutonomyLevel;
    linkedProjectId: string | null;
  }) => Promise<void>;
}

export function MissionFormDialog({
  open,
  onOpenChange,
  mission,
  projects,
  onSubmit,
}: MissionFormDialogProps) {
  const isEdit = !!mission;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>("approve-all");
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens or mission changes
  useEffect(() => {
    if (open) {
      setTitle(mission?.title ?? "");
      setDescription(mission?.description ?? "");
      setAutonomyLevel(mission?.autonomyLevel ?? "approve-all");
      setLinkedProjectId(mission?.linkedProjectId ?? null);
    }
  }, [open, mission]);

  const currentMode = AUTONOMY_MODES.find((m) => m.mode === autonomyLevel) ?? AUTONOMY_MODES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        autonomyLevel,
        linkedProjectId,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Mission" : "New Mission"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update mission details and security settings."
                : "Create a new field operation mission with tasks and approval controls."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="mission-title">Title</Label>
              <Input
                id="mission-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Launch social media campaign"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="mission-desc">Description</Label>
              <Textarea
                id="mission-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this mission accomplish?"
                rows={3}
              />
            </div>

            {/* Autonomy Level */}
            <div className="space-y-2">
              <Label>Approval Level</Label>
              <div className="flex gap-2">
                {AUTONOMY_MODES.map((modeInfo) => {
                  const Icon = modeInfo.icon;
                  const isActive = autonomyLevel === modeInfo.mode;
                  return (
                    <Button
                      key={modeInfo.mode}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutonomyLevel(modeInfo.mode)}
                      className={cn(
                        "gap-1.5 flex-1 transition-all",
                        isActive && modeInfo.activeClasses,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs">{modeInfo.label}</span>
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentMode.description}
              </p>
              <p className="text-xs text-amber-400">
                Note: HIGH risk tasks (payments, ad campaigns) always require approval regardless of this setting.
              </p>
            </div>

            {/* Linked Project */}
            {projects.length > 0 && (
              <div className="space-y-2">
                <Label>Linked Project (optional)</Label>
                <Select
                  value={linkedProjectId ?? "none"}
                  onValueChange={(v) => setLinkedProjectId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Mission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
