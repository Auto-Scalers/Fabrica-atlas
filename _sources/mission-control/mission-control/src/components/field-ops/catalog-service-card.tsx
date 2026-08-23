"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Bookmark,
  BookmarkCheck,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Info,
  Loader2,
} from "lucide-react";
import type { CatalogService } from "@/lib/types";
import { getCategoryInfo } from "@/lib/service-categories";

interface CatalogServiceCardProps {
  service: CatalogService & { isSaved?: boolean };
  onSave: (service: CatalogService) => Promise<void>;
  onViewGuide: (service: CatalogService) => void;
  saving?: boolean;
}

export function CatalogServiceCard({ service, onSave, onViewGuide, saving }: CatalogServiceCardProps) {
  const categoryInfo = getCategoryInfo(service.category);
  const RiskIcon = service.riskLevel === "high" ? ShieldAlert : service.riskLevel === "medium" ? Shield : ShieldCheck;
  const riskColor =
    service.riskLevel === "high"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : service.riskLevel === "medium"
      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      : "bg-green-500/10 text-green-400 border-green-500/20";

  const authLabel = service.authType === "oauth2" ? "OAuth 2.0" : service.authType === "api-key" ? "API Key" : "None";

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{service.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-3 mt-0.5">
              {service.description}
            </p>
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={`text-[10px] ${riskColor}`}>
            <RiskIcon className="h-3 w-3 mr-0.5" />
            {service.riskLevel}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {authLabel}
          </Badge>
          {categoryInfo && (
            <Badge variant="secondary" className={`text-[10px] ${categoryInfo.color}`}>
              {categoryInfo.label}
            </Badge>
          )}
        </div>

        {/* Capabilities preview */}
        {service.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {service.capabilities.slice(0, 4).map((cap) => (
              <span key={cap} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                {cap}
              </span>
            ))}
            {service.capabilities.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{service.capabilities.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ~{service.setupGuide.estimatedMinutes} min
          </span>
          <span className="truncate">{service.setupGuide.pricing.split(".")[0]}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={() => onViewGuide(service)}
          >
            <Info className="h-3 w-3 mr-1" />
            Setup Guide
          </Button>

          {service.isSaved ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-xs h-8"
              disabled
            >
              <BookmarkCheck className="h-3 w-3 mr-1" />
              Saved
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => onSave(service)}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Bookmark className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
