"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface SignTransactionButtonProps {
  taskId: string;
  onComplete?: () => void;
}

export function SignTransactionButton({ taskId, onComplete }: SignTransactionButtonProps) {
  const { isAvailable, isConnected, sendTransaction, connect } = useWallet();
  const [signing, setSigning] = useState(false);
  const [preparing, setPreparing] = useState(false);

  async function handleSign() {
    if (!isConnected) {
      const addr = await connect();
      if (!addr) {
        showError("Please connect your wallet first");
        return;
      }
    }

    setPreparing(true);
    try {
      // Step 1: Get unsigned tx params from server
      const prepareRes = await apiFetch("/api/field-ops/execute/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!prepareRes.ok) {
        const err = await prepareRes.json().catch(() => ({ error: "Failed to prepare transaction" }));
        throw new Error(err.error ?? "Failed to prepare transaction");
      }
      const { txParams } = await prepareRes.json();
      setPreparing(false);

      // Step 2: Sign in MetaMask
      setSigning(true);
      const txHash = await sendTransaction(txParams);
      if (!txHash) {
        throw new Error("Transaction rejected or failed in wallet");
      }

      // Step 3: Submit tx hash back to server
      const submitRes = await apiFetch("/api/field-ops/execute/submit-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, txHash }),
      });
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({ error: "Failed to submit transaction" }));
        throw new Error(err.error ?? "Failed to submit transaction");
      }

      showSuccess("Transaction signed and submitted!");
      onComplete?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Signing failed");
    } finally {
      setSigning(false);
      setPreparing(false);
    }
  }

  if (!isAvailable) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
          <Wallet className="h-3.5 w-3.5" />
          Install MetaMask to Sign
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      className="gap-1.5 bg-purple-600 hover:bg-purple-700"
      onClick={handleSign}
      disabled={signing || preparing}
    >
      {preparing ? (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing...</>
      ) : signing ? (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sign in Wallet...</>
      ) : (
        <><Wallet className="h-3.5 w-3.5" /> Sign with Wallet</>
      )}
    </Button>
  );
}
