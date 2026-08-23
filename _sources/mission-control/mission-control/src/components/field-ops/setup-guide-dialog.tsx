"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, ExternalLink, DollarSign, Shield, ShieldAlert, ShieldCheck, Key } from "lucide-react";
import type { CatalogService } from "@/lib/types";
import { getCategoryInfo } from "@/lib/service-categories";

interface SetupGuideDialogProps {
  service: CatalogService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetupGuideDialog({ service, open, onOpenChange }: SetupGuideDialogProps) {
  if (!service) return null;

  const categoryInfo = getCategoryInfo(service.category);
  const RiskIcon = service.riskLevel === "high" ? ShieldAlert : service.riskLevel === "medium" ? Shield : ShieldCheck;
  const riskColor = service.riskLevel === "high" ? "text-red-400" : service.riskLevel === "medium" ? "text-yellow-400" : "text-green-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {service.name}
            <Badge variant="outline" className={riskColor}>
              <RiskIcon className="h-3 w-3 mr-1" />
              {service.riskLevel} risk
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {service.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              ~{service.setupGuide.estimatedMinutes} min setup
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {service.setupGuide.pricing}
            </span>
            {categoryInfo && (
              <Badge variant="secondary" className={categoryInfo.color}>
                {categoryInfo.label}
              </Badge>
            )}
          </div>

          <Separator />

          {/* What You'll Need */}
          {service.configFields.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                What You&apos;ll Need
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {service.configFields.map((field) => (
                  <li key={field.key} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                    <span>
                      <span className="font-medium text-foreground">{field.label}</span>
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                      {field.helpText && <span className="ml-1 text-xs">({field.helpText})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          {/* Setup Steps */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Setup Guide</h3>
            <ol className="space-y-3">
              {service.setupGuide.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Capabilities */}
          {service.capabilities.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-2">Capabilities</h3>
                <div className="flex flex-wrap gap-1.5">
                  {service.capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" asChild>
            <a href={service.setupGuide.docsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Official Docs
            </a>
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
