"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const shortcuts = [
  { key: "?", label: "Show keyboard shortcuts" },
  { key: "N", label: "Create new task (opens Cmd+K)" },
  { key: "G H", label: "Go to Dashboard" },
  { key: "G E", label: "Go to Priority Matrix" },
  { key: "G K", label: "Go to Status Board" },
  { key: "G O", label: "Go to Objectives" },
  { key: "G B", label: "Go to Brain Dump" },
  { key: "G P", label: "Go to Ventures" },
  { key: "G I", label: "Go to Inbox" },
  { key: "G D", label: "Go to Decisions" },
  { key: "G C", label: "Go to Crew" },
  { key: "G S", label: "Go to Skills" },
  { key: "G L", label: "Go to Autopilot" },
];

interface KeyboardShortcutsProps {
  onCreateTask?: () => void;
}

export function KeyboardShortcuts({ onCreateTask }: KeyboardShortcutsProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [gPressed, setGPressed] = useState(false);
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle "G" prefix for navigation
      if (gPressed) {
        setGPressed(false);
        switch (e.key.toLowerCase()) {
          case "h": router.push("/"); return;
          case "e": router.push("/priority-matrix"); return;
          case "k": router.push("/status-board"); return;
          case "o": router.push("/objectives"); return;
          case "b": router.push("/brain-dump"); return;
          case "p": router.push("/ventures"); return;
          case "i": router.push("/inbox"); return;
          case "d": router.push("/decisions"); return;
          case "c": router.push("/crew"); return;
          case "s": router.push("/skills"); return;
          case "l": router.push("/autopilot"); return;
        }
        return;
      }

      // Single-key shortcuts
      switch (e.key) {
        case "?":
          setHelpOpen(true);
          break;
        case "g":
          setGPressed(true);
          // Reset after 1 second if no follow-up
          setTimeout(() => setGPressed(false), 1000);
          break;
        case "n":
        case "N":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onCreateTask?.();
          }
          break;
      }
    },
    [gPressed, router, onCreateTask]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5 px-1">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.key.split(" ").map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Press <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 text-[10px]">Ctrl</kbd> + <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 text-[10px]">K</kbd> to open command palette
        </p>
      </DialogContent>
    </Dialog>
  );
}
