"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  onReject: (feedback: string) => Promise<void>;
}

export function RejectTaskDialog({
  open,
  onOpenChange,
  taskTitle,
  onReject,
}: RejectTaskDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isValid = feedback.trim().length >= 10;

  async function handleReject() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onReject(feedback.trim());
      setFeedback("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Reject Task
          </DialogTitle>
          <DialogDescription>
            Provide feedback for why &ldquo;{taskTitle}&rdquo; is being rejected.
            The assignee can address the feedback and resubmit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="rejection-feedback">Rejection Feedback</Label>
          <Textarea
            id="rejection-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Explain what needs to change before this can be approved..."
            rows={3}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            {feedback.trim().length < 10
              ? `Minimum 10 characters required (${feedback.trim().length}/10)`
              : `${feedback.trim().length} characters`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!isValid || submitting}
            onClick={handleReject}
          >
            {submitting ? "Rejecting..." : "Reject Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
