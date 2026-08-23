"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  AlertTriangle,
  Info,
  KeyRound,
  Bookmark,
  Search,
  Library,
  Settings,
  Loader2,
  FlaskConical,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { apiFetch } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CatalogServiceCard } from "@/components/field-ops/catalog-service-card";
import { GettingStartedCard } from "@/components/field-ops/getting-started-card";
import { SetupGuideDialog } from "@/components/field-ops/setup-guide-dialog";
import { ActivateServiceDialog } from "@/components/field-ops/activate-service-dialog";
import { SERVICE_CATEGORIES } from "@/lib/service-categories";
import type {
  FieldOpsService,
  CatalogService,
  ServiceStatus,
  ServiceAuthType,
  ServiceRiskLevel,
  ServiceCategory,
} from "@/lib/types";

// ─── Status / Risk styling helpers ──────────────────────────────────────────

function statusBadge(status: ServiceStatus) {
  switch (status) {
    case "saved":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
          <Bookmark className="h-3 w-3" /> Saved
        </Badge>
      );
    case "connected":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
          <Wifi className="h-3 w-3" /> Active
        </Badge>
      );
    case "disconnected":
      return (
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="h-3 w-3" /> Disconnected
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
          <AlertTriangle className="h-3 w-3" /> Error
        </Badge>
      );
  }
}

function riskBadge(level: ServiceRiskLevel) {
  switch (level) {
    case "high":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 text-[10px]">
          <ShieldAlert className="h-3 w-3" /> High Risk
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1 text-[10px]">
          <Shield className="h-3 w-3" /> Medium
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-[10px]">
          <ShieldCheck className="h-3 w-3" /> Low
        </Badge>
      );
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ServiceFormData {
  id: string;
  name: string;
  mcpPackage: string;
  authType: ServiceAuthType;
  riskLevel: ServiceRiskLevel;
}

const emptyForm: ServiceFormData = {
  id: "",
  name: "",
  mcpPackage: "",
  authType: "api-key",
  riskLevel: "medium",
};

type CatalogServiceWithSaved = CatalogService & { isSaved?: boolean };

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ServicesPage() {
  // My Services state
  const [services, setServices] = useState<FieldOpsService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ServiceFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [editingService, setEditingService] = useState<FieldOpsService | null>(null);

  // Catalog state
  const [catalog, setCatalog] = useState<CatalogServiceWithSaved[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | "all">("all");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [savingCatalogId, setSavingCatalogId] = useState<string | null>(null);

  // Dialog state
  const [guideService, setGuideService] = useState<CatalogService | null>(null);
  const [activateService, setActivateService] = useState<FieldOpsService | null>(null);
  const [activateCatalogEntry, setActivateCatalogEntry] = useState<CatalogService | null>(null);
  const [updateCredentialsMode, setUpdateCredentialsMode] = useState(false);

  // Test connection state
  const [testingServiceId, setTestingServiceId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; details: string; checkedAt: string; latencyMs?: number }>>({});

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    try {
      const res = await apiFetch("/api/field-ops/services");
      if (!res.ok) throw new Error("Failed to load services");
      const json = await res.json();
      setServices(json.services ?? json.data ?? []);
    } catch {
      showError("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await apiFetch(`/api/field-ops/catalog?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load catalog");
      const json = await res.json();
      setCatalog(json.data ?? []);
      if (json.meta?.categories) setCategoryCounts(json.meta.categories);
    } catch {
      showError("Failed to load service catalog");
    } finally {
      setCatalogLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // ─── My Services handlers ───────────────────────────────────────────────

  async function handleAddService() {
    if (!form.id.trim() || !form.name.trim() || !form.mcpPackage.trim()) {
      showError("ID, Name, and MCP Package are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/field-ops/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id.trim(),
          name: form.name.trim(),
          mcpPackage: form.mcpPackage.trim(),
          status: "disconnected" as ServiceStatus,
          authType: form.authType,
          credentialId: null,
          riskLevel: form.riskLevel,
          capabilities: [],
          allowedAgents: [],
          config: {},
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to add service");
      }
      showSuccess("Service added");
      setForm(emptyForm);
      setShowForm(false);
      await fetchServices();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to add service");
    } finally {
      setSaving(false);
    }
  }

  function handleEditService(svc: FieldOpsService) {
    setEditingService(svc);
    setForm({
      id: svc.id,
      name: svc.name,
      mcpPackage: svc.mcpPackage,
      authType: svc.authType,
      riskLevel: svc.riskLevel,
    });
    setShowForm(true);
  }

  async function handleUpdateService() {
    if (!form.name.trim() || !form.mcpPackage.trim()) {
      showError("Name and MCP Package are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/field-ops/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingService!.id,
          name: form.name.trim(),
          mcpPackage: form.mcpPackage.trim(),
          authType: form.authType,
          riskLevel: form.riskLevel,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to update service");
      }
      showSuccess("Service updated");
      handleCancelForm();
      await fetchServices();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update service");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingService(null);
    setForm(emptyForm);
  }

  async function handleRemoveService(id: string) {
    try {
      const res = await apiFetch(`/api/field-ops/services?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove service");
      showSuccess("Service removed");
      await Promise.all([fetchServices(), fetchCatalog()]);
    } catch {
      showError("Failed to remove service");
    }
  }

  // ─── Catalog handlers ──────────────────────────────────────────────────

  async function handleSaveFromCatalog(service: CatalogService) {
    setSavingCatalogId(service.id);
    try {
      const res = await apiFetch("/api/field-ops/services/save-from-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId: service.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to save service");
      }
      showSuccess(`${service.name} saved to My Services`);
      await Promise.all([fetchServices(), fetchCatalog()]);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save service");
    } finally {
      setSavingCatalogId(null);
    }
  }

  function handleActivateClick(svc: FieldOpsService) {
    const catalogEntry = catalog.find((c) => c.id === svc.catalogId || c.id === svc.id) ?? null;
    setActivateService(svc);
    setActivateCatalogEntry(catalogEntry);
    setUpdateCredentialsMode(false);
  }

  function handleUpdateCredentialsClick(svc: FieldOpsService) {
    const catalogEntry = catalog.find((c) => c.id === svc.catalogId || c.id === svc.id) ?? null;
    setActivateService(svc);
    setActivateCatalogEntry(catalogEntry);
    setUpdateCredentialsMode(true);
  }

  async function handleActivated() {
    showSuccess(updateCredentialsMode ? "Credentials updated!" : "Service activated!");
    setUpdateCredentialsMode(false);
    await Promise.all([fetchServices(), fetchCatalog()]);
  }

  async function handleTestService(svcId: string) {
    setTestingServiceId(svcId);
    try {
      const res = await apiFetch("/api/field-ops/services/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: svcId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        showError("Vault is locked — unlock the vault first to test credentials.");
        return;
      }
      setTestResults((prev) => ({
        ...prev,
        [svcId]: {
          valid: data.valid ?? false,
          details: data.details ?? data.error ?? "Unknown result",
          checkedAt: data.checkedAt ?? new Date().toISOString(),
          latencyMs: data.latencyMs ?? undefined,
        },
      }));
      if (data.valid) {
        showSuccess(`Connection test passed for ${services.find((s) => s.id === svcId)?.name ?? svcId}`);
      } else {
        showError(`Connection test failed: ${data.details ?? data.error ?? "Unknown error"}`);
      }
    } catch {
      showError("Failed to run connection test");
    } finally {
      setTestingServiceId(null);
    }
  }

  // ─── Filtered services for My Services tab ─────────────────────────────

  const filteredServices =
    statusFilter === "all"
      ? services
      : services.filter((s) => s.status === statusFilter);

  const savedCount = services.filter((s) => s.status === "saved").length;
  const activeCount = services.filter((s) => s.status === "connected").length;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Field Ops", href: "/field-ops" },
          { label: "Services" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Services
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect external platforms so your AI agents can take real actions.{" "}
          {activeCount} active, {savedCount} saved.
        </p>
      </div>

      {/* Tabbed Layout */}
      <Tabs defaultValue="my-services">
        <TabsList className="mb-4">
          <TabsTrigger value="my-services" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            My Services
            {services.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                {services.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5">
            <Library className="h-3.5 w-3.5" />
            Service Library
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: MY SERVICES
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="my-services" className="space-y-4">
          {/* Controls row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Status filter */}
            <div className="flex gap-1.5">
              {(["all", "saved", "connected", "disconnected", "error"] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s === "connected" ? "Active" : s.charAt(0).toUpperCase() + s.slice(1)}
                  {s !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({services.filter((svc) => svc.status === s).length})
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Add custom */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => showForm ? handleCancelForm() : setShowForm(true)}
            >
              {showForm ? (
                <>
                  <X className="h-3.5 w-3.5" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Add Custom
                </>
              )}
            </Button>
          </div>

          {/* Inline Add Form */}
          {showForm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {editingService ? `Edit Service: ${editingService.name}` : "Add Custom Service (unlisted MCP package)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="svc-id">Service ID (slug)</Label>
                    <Input
                      id="svc-id"
                      placeholder="e.g. github, slack"
                      value={form.id}
                      onChange={(e) => setForm({ ...form, id: e.target.value })}
                      disabled={!!editingService}
                      className={editingService ? "opacity-60" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="svc-name">Display Name</Label>
                    <Input
                      id="svc-name"
                      placeholder="e.g. GitHub"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="svc-pkg">MCP Package</Label>
                    <Input
                      id="svc-pkg"
                      placeholder="e.g. @anthropic/mcp-github"
                      value={form.mcpPackage}
                      onChange={(e) => setForm({ ...form, mcpPackage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="svc-auth">Auth Type</Label>
                    <select
                      id="svc-auth"
                      className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={form.authType}
                      onChange={(e) =>
                        setForm({ ...form, authType: e.target.value as ServiceAuthType })
                      }
                    >
                      <option value="api-key">API Key</option>
                      <option value="oauth2">OAuth 2.0</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="svc-risk">Risk Level</Label>
                    <select
                      id="svc-risk"
                      className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={form.riskLevel}
                      onChange={(e) =>
                        setForm({ ...form, riskLevel: e.target.value as ServiceRiskLevel })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end gap-2">
                  {editingService && (
                    <Button size="sm" variant="ghost" onClick={handleCancelForm} disabled={saving}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={editingService ? handleUpdateService : handleAddService}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : editingService ? "Update Service" : "Save Service"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5 space-y-3">
                    <div className="h-5 w-32 bg-muted rounded" />
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && services.length === 0 && (
            <>
              <GettingStartedCard
                title="Connect Your First Service"
                description="Services are the external platforms your agents will interact with — Twitter, Stripe, Ethereum, email providers, and more. Browse the catalog to see what's available, then activate a service by providing your API credentials."
                steps={[
                  "Switch to the 'Service Library' tab above",
                  "Find a service and click its setup guide",
                  "Add your credentials in the Vault",
                  "Activate the service",
                ]}
                learnMoreHref="/guide#field-ops"
                storageKey="mc-fieldops-services-intro"
              />
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold">No services yet</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Browse the Service Library to find and save services, or add a custom one.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Filtered empty */}
          {!loading && services.length > 0 && filteredServices.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No services with status &quot;{statusFilter}&quot;.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Service cards grid */}
          {!loading && filteredServices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((svc) => (
                <Card
                  key={svc.id}
                  className={cn(
                    "group",
                    svc.status === "saved" && "border-amber-500/30"
                  )}
                >
                  <CardContent className="p-5 space-y-3">
                    {/* Top row: name + status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                            svc.status === "saved"
                              ? "bg-amber-500/10"
                              : svc.status === "connected"
                              ? "bg-green-500/10"
                              : "bg-primary/10"
                          )}
                        >
                          {svc.status === "saved" ? (
                            <Bookmark className="h-4.5 w-4.5 text-amber-400" />
                          ) : (
                            <Globe className="h-4.5 w-4.5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-tight">{svc.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {catalog.find((c) => c.id === svc.catalogId)?.description ??
                              (svc.mcpPackage ? svc.mcpPackage : "Custom service")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {statusBadge(svc.status)}
                      </div>
                    </div>

                    {/* Risk level + auth */}
                    <div className="flex items-center gap-2">
                      {riskBadge(svc.riskLevel)}
                      <Badge variant="outline" className="text-xs">
                        {svc.authType}
                      </Badge>
                    </div>

                    {/* Capabilities */}
                    {svc.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {svc.capabilities.map((cap) => (
                          <Badge
                            key={cap}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Allowed agents */}
                    {svc.allowedAgents.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Agents:</span>
                        {svc.allowedAgents.map((agent) => (
                          <Badge
                            key={agent}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {agent}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Test result (shown after test runs) */}
                    {testResults[svc.id] && (
                      <div className={cn(
                        "flex items-start gap-2 rounded-md px-2.5 py-2 text-xs",
                        testResults[svc.id].valid
                          ? "bg-green-500/10 border border-green-500/20 text-green-400"
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                      )}>
                        {testResults[svc.id].valid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        )}
                        <span>
                          {testResults[svc.id].details}
                          {testResults[svc.id].latencyMs != null && (
                            <span className="opacity-60 ml-1">({testResults[svc.id].latencyMs}ms)</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <Separator />
                    <div className="flex items-center justify-between gap-2">
                      {/* Left: Setup Guide + Test */}
                      <div className="flex items-center gap-1">
                        {/* Setup Guide — show for non-connected services with a catalog entry */}
                        {svc.status !== "connected" && (() => {
                          const entry = catalog.find((c) => c.id === svc.catalogId);
                          return entry ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setGuideService(entry)}
                            >
                              <Info className="h-3 w-3" /> Setup Guide
                            </Button>
                          ) : null;
                        })()}
                        {/* Test button — only when credentials are stored */}
                        {svc.credentialId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-indigo-400 hover:text-indigo-300"
                            disabled={testingServiceId === svc.id}
                            onClick={() => handleTestService(svc.id)}
                          >
                            {testingServiceId === svc.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Testing...</>
                            ) : (
                              <><FlaskConical className="h-3 w-3" /> Test</>
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {svc.status === "saved" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleActivateClick(svc)}
                          >
                            <Settings className="h-3 w-3" /> Configure & Activate
                          </Button>
                        )}
                        {svc.status === "disconnected" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleActivateClick(svc)}
                          >
                            <Settings className="h-3 w-3" /> Reconnect
                          </Button>
                        )}
                        {svc.status === "connected" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleUpdateCredentialsClick(svc)}
                          >
                            <KeyRound className="h-3 w-3" /> Update Credentials
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleEditService(svc)}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("h-7 text-xs gap-1 text-red-400 hover:text-red-300")}
                          onClick={() => handleRemoveService(svc.id)}
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: SERVICE LIBRARY
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="library" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services (e.g. twitter, payments, analytics...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setSelectedCategory("all")}
            >
              All
              <span className="ml-1 opacity-60">
                ({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})
              </span>
            </Button>
            {SERVICE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              if (count === 0) return null;
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2.5 gap-1"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                  <span className="opacity-60">({count})</span>
                </Button>
              );
            })}
          </div>

          {/* Catalog Loading */}
          {catalogLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Catalog empty */}
          {!catalogLoading && catalog.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Library className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold">No services found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term or category.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Catalog grid */}
          {!catalogLoading && catalog.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((svc) => (
                <CatalogServiceCard
                  key={svc.id}
                  service={svc}
                  onSave={handleSaveFromCatalog}
                  onViewGuide={setGuideService}
                  saving={savingCatalogId === svc.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ─────────────────────────────────────────────────────── */}

      <SetupGuideDialog
        service={guideService}
        open={!!guideService}
        onOpenChange={(open) => !open && setGuideService(null)}
      />

      {activateService && (
        <ActivateServiceDialog
          service={activateService}
          catalogEntry={activateCatalogEntry}
          open={!!activateService}
          onOpenChange={(open) => {
            if (!open) {
              setActivateService(null);
              setActivateCatalogEntry(null);
              setUpdateCredentialsMode(false);
            }
          }}
          onActivated={handleActivated}
          updateMode={updateCredentialsMode}
        />
      )}
    </div>
  );
}
