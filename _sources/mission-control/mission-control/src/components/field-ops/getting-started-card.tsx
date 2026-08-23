"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Info, X, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GettingStartedCardProps {
  /** Card title, e.g. "Welcome to Field Ops" */
  title: string;
  /** 1-3 sentence explanation of what this area does */
  description: string;
  /** Numbered steps to get started */
  steps?: string[];
  /** Link to the guide page section for more details */
  learnMoreHref?: string;
  /** localStorage key to persist dismissal */
  storageKey: string;
  /** Override the default info icon color */
  accentClass?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GettingStartedCard({
  title,
  description,
  steps,
  learnMoreHref,
  storageKey,
  accentClass = "border-blue-500/20 bg-blue-500/5",
}: GettingStartedCardProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(storageKey) === "true");
    }
  }, [storageKey]);

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  }

  return (
    <Card className={accentClass}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
            {steps && steps.length > 0 && (
              <ol className="space-y-1 mt-2">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="text-blue-400 font-semibold shrink-0 w-4 text-right">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
            {learnMoreHref && (
              <Link
                href={learnMoreHref}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                Learn more <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
