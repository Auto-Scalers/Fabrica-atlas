"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  RefreshCw,
  Lock,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  Plus,
  TrendingUp,
  Wallet,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { VaultUnlockDialog } from "@/components/field-ops/vault-unlock-dialog";
import type { FinancialMetric, FinancialSnapshot } from "@/lib/adapters/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AvailableIntegration {
  catalogId: string;
  name: string;
  category: string;
  icon?: string;
}

interface FinancialsResponse {
  vaultLocked: boolean;
  snapshots: FinancialSnapshot[];
  availableIntegrations: AvailableIntegration[];
  error?: string;
}

interface FinancialOverviewCardProps {
  /** "detailed" for Field Ops page, "summary" for Command Center. */
  variant: "detailed" | "summary";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const truncateAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const networkColor: Record<string, string> = {
  ethereum: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  base: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  sepolia: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const metricTypeIcon: Record<FinancialMetric["type"], typeof DollarSign> = {
  balance: Wallet,
  revenue: TrendingUp,
  spend: CreditCard,
  credit: DollarSign,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function FinancialOverviewCard({ variant }: FinancialOverviewCardProps) {
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  const fetchFinancials = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/api/field-ops/financials");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Silent fail — financials are supplementary
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  const handleUnlock = async (password: string): Promise<boolean> => {
    const res = await apiFetch("/api/field-ops/vault/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterPassword: password }),
    });
    if (res.ok) {
      // Vault unlocked — refresh financials to show real data
      await fetchFinancials(true);
      return true;
    }
    return false;
  };

  // ─── Self-hide when nothing to show ─────────────────────────────────────
  if (
    !loading &&
    data &&
    data.snapshots.length === 0 &&
    data.availableIntegrations.length === 0
  ) {
    return null;
  }

  // ─── Summary variant (Command Center) ───────────────────────────────────
  if (variant === "summary") {
    return (
      <>
        <SummaryCard
          data={data}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => fetchFinancials(true)}
          onUnlockVault={() => setShowUnlockDialog(true)}
        />
        <VaultUnlockDialog
          open={showUnlockDialog}
          onOpenChange={setShowUnlockDialog}
          onUnlock={handleUnlock}
          context="Unlock to view financial balances and metrics."
        />
      </>
    );
  }

  // ─── Detailed variant (Field Ops) ───────────────────────────────────────
  return (
    <>
      <DetailedCard
        data={data}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchFinancials(true)}
        onUnlockVault={() => setShowUnlockDialog(true)}
      />
      <VaultUnlockDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        onUnlock={handleUnlock}
        context="Unlock to view financial balances and metrics."
      />
    </>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────────────

function SummaryCard({
  data,
  loading,
  refreshing,
  onRefresh,
  onUnlockVault,
}: {
  data: FinancialsResponse | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onUnlockVault: () => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.snapshots.length === 0 && data.availableIntegrations.length === 0)) {
    return null;
  }

  const hasSnapshots = data.snapshots.length > 0;
  const hasMetrics = data.snapshots.some((s) => s.metrics.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financials
          </CardTitle>
          <div className="flex items-center gap-1">
            {hasSnapshots && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              </Button>
            )}
            <Link href="/field-ops" className="text-xs text-muted-foreground hover:text-foreground">
              View Details →
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.vaultLocked ? (
          <button
            type="button"
            onClick={onUnlockVault}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-3 w-3" />
            <span>Vault locked — click to unlock</span>
          </button>
        ) : hasMetrics ? (
          data.snapshots.map((snapshot) => (
            <div key={snapshot.serviceId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{snapshot.serviceName}</span>
                {snapshot.network && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1 py-0", networkColor[snapshot.network] ?? "")}
                  >
                    {snapshot.network}
                  </Badge>
                )}
              </div>
              {snapshot.error ? (
                <span className="text-xs text-red-400">{snapshot.error}</span>
              ) : (
                <div className="flex items-center gap-3 font-mono text-xs">
                  {snapshot.metrics.map((m) => (
                    <span key={m.label} title={m.detail}>
                      {m.value} {m.currency}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No financial data available</p>
        )}

        {data.availableIntegrations.length > 0 && !hasSnapshots && (
          <Link
            href="/field-ops/services"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Connect financial services
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Detailed Card ──────────────────────────────────────────────────────────

function DetailedCard({
  data,
  loading,
  refreshing,
  onRefresh,
  onUnlockVault,
}: {
  data: FinancialsResponse | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onUnlockVault: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial Overview
          </CardTitle>
          {data && data.snapshots.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <p className="text-xs text-muted-foreground">Failed to load financial data</p>
        ) : data.vaultLocked ? (
          <VaultLockedState onUnlockVault={onUnlockVault} />
        ) : data.snapshots.length > 0 ? (
          data.snapshots.map((snapshot) => (
            <ServiceFinancials key={snapshot.serviceId} snapshot={snapshot} />
          ))
        ) : null}

        {/* Available integrations prompt */}
        {!loading && data && data.snapshots.length === 0 && data.availableIntegrations.length > 0 && (
          <SetupPrompt integrations={data.availableIntegrations} />
        )}

        {/* Show setup link even when there are snapshots, if more integrations available */}
        {!loading && data && data.snapshots.length > 0 && data.availableIntegrations.length > 0 && (
          <div className="pt-2 border-t">
            <Link
              href="/field-ops/services"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Connect more financial services ({data.availableIntegrations.length} available)
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function VaultLockedState({ onUnlockVault }: { onUnlockVault: () => void }) {
  return (
    <div className="text-center py-4 space-y-2">
      <Lock className="h-5 w-5 mx-auto text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Vault locked</p>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-7"
        onClick={onUnlockVault}
      >
        <Lock className="h-3 w-3" />
        Unlock to view financials
      </Button>
    </div>
  );
}

function ServiceFinancials({ snapshot }: { snapshot: FinancialSnapshot }) {
  return (
    <div className="space-y-2">
      {/* Service header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{snapshot.serviceName}</span>
          {snapshot.network && (
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", networkColor[snapshot.network] ?? "")}
            >
              {snapshot.network}
            </Badge>
          )}
        </div>
        {snapshot.explorerUrl && (
          <a
            href={snapshot.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Address (for crypto) */}
      {snapshot.address && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">
            {truncateAddress(snapshot.address)}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => navigator.clipboard.writeText(snapshot.address!)}
          >
            <Copy className="h-2.5 w-2.5" />
          </Button>
        </div>
      )}

      {/* Error state */}
      {snapshot.error ? (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {snapshot.error}
        </div>
      ) : (
        /* Metrics grid */
        <div className={cn("grid gap-2", snapshot.metrics.length <= 2 ? "grid-cols-2" : "grid-cols-3")}>
          {snapshot.metrics.map((metric) => {
            const Icon = metricTypeIcon[metric.type];
            return (
              <div key={metric.label} className="rounded-md bg-muted/50 p-2">
                <div className="flex items-center gap-1">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {metric.label}
                  </p>
                </div>
                <p className="text-sm font-mono font-medium mt-0.5">
                  {metric.value}
                  {metric.currency && (
                    <span className="text-xs text-muted-foreground ml-1">{metric.currency}</span>
                  )}
                </p>
                {metric.detail && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{metric.detail}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SetupPrompt({ integrations }: { integrations: AvailableIntegration[] }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center space-y-3">
      <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/50" />
      <div>
        <p className="text-sm font-medium">Financial Tracking</p>
        <p className="text-xs text-muted-foreground mt-1">
          Connect services to track balances, revenue, spend, and API credits in one place.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {integrations.slice(0, 5).map((integration) => (
          <Badge key={integration.catalogId} variant="outline" className="text-xs">
            {integration.name}
          </Badge>
        ))}
        {integrations.length > 5 && (
          <Badge variant="outline" className="text-xs">
            +{integrations.length - 5} more
          </Badge>
        )}
      </div>
      <Link href="/field-ops/services">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3 w-3" />
          Connect a Service
        </Button>
      </Link>
    </div>
  );
}
