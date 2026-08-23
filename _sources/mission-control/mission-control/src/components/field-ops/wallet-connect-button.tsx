"use client";

import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink, Check, Loader2 } from "lucide-react";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  11155111: "Sepolia",
};

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const { isAvailable, isConnected, address, chainId, connecting, connect, disconnect } = useWallet();

  if (!isAvailable) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
          <Wallet className="h-3.5 w-3.5" />
          Install MetaMask
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={connect} disabled={connecting}>
        {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
        {connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  const chainName = chainId ? CHAIN_NAMES[chainId] ?? `Chain ${chainId}` : "Unknown";

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1 text-xs">
        <Check className="h-3 w-3 text-green-400" />
        {truncateAddress(address!)}
      </Badge>
      <Badge variant="secondary" className="text-xs">
        {chainName}
      </Badge>
      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={disconnect}>
        Disconnect
      </Button>
    </div>
  );
}
