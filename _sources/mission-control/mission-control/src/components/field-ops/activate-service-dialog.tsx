"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShieldAlert, Shield, ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";
import type { CatalogService, FieldOpsService } from "@/lib/types";

interface ActivateServiceDialogProps {
  service: FieldOpsService;
  catalogEntry: CatalogService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated: () => void;
  /** When true, shows "Update Credentials" title instead of "Configure & Activate" */
  updateMode?: boolean;
}

export function ActivateServiceDialog({
  service,
  catalogEntry,
  open,
  onOpenChange,
  onActivated,
  updateMode = false,
}: ActivateServiceDialogProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [masterPassword, setMasterPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const configFields = catalogEntry?.configFields ?? [];
  const hasSensitiveFields = configFields.some((f) => f.type === "password");
  const RiskIcon = service.riskLevel === "high" ? ShieldAlert : service.riskLevel === "medium" ? Shield : ShieldCheck;
  const riskColor = service.riskLevel === "high" ? "text-red-400" : service.riskLevel === "medium" ? "text-yellow-400" : "text-green-400";

  const handleActivate = async () => {
    // Validate required fields (skip in update mode if field is empty — keep existing)
    if (!updateMode) {
      const missingRequired = configFields.filter(
        (f) => f.required && !config[f.key]?.trim()
      );
      if (missingRequired.length > 0) {
        setError(`Please fill in required fields: ${missingRequired.map((f) => f.label).join(", ")}`);
        return;
      }
    }

    // Require master password if there are sensitive fields
    if (hasSensitiveFields && !masterPassword.trim()) {
      setError("Master password is required to encrypt credentials in the vault.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Filter out empty fields in update mode (don't overwrite existing with blanks)
      const filteredConfig = updateMode
        ? Object.fromEntries(Object.entries(config).filter(([, v]) => v.trim()))
        : config;

      const body: Record<string, unknown> = { serviceId: service.id, config: filteredConfig };
      if (hasSensitiveFields && masterPassword.trim()) {
        body.masterPassword = masterPassword;
      }

      const res = await fetch("/api/field-ops/services/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to activate service");
      }

      onActivated();
      onOpenChange(false);
      setConfig({});
      setMasterPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const title = updateMode ? "Update Credentials" : "Configure & Activate";
  const description = updateMode
    ? `Update credentials for ${service.name}. Only fill in the fields you want to change.`
    : `Enter your credentials for ${service.name} to activate this service.`;
  const buttonLabel = updateMode ? "Update Credentials" : "Activate Service";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {title}
            <Badge variant="outline" className={riskColor}>
              <RiskIcon className="h-3 w-3 mr-1" />
              {service.riskLevel}
            </Badge>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {configFields.length === 0 && !updateMode && (
            <p className="text-sm text-muted-foreground">
              This service requires no configuration. Click Activate to enable it.
            </p>
          )}

          {configFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`config-${field.key}`} className="text-sm font-medium">
                {field.label}
                {field.required && !updateMode && <span className="text-red-400 ml-1">*</span>}
              </Label>

              {field.type === "select" && field.options ? (
                <Select
                  value={config[field.key] || ""}
                  onValueChange={(val) => setConfig((prev) => ({ ...prev, [field.key]: val }))}
                >
                  <SelectTrigger id={`config-${field.key}`}>
                    <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <Input
                    id={`config-${field.key}`}
                    type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                    placeholder={updateMode && field.type === "password" ? "Leave blank to keep current" : field.placeholder}
                    value={config[field.key] || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className={field.type === "password" ? "pr-10" : ""}
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              )}

              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Master password for vault encryption */}
          {hasSensitiveFields && (
            <>
              <Separator />
              <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 space-y-3">
                <p className="text-xs text-blue-400">
                  <Lock className="h-3.5 w-3.5 inline mr-1" />
                  <strong>Vault encryption.</strong> Sensitive fields will be encrypted with AES-256-GCM
                  and stored in the Credential Vault. Your master password is never stored.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="master-password" className="text-sm font-medium">
                    Master Password <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="master-password"
                    type="password"
                    placeholder="Enter vault master password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <>
              <Separator />
              <p className="text-sm text-red-400">{error}</p>
            </>
          )}

          {service.riskLevel === "high" && !updateMode && (
            <>
              <Separator />
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-xs text-red-400">
                  <ShieldAlert className="h-3.5 w-3.5 inline mr-1" />
                  <strong>High-risk service.</strong> This service can post publicly or handle sensitive data.
                  Ensure your credentials are correct and keep them secure.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleActivate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
