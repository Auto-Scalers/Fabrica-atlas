import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  message = "Failed to load data. Please try again.",
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "py-12 px-6",
        className
      )}
    >
      <div className="rounded-full bg-destructive/10 p-3 mb-3">
        <AlertTriangle className={cn("text-destructive", compact ? "h-5 w-5" : "h-6 w-6")} />
      </div>
      <h3 className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
        Something went wrong
      </h3>
      <p className={cn("text-muted-foreground mt-1 max-w-[280px]", compact ? "text-xs" : "text-sm")}>
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
