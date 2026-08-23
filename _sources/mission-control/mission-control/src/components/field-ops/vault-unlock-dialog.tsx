"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VaultUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock: (password: string) => Promise<boolean>;
  /** Optional context message (e.g., which task will execute). */
  context?: string;
}

export function VaultUnlockDialog({
  open,
  onOpenChange,
  onUnlock,
  context,
}: VaultUnlockDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const success = await onUnlock(password);
      if (success) {
        setPassword("");
        setError(null);
        onOpenChange(false);
      } else {
        setError("Invalid master password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock vault");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Unlock Vault
          </DialogTitle>
          <DialogDescription>
            Enter your master password to decrypt credentials and execute the task.
            {context && (
              <span className="block mt-1 text-xs text-muted-foreground/80">
                {context}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-password">Master Password</Label>
            <Input
              id="vault-password"
              type="password"
              placeholder="Enter your vault password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={loading}
            />
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground/60">
            Password is cached in memory for 30 minutes. Never stored on disk.
            {" · "}
            <Link href="/field-ops/vault" className="text-red-400 hover:underline">
              Forgot password?
            </Link>
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !password.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Unlock & Execute
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
