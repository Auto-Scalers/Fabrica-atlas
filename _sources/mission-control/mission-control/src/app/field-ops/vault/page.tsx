"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  RotateCcw,
  Loader2,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { VaultSetupWizard, VaultSecurityDetails } from "@/components/vault-setup-wizard";
import { apiFetch } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useVaultSession } from "@/hooks/use-field-ops";

// ─── Types (metadata only — secrets never returned from API) ────────────────

interface CredentialMeta {
  id: string;
  serviceId: string;
  createdAt: string;
  expiresAt: string | null;
}

interface VaultHealth {
  totalCredentials: number;
  legacyCredentials: number;
  encryptedCredentials: number;
  masterKeyFormat: "scrypt" | "sha256" | "none";
  isHealthy: boolean;
}

interface CredentialFormData {
  serviceId: string;
  apiKey: string;
  masterPassword: string;
}

const emptyForm: CredentialFormData = {
  serviceId: "",
  apiKey: "",
  masterPassword: "",
};

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

// ─── Security Banner ────────────────────────────────────────────────────────

function SecurityBanner({ health }: { health: VaultHealth | null }) {
  if (!health) return null;

  // Empty vault
  if (health.totalCredentials === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-300">Vault Ready</p>
          <p className="text-xs text-blue-400/80 mt-0.5">
            Credentials will be encrypted with AES-256-GCM and a password-derived key
            (scrypt). Never share the vault file or your master password.
          </p>
        </div>
      </div>
    );
  }

  // Has legacy credentials needing migration
  if (health.legacyCredentials > 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
        <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-300">Migration Required</p>
          <p className="text-xs text-yellow-400/80 mt-0.5">
            {health.legacyCredentials} credential{health.legacyCredentials !== 1 ? "s use" : " uses"}{" "}
            legacy encoding. Store a new credential to automatically upgrade all credentials
            to AES-256-GCM encryption.
          </p>
        </div>
      </div>
    );
  }

  // All healthy
  return (
    <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
      <ShieldCheck className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-green-300">AES-256-GCM Encryption Active</p>
        <p className="text-xs text-green-400/80 mt-0.5">
          All {health.encryptedCredentials} credential{health.encryptedCredentials !== 1 ? "s are" : " is"}{" "}
          encrypted at rest with a password-derived key (scrypt). Never share the vault file
          or your master password.
        </p>
      </div>
    </div>
  );
}

// ─── Health Badge ───────────────────────────────────────────────────────────

function HealthBadge({ health }: { health: VaultHealth | null }) {
  if (!health) return null;

  if (health.totalCredentials === 0) {
    return (
      <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-500/30">
        Empty
      </Badge>
    );
  }

  if (health.isHealthy) {
    return (
      <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
        Healthy
      </Badge>
    );
  }

  return (
    <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
      Migration Needed
    </Badge>
  );
}

// ─── Vault Session Card ────────────────────────────────────────────────────

function VaultSessionCard() {
  const vaultSession = useVaultSession();
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMs, setDisplayMs] = useState(vaultSession.remainingMs);

  // Update countdown every 10 seconds
  useEffect(() => {
    if (!vaultSession.active) {
      setDisplayMs(0);
      return;
    }
    setDisplayMs(vaultSession.remainingMs);
    const interval = setInterval(() => {
      setDisplayMs((prev) => Math.max(0, prev - 10_000));
    }, 10_000);
    return () => clearInterval(interval);
  }, [vaultSession.active, vaultSession.remainingMs]);

  const minutes = Math.ceil(displayMs / 60_000);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setUnlocking(true);
    setError(null);
    try {
      const success = await vaultSession.unlock(password);
      if (success) {
        showSuccess("Vault session unlocked (30 min)");
        setPassword("");
      } else {
        setError("Invalid master password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleLock() {
    await vaultSession.lock();
    showSuccess("Vault session locked");
  }

  if (vaultSession.active) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Unlock className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-300">Vault Session Active</p>
              <p className="text-xs text-green-400/70 flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {minutes > 0 ? `${minutes}m remaining` : "Expiring soon"} — credentials auto-decrypted for task execution
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-green-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={handleLock}
          >
            <Lock className="h-3.5 w-3.5" /> Lock Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={handleUnlock} className="flex items-end gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Vault Locked</p>
              <Input
                type="password"
                placeholder="Enter master password to unlock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={unlocking}
                className="h-8 text-sm"
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>
          </div>
          <Button type="submit" size="sm" disabled={unlocking || !password.trim()} className="gap-1.5">
            {unlocking ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Unlocking...</>
            ) : (
              <><Unlock className="h-3.5 w-3.5" /> Unlock</>
            )}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground/60 mt-2 ml-8">
          Unlocking caches your password in memory for 30 minutes. Never stored on disk.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function VaultPage() {
  const [credentials, setCredentials] = useState<CredentialMeta[]>([]);
  const [health, setHealth] = useState<VaultHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CredentialFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showMasterPw, setShowMasterPw] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchCredentials = useCallback(async () => {
    try {
      const [credRes, healthRes] = await Promise.all([
        apiFetch("/api/field-ops/vault"),
        apiFetch("/api/field-ops/vault?health=true"),
      ]);
      if (credRes.ok) {
        const json = await credRes.json();
        setCredentials(json.credentials ?? json.data ?? []);
      }
      if (healthRes.ok) {
        const healthJson = await healthRes.json();
        setHealth(healthJson);
      }
    } catch {
      showError("Failed to load credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  async function handleAddCredential() {
    if (!form.serviceId.trim()) {
      showError("Service ID is required.");
      return;
    }
    if (!form.apiKey.trim()) {
      showError("API Key / Token is required.");
      return;
    }
    if (!form.masterPassword.trim()) {
      showError("Master Password is required for encryption.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/field-ops/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: form.serviceId.trim(),
          data: form.apiKey.trim(),
          masterPassword: form.masterPassword.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to store credential");
      }
      showSuccess("Credential encrypted and stored");
      setForm(emptyForm);
      setShowForm(false);
      setShowApiKey(false);
      setShowMasterPw(false);
      await fetchCredentials();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to store credential");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await apiFetch(`/api/field-ops/vault?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke credential");
      showSuccess("Credential revoked");
      await fetchCredentials();
    } catch {
      showError("Failed to revoke credential");
    }
  }

  async function handleResetVault() {
    setResetting(true);
    try {
      const res = await apiFetch("/api/field-ops/vault/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_VAULT" }),
      });
      if (!res.ok) throw new Error("Failed to reset vault");
      showSuccess("Vault has been reset. Set a new master password to start fresh.");
      setShowResetDialog(false);
      setResetConfirmText("");
      await fetchCredentials();
    } catch {
      showError("Failed to reset vault");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Field Ops", href: "/field-ops" },
          { label: "Vault" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Credential Vault
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {credentials.length} credential{credentials.length !== 1 ? "s" : ""} stored
            </p>
          </div>
          <HealthBadge health={health} />
        </div>
        <div className="flex items-center gap-2">
          {health?.masterKeyFormat !== "none" && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => setShowResetDialog(true)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Vault
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? (
              <>
                <X className="h-3.5 w-3.5" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Add Credential
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Vault description */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          The Credential Vault securely stores your API keys, tokens, and secrets so AI agents
          can use them during task execution without exposing sensitive data. Everything is encrypted
          with AES-256-GCM using a key derived from your master password.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Your master password is never stored &mdash; it&apos;s hashed with scrypt for verification and used
          to derive the encryption key on-the-fly. If you forget it, credentials must be re-entered.
        </p>
      </div>

      {/* Dynamic security banner */}
      <SecurityBanner health={health} />

      {/* Vault session unlock/lock controls */}
      {!loading && health?.masterKeyFormat !== "none" && (
        <VaultSessionCard />
      )}

      {/* Inline Add Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Store New Credential
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cred-svc">Service ID</Label>
              <Input
                id="cred-svc"
                placeholder="e.g. github, slack, stripe"
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-key">API Key / Token</Label>
              <div className="relative">
                <Input
                  id="cred-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Paste your API key or token"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey((prev) => !prev)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-master">Master Password</Label>
              <div className="relative">
                <Input
                  id="cred-master"
                  type={showMasterPw ? "text" : "password"}
                  placeholder="Encryption password"
                  value={form.masterPassword}
                  onChange={(e) =>
                    setForm({ ...form, masterPassword: e.target.value })
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowMasterPw((prev) => !prev)}
                >
                  {showMasterPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used to derive AES-256 encryption key via scrypt. You must use the same
                password for all credentials.
              </p>
            </div>
            <Separator />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddCredential} disabled={saving}>
                {saving ? "Encrypting..." : "Store Credential"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="animate-pulse">
          <CardContent className="p-5 space-y-3">
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </CardContent>
        </Card>
      )}

      {/* Vault not initialized — show setup wizard */}
      {!loading && health?.masterKeyFormat === "none" && (
        <VaultSetupWizard onComplete={fetchCredentials} />
      )}

      {/* Vault initialized but no credentials */}
      {!loading && health?.masterKeyFormat !== "none" && credentials.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold">No credentials stored</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Your vault is ready. Add credentials for your connected services.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Security details — always visible when vault is initialized */}
      {!loading && health?.masterKeyFormat !== "none" && (
        <VaultSecurityDetails />
      )}

      {/* Credential list (table-like) */}
      {!loading && credentials.length > 0 && (
        <Card>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Service</span>
              <span>Created</span>
              <span>Expires</span>
              <span className="text-right">Action</span>
            </div>

            {/* Rows */}
            {credentials.map((cred, idx) => (
              <div
                key={cred.id}
                className={cn(
                  "grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3",
                  idx < credentials.length - 1 && "border-b"
                )}
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{cred.serviceId}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(cred.createdAt)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {cred.expiresAt ? (
                    <span
                      className={cn(
                        new Date(cred.expiresAt) < new Date() && "text-red-400"
                      )}
                    >
                      {formatDate(cred.expiresAt)}
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Never
                    </Badge>
                  )}
                </span>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleRevoke(cred.id)}
                  >
                    <Trash2 className="h-3 w-3" /> Revoke
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reset Vault Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Reset Vault
            </DialogTitle>
            <DialogDescription>
              This action is irreversible and will permanently delete your master password
              and all stored credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-2">
              <p className="text-sm font-medium text-red-300">What will happen:</p>
              <ul className="text-xs text-red-400/80 space-y-1 list-disc list-inside">
                <li>Your master password will be permanently deleted</li>
                <li>All {credentials.length} stored credential{credentials.length !== 1 ? "s" : ""} will be wiped</li>
                <li>Connected services will lose access to their API keys</li>
                <li>You will need to re-enter credentials for every service</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm" className="text-sm">
                Type <code className="text-xs bg-muted px-1.5 py-0.5 rounded">RESET</code> to confirm
              </Label>
              <Input
                id="reset-confirm"
                placeholder="Type RESET to confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowResetDialog(false);
                  setResetConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={resetConfirmText !== "RESET" || resetting}
                onClick={handleResetVault}
              >
                {resetting ? "Resetting..." : "Reset Vault"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
