"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  DollarSign,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { apiFetch } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { FieldOpsService } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GlobalBudget {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  autoPauseOnBreach: boolean;
  enabled: boolean;
}

interface ServiceLimit {
  serviceId: string;
  enabled: boolean;
  maxPerTransaction: number;
  dailyLimit: number;
  approvedRecipients: string[];
}

interface SpendLogEntry {
  date: string;
  serviceId: string;
  amount: number;
  operation: string;
  taskId: string | null;
}

interface SpendSummary {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  byService: Record<string, { today: number; week: number; month: number }>;
}

interface SafetyLimitsResponse {
  global: GlobalBudget;
  services: ServiceLimit[];
  spendLog: SpendLogEntry[];
  spendSummary: SpendSummary;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function spendPercentage(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min((spent / limit) * 100, 100);
}

function spendBarColor(pct: number): string {
  if (pct > 80) return "bg-red-500";
  if (pct > 50) return "bg-amber-500";
  return "bg-green-500";
}

// ─── Spend Progress Bar ─────────────────────────────────────────────────────

function SpendBar({ spent, limit, label }: { spent: number; limit: number; label: string }) {
  const pct = spendPercentage(spent, limit);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {formatCurrency(spent)} / {formatCurrency(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", spendBarColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function SafetyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Safety limits state
  const [global, setGlobal] = useState<GlobalBudget>({
    dailyLimit: 100,
    weeklyLimit: 500,
    monthlyLimit: 2000,
    autoPauseOnBreach: true,
    enabled: true,
  });
  const [serviceLimits, setServiceLimits] = useState<ServiceLimit[]>([]);
  const [spendLog, setSpendLog] = useState<SpendLogEntry[]>([]);
  const [spendSummary, setSpendSummary] = useState<SpendSummary>({
    todayTotal: 0,
    weekTotal: 0,
    monthTotal: 0,
    byService: {},
  });

  // High-risk services from services endpoint
  const [highRiskServices, setHighRiskServices] = useState<FieldOpsService[]>([]);

  // Collapsible service sections
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  // New recipient input per service
  const [newRecipient, setNewRecipient] = useState<Record<string, string>>({});

  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [limitsRes, servicesRes] = await Promise.all([
        apiFetch("/api/field-ops/safety-limits"),
        apiFetch("/api/field-ops/services"),
      ]);

      if (limitsRes.ok) {
        const raw = await limitsRes.json();
        // Transform API shape to UI shape
        setGlobal({
          dailyLimit: raw.global?.dailyBudgetUsd ?? 100,
          weeklyLimit: raw.global?.weeklyBudgetUsd ?? 500,
          monthlyLimit: raw.global?.monthlyBudgetUsd ?? 2000,
          autoPauseOnBreach: raw.global?.pauseOnBreach ?? true,
          enabled: raw.global?.enabled ?? true,
        });
        // services is Record<string, ServiceSpendLimit> → convert to array
        const svcObj: Record<string, { maxPerTxUsd?: number; dailyLimitUsd?: number; approvedRecipients?: string[]; enabled?: boolean }> = raw.services ?? {};
        setServiceLimits(
          Object.entries(svcObj).map(([id, limit]) => ({
            serviceId: id,
            enabled: limit.enabled ?? true,
            maxPerTransaction: limit.maxPerTxUsd ?? 50,
            dailyLimit: limit.dailyLimitUsd ?? 100,
            approvedRecipients: limit.approvedRecipients ?? [],
          })),
        );
        setSpendLog((raw.spendLog ?? []).slice(0, 20).map((e: Record<string, unknown>) => ({
          date: (e.timestamp as string) ?? "",
          serviceId: (e.serviceId as string) ?? "",
          amount: (e.amountUsd as number) ?? 0,
          operation: (e.operation as string) ?? "",
          taskId: (e.taskId as string) ?? null,
        })));
        setSpendSummary(raw.spendSummary ?? { todayTotal: 0, weekTotal: 0, monthTotal: 0, byService: {} });
      }

      if (servicesRes.ok) {
        const svcData = await servicesRes.json();
        const allServices: FieldOpsService[] = svcData.services ?? svcData.data ?? [];
        setHighRiskServices(allServices.filter((s) => s.riskLevel === "high"));
      }
    } catch {
      showError("Failed to load safety controls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Service Limit Helpers ────────────────────────────────────────────

  function toggleServiceExpanded(serviceId: string) {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }

  function getServiceLimit(serviceId: string): ServiceLimit {
    const existing = serviceLimits.find((sl) => sl.serviceId === serviceId);
    if (existing) return existing;
    return {
      serviceId,
      enabled: false,
      maxPerTransaction: 50,
      dailyLimit: 100,
      approvedRecipients: [],
    };
  }

  function updateServiceLimit(serviceId: string, updates: Partial<ServiceLimit>) {
    setServiceLimits((prev) => {
      const idx = prev.findIndex((sl) => sl.serviceId === serviceId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...updates };
        return updated;
      }
      return [...prev, { ...getServiceLimit(serviceId), ...updates }];
    });
  }

  function addRecipient(serviceId: string) {
    const value = (newRecipient[serviceId] ?? "").trim();
    if (!value) return;
    const limit = getServiceLimit(serviceId);
    if (limit.approvedRecipients.includes(value)) {
      showError("Recipient already exists");
      return;
    }
    updateServiceLimit(serviceId, {
      approvedRecipients: [...limit.approvedRecipients, value],
    });
    setNewRecipient((prev) => ({ ...prev, [serviceId]: "" }));
  }

  function removeRecipient(serviceId: string, recipient: string) {
    const limit = getServiceLimit(serviceId);
    updateServiceLimit(serviceId, {
      approvedRecipients: limit.approvedRecipients.filter((r) => r !== recipient),
    });
  }

  // ─── Save Flow ────────────────────────────────────────────────────────

  function handleSaveClick() {
    setDialogError("");
    setMasterPassword("");
    setShowPassword(false);
    setShowPasswordDialog(true);
  }

  async function handleConfirmSave() {
    if (!masterPassword.trim()) {
      setDialogError("Master password is required.");
      return;
    }

    setSaving(true);
    setDialogError("");

    try {
      const res = await apiFetch("/api/field-ops/safety-limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterPassword: masterPassword.trim(),
          global: {
            enabled: global.enabled,
            dailyBudgetUsd: global.dailyLimit,
            weeklyBudgetUsd: global.weeklyLimit,
            monthlyBudgetUsd: global.monthlyLimit,
            pauseOnBreach: global.autoPauseOnBreach,
          },
          services: Object.fromEntries(
            serviceLimits.map((sl) => [
              sl.serviceId,
              {
                maxPerTxUsd: sl.maxPerTransaction,
                dailyLimitUsd: sl.dailyLimit,
                approvedRecipients: sl.approvedRecipients,
                enabled: sl.enabled,
              },
            ]),
          ),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to save safety controls");
      }

      showSuccess("Safety controls updated");
      setShowPasswordDialog(false);
      setMasterPassword("");
      await fetchData();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav
          items={[
            { label: "Field Ops", href: "/field-ops" },
            { label: "Safety" },
          ]}
        />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 w-48 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-64 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <BreadcrumbNav
        items={[
          { label: "Field Ops", href: "/field-ops" },
          { label: "Safety" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Financial Safety Controls
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set spending limits and budgets that apply to all agent operations.
          Changes require your master password.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">Owner-Only Controls</p>
          <p className="text-xs text-amber-400/80 mt-0.5">
            These controls can only be modified by you &mdash; agents cannot change safety limits.
          </p>
        </div>
      </div>

      {/* ═══ Global Budget Card ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Global Budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="global-enabled"
              checked={global.enabled}
              onCheckedChange={(checked) =>
                setGlobal((prev) => ({ ...prev, enabled: checked === true }))
              }
            />
            <Label htmlFor="global-enabled" className="text-sm cursor-pointer">
              Budget enforcement enabled
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Daily Limit */}
            <div className="space-y-2">
              <Label htmlFor="global-daily">Daily Limit (USD)</Label>
              <Input
                id="global-daily"
                type="number"
                min={0}
                step={1}
                value={global.dailyLimit}
                onChange={(e) =>
                  setGlobal((prev) => ({ ...prev, dailyLimit: Number(e.target.value) || 0 }))
                }
              />
              <SpendBar
                spent={spendSummary.todayTotal}
                limit={global.dailyLimit}
                label="Today"
              />
            </div>

            {/* Weekly Limit */}
            <div className="space-y-2">
              <Label htmlFor="global-weekly">Weekly Limit (USD)</Label>
              <Input
                id="global-weekly"
                type="number"
                min={0}
                step={1}
                value={global.weeklyLimit}
                onChange={(e) =>
                  setGlobal((prev) => ({ ...prev, weeklyLimit: Number(e.target.value) || 0 }))
                }
              />
              <SpendBar
                spent={spendSummary.weekTotal}
                limit={global.weeklyLimit}
                label="This week"
              />
            </div>

            {/* Monthly Limit */}
            <div className="space-y-2">
              <Label htmlFor="global-monthly">Monthly Limit (USD)</Label>
              <Input
                id="global-monthly"
                type="number"
                min={0}
                step={1}
                value={global.monthlyLimit}
                onChange={(e) =>
                  setGlobal((prev) => ({ ...prev, monthlyLimit: Number(e.target.value) || 0 }))
                }
              />
              <SpendBar
                spent={spendSummary.monthTotal}
                limit={global.monthlyLimit}
                label="This month"
              />
            </div>
          </div>

          <Separator />

          {/* Auto-pause toggle */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="global-autopause"
              checked={global.autoPauseOnBreach}
              onCheckedChange={(checked) =>
                setGlobal((prev) => ({ ...prev, autoPauseOnBreach: checked === true }))
              }
            />
            <div>
              <Label htmlFor="global-autopause" className="text-sm cursor-pointer">
                Auto-pause on breach
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically pause all agent operations if any budget limit is exceeded.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Per-Service Limits ═══ */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Service Limits
        </h2>
        <p className="text-xs text-muted-foreground">
          Individual spending controls for high-risk (financial) services.
        </p>

        {highRiskServices.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No high-risk services configured.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add financial services (risk level: high) in the Services page to configure per-service limits.
              </p>
            </CardContent>
          </Card>
        )}

        {highRiskServices.map((svc) => {
          const limit = getServiceLimit(svc.id);
          const isExpanded = expandedServices.has(svc.id);
          const svcSpend = spendSummary.byService[svc.id]?.today ?? 0;

          return (
            <Card key={svc.id}>
              <CardContent className="p-0">
                {/* Collapsible header */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleServiceExpanded(svc.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium truncate">{svc.name}</span>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                      High Risk
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Today: {formatCurrency(svcSpend)} / {formatCurrency(limit.dailyLimit)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        limit.enabled
                          ? "text-green-400 border-green-500/30"
                          : "text-zinc-400 border-zinc-500/30"
                      )}
                    >
                      {limit.enabled ? "Active" : "Off"}
                    </Badge>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t px-5 py-4 space-y-4">
                    {/* Enabled toggle */}
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`svc-enabled-${svc.id}`}
                        checked={limit.enabled}
                        onCheckedChange={(checked) =>
                          updateServiceLimit(svc.id, { enabled: checked === true })
                        }
                      />
                      <Label htmlFor={`svc-enabled-${svc.id}`} className="text-sm cursor-pointer">
                        Enable spending limits for {svc.name}
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Max per transaction */}
                      <div className="space-y-2">
                        <Label htmlFor={`svc-maxtx-${svc.id}`}>Max Per Transaction (USD)</Label>
                        <Input
                          id={`svc-maxtx-${svc.id}`}
                          type="number"
                          min={0}
                          step={1}
                          value={limit.maxPerTransaction}
                          onChange={(e) =>
                            updateServiceLimit(svc.id, {
                              maxPerTransaction: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      {/* Daily limit */}
                      <div className="space-y-2">
                        <Label htmlFor={`svc-daily-${svc.id}`}>Daily Limit (USD)</Label>
                        <Input
                          id={`svc-daily-${svc.id}`}
                          type="number"
                          min={0}
                          step={1}
                          value={limit.dailyLimit}
                          onChange={(e) =>
                            updateServiceLimit(svc.id, {
                              dailyLimit: Number(e.target.value) || 0,
                            })
                          }
                        />
                        <SpendBar
                          spent={svcSpend}
                          limit={limit.dailyLimit}
                          label="Today"
                        />
                      </div>
                    </div>

                    {/* Approved Recipients */}
                    <div className="space-y-2">
                      <Label>Approved Recipients</Label>
                      <p className="text-xs text-muted-foreground">
                        Only these addresses can receive funds from this service.
                      </p>

                      {limit.approvedRecipients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {limit.approvedRecipients.map((addr) => (
                            <Badge
                              key={addr}
                              variant="secondary"
                              className="gap-1 text-xs pr-1"
                            >
                              <span className="truncate max-w-[200px]">{addr}</span>
                              <button
                                type="button"
                                className="ml-0.5 rounded-sm hover:bg-destructive/20 p-0.5"
                                onClick={() => removeRecipient(svc.id, addr)}
                              >
                                <Trash2 className="h-3 w-3 text-red-400" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add recipient address..."
                          value={newRecipient[svc.id] ?? ""}
                          onChange={(e) =>
                            setNewRecipient((prev) => ({
                              ...prev,
                              [svc.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addRecipient(svc.id);
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 shrink-0"
                          onClick={() => addRecipient(svc.id)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ═══ Recent Spend History ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Recent Spend History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {spendLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-5">
              <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No spending activity yet</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] gap-4 px-5 py-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Date</span>
                <span>Service</span>
                <span className="text-right">Amount</span>
                <span>Operation</span>
                <span>Task</span>
              </div>

              {/* Rows */}
              {spendLog.map((entry, idx) => (
                <div
                  key={`${entry.date}-${entry.serviceId}-${idx}`}
                  className={cn(
                    "grid grid-cols-[1fr_1fr_auto_1fr_1fr] gap-4 items-center px-5 py-3",
                    idx < spendLog.length - 1 && "border-b"
                  )}
                >
                  <span className="text-sm text-muted-foreground">
                    {formatDate(entry.date)}
                  </span>
                  <span className="text-sm font-medium">{entry.serviceId}</span>
                  <span className="text-sm font-medium text-right">
                    {formatCurrency(entry.amount)}
                  </span>
                  <span className="text-sm text-muted-foreground">{entry.operation}</span>
                  <span className="text-sm text-muted-foreground truncate">
                    {entry.taskId ?? "\u2014"}
                  </span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══ Sticky Save Bar ═══ */}
      <div className="sticky bottom-0 z-40 -mx-4 md:-mx-6 border-t bg-card/95 backdrop-blur-sm px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Changes are not saved until you confirm with your master password.
          </p>
          <Button size="sm" className="gap-1.5" onClick={handleSaveClick}>
            <Shield className="h-3.5 w-3.5" /> Save Changes
          </Button>
        </div>
      </div>

      {/* ═══ Master Password Dialog ═══ */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirm Safety Changes
            </DialogTitle>
            <DialogDescription>
              Enter your master password to update safety controls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="safety-master-pw">Master Password</Label>
              <div className="relative">
                <Input
                  id="safety-master-pw"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your master password"
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    setDialogError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmSave();
                    }
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Forgot your password?{" "}
                <Link href="/field-ops/vault" className="text-red-400 hover:underline">
                  Reset vault
                </Link>
              </p>
            </div>

            {dialogError && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{dialogError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setMasterPassword("");
                  setDialogError("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
