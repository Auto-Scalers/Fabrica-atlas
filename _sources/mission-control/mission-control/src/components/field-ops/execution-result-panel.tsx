"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExecutionResultPanelProps {
  result: Record<string, unknown>;
  success: boolean;
  className?: string;
}

export function ExecutionResultPanel({
  result,
  success,
  className,
}: ExecutionResultPanelProps) {
  const [expanded, setExpanded] = useState(!success); // Auto-expand on failure

  const error = result.error as string | undefined;
  const url = result.url as string | undefined;
  const tweetId = result.tweetId as string | undefined;
  const txHash = result.txHash as string | undefined;
  const operation = result.operation as string | undefined;
  const executionMs = result.executionMs as number | undefined;
  const apiResponseCode = result.apiResponseCode as number | undefined;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      className={cn(
        "rounded-md border text-xs",
        success
          ? "border-green-500/30 bg-green-500/5"
          : "border-red-500/30 bg-red-500/5",
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full p-2 text-left hover:bg-white/5 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        {success ? (
          <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
        ) : (
          <XCircle className="h-3 w-3 text-red-400 shrink-0" />
        )}
        <span className={cn("font-medium", success ? "text-green-400" : "text-red-400")}>
          {success ? "Execution Succeeded" : "Execution Failed"}
        </span>
        {operation && (
          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
            {operation}
          </Badge>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-border/50">
          {/* Error message */}
          {error && (
            <div className="mt-1.5 text-red-400">
              {error}
            </div>
          )}

          {/* Tweet URL */}
          {url && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-muted-foreground">URL:</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-0.5 truncate"
              >
                {url}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            </div>
          )}

          {/* Tweet ID */}
          {tweetId && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Tweet ID:</span>
              <code className="text-[11px] bg-zinc-800 px-1 rounded">{tweetId}</code>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => copyToClipboard(tweetId)}
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
            </div>
          )}

          {/* Transaction hash */}
          {txHash && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Tx Hash:</span>
              <code className="text-[11px] bg-zinc-800 px-1 rounded truncate max-w-[200px]">
                {txHash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => copyToClipboard(txHash)}
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
            </div>
          )}

          {/* Execution time + API response code */}
          <div className="flex items-center gap-3 text-muted-foreground">
            {executionMs !== undefined && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {executionMs}ms
              </span>
            )}
            {apiResponseCode !== undefined && (
              <span>
                HTTP {apiResponseCode}
              </span>
            )}
          </div>

          {/* Raw result (debug) */}
          {Object.keys(result).length > 0 && (
            <details className="mt-1">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground text-[10px]">
                Raw result
              </summary>
              <pre className="mt-1 text-[10px] bg-zinc-900 rounded p-1.5 overflow-x-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
