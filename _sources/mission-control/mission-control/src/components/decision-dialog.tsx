"use client";

import { useState } from "react";
import { HelpCircle, User, Search, Code, Megaphone, BarChart3, Bot } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/lib/toast";
import { apiFetch } from "@/lib/api-client";
import type { DecisionItem } from "@/lib/types";
import { AGENT_ROLES } from "@/lib/types";

const agentIcons: Record<string, typeof User> = {
  me: User,
  researcher: Search,
  developer: Code,
  marketer: Megaphone,
  "business-analyst": BarChart3,
  system: Bot,
};

interface DecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: DecisionItem | null;
  onAnswered: () => void;
}

export function DecisionDialog({ open, onOpenChange, decision, onAnswered }: DecisionDialogProps) {
  const [customAnswer, setCustomAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!decision) return null;

  const RequestorIcon = agentIcons[decision.requestedBy] ?? User;
  const requestorLabel =
    decision.requestedBy === "system"
      ? "System"
      : (AGENT_ROLES.find((r) => r.id === decision.requestedBy)?.label ?? decision.requestedBy);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return `${Math.round(diffMs / 60000)}m ago`;
    if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
    return d.toLocaleDateString();
  };

  const handleAnswer = async (answer: string) => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/decisions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: decision.id,
          status: "answered",
          answer: answer.trim(),
        }),
      });
      if (!res.ok) {
        showError("Failed to answer decision");
        return;
      }
      showSuccess(`Decision answered: "${answer.trim()}"`);
      setCustomAnswer("");
      onOpenChange(false);
      // Small delay to let the write complete before re-running the task
      setTimeout(() => onAnswered(), 300);
    } catch {
      showError("Failed to answer decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-yellow-400" />
            Decision Required
          </DialogTitle>
          <DialogDescription>
            Answer this question before the task can be launched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question */}
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
              <RequestorIcon className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{decision.question}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Asked by {requestorLabel}</span>
                <span className="text-xs text-muted-foreground">{formatDate(decision.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Context */}
          {decision.context && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              {decision.context}
            </p>
          )}

          {/* Option buttons */}
          {decision.options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {decision.options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={isSubmitting}
                  onClick={() => handleAnswer(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {/* Custom answer */}
          <div className="flex items-center gap-2">
            <Input
              value={customAnswer}
              onChange={(e) => setCustomAnswer(e.target.value)}
              placeholder="Or type a custom answer..."
              className="h-8 text-xs flex-1"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customAnswer.trim()) {
                  handleAnswer(customAnswer);
                }
              }}
            />
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!customAnswer.trim() || isSubmitting}
              onClick={() => handleAnswer(customAnswer)}
            >
              Answer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
