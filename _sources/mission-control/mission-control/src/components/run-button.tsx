"use client";

import { Rocket, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { cn } from "@/lib/utils";

interface RunButtonProps {
  isRunning: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
  /** When true, shows a red stop button instead of a spinning loader */
  isProjectRunActive?: boolean;
  /** Called when the stop button is clicked */
  onStop?: () => void;
}

export function RunButton({
  isRunning,
  onClick,
  size = "sm",
  disabled = false,
  title,
  isProjectRunActive = false,
  onStop,
}: RunButtonProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const btnSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  // Stop mode: show red square when mission is active and onStop is provided
  const showStop = (isRunning || isProjectRunActive) && onStop;

  if (showStop) {
    return (
      <Tip content={title ?? "Stop run"}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            btnSize,
            "shrink-0 rounded-full transition-colors",
            "text-red-500 hover:text-red-600 hover:bg-red-500/10"
          )}
          title={title ?? "Stop run"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStop();
          }}
        >
          <Square className={cn(iconSize, "fill-current")} />
        </Button>
      </Tip>
    );
  }

  return (
    <Tip content={title ?? (isRunning ? "Running..." : "Launch task")}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          btnSize,
          "shrink-0 rounded-full transition-colors",
          isRunning
            ? "text-green-500 cursor-default"
            : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
        )}
        disabled={disabled || isRunning}
        title={title ?? (isRunning ? "Running..." : "Launch task")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!isRunning && !disabled) {
            onClick();
          }
        }}
      >
        {isRunning ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : (
          <Rocket className={cn(iconSize)} />
        )}
      </Button>
    </Tip>
  );
}
