"use client";

import { useState } from "react";
import {
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import {
  evaluatePasswordStrength,
  type PasswordStrength,
} from "@/lib/password-strength";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VaultSetupWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  /** Compact layout for embedding in dialogs */
  compact?: boolean;
}

// ─── Security Info Content ──────────────────────────────────────────────────

const SECURITY_DETAILS = [
  {
    title: "Password Hashing",
    text: "Your master password is hashed using scrypt, a memory-hard algorithm that makes brute-force attacks extremely expensive. The hash is stored locally — the password itself is never stored anywhere.",
  },
  {
    title: "Credential Encryption",
    text: "Each credential (API key, token, etc.) is encrypted with AES-256-GCM — the same standard used by banks and governments. GCM mode provides both confidentiality and tamper detection.",
  },
  {
    title: "Key Derivation",
    text: "Your password is combined with a unique random salt using scrypt to derive a 256-bit encryption key. Even if two users chose the same password, their encryption keys would be different.",
  },
  {
    title: "Session Management",
    text: "After you enter your password, it is cached in server memory (RAM) for 30 minutes. It is never written to disk, never sent to your browser, and automatically cleared after timeout.",
  },
  {
    title: "Brute-Force Protection",
    text: "After 3 failed password attempts, additional delays are added. After 10 failed attempts within 5 minutes, the vault locks for 15 minutes.",
  },
  {
    title: "Audit Trail",
    text: "Every credential access, addition, and revocation is recorded in the Field Ops activity log.",
  },
];

// ─── Security Details Panel (Reusable) ──────────────────────────────────────

export function VaultSecurityDetails({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <span>How Your Data Is Secured</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {SECURITY_DETAILS.map((item) => (
            <div key={item.title}>
              <p className="text-xs font-semibold text-foreground">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.text}
              </p>
            </div>
          ))}

          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 mt-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">
                No Password Recovery
              </p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                There is no recovery mechanism. If you forget your master
                password, encrypted credentials cannot be decrypted. You would
                need to delete the credential file and re-enter all your
                credentials with a new password.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              Credentials are stored in{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                data/field-ops/.credentials.json
              </code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Strength Meter Bar ─────────────────────────────────────────────────────

function StrengthMeter({ strength }: { strength: PasswordStrength }) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= strength.score ? strength.color : "bg-muted",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {strength.label}
        </span>
        {strength.suggestions.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {strength.suggestions[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function VaultSetupWizard({
  onComplete,
  onSkip,
  compact = false,
}: VaultSetupWizardProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = evaluatePasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    passwordsMatch &&
    strength.score >= 1 &&
    !saving;

  async function handleSetup() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch("/api/field-ops/vault/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterPassword: password,
          confirmPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Setup failed" }));
        throw new Error(data.error ?? "Failed to initialize vault");
      }

      setDone(true);
      // Brief delay to show success state
      setTimeout(() => onComplete(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSaving(false);
    }
  }

  // ─── Success State ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div
        className={cn(
          "text-center space-y-2",
          compact ? "py-4" : "py-8",
        )}
      >
        <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto" />
        <p className="text-sm font-medium">Vault Initialized</p>
        <p className="text-xs text-muted-foreground">
          Your encryption key has been created. You can now store credentials.
        </p>
      </div>
    );
  }

  // ─── Setup Form ─────────────────────────────────────────────────────────
  const content = (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact && (
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Set Up Your Vault</h3>
            <p className="text-xs text-muted-foreground">
              Choose a master password to encrypt your API keys and tokens.
            </p>
          </div>
        </div>
      )}

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="vault-setup-pw" className="text-xs">
          Master Password
        </Label>
        <div className="relative">
          <Input
            id="vault-setup-pw"
            type={showPassword ? "text" : "password"}
            placeholder="Choose a strong password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {password.length > 0 && <StrengthMeter strength={strength} />}
      </div>

      {/* Confirm password field */}
      <div className="space-y-2">
        <Label htmlFor="vault-setup-confirm" className="text-xs">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="vault-setup-confirm"
            type={showConfirm ? "text" : "password"}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-xs text-red-400">Passwords do not match</p>
        )}
      </div>

      {/* Security details (collapsible) */}
      <VaultSecurityDetails />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        {onSkip ? (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip for now
          </Button>
        ) : (
          <div />
        )}
        <Button size="sm" onClick={handleSetup} disabled={!canSubmit}>
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Initializing...
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Initialize Vault
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Vault Setup
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
