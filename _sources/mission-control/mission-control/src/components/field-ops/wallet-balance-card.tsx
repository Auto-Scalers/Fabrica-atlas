"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  RefreshCw,
  Lock,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

interface WalletData {
  serviceId: string;
  name: string;
  network: string;
  address: string | null;
  ethBalance: string | null;
  usdcBalance: string | null;
  error: string | null;
}

interface WalletResponse {
  vaultLocked?: boolean;
  wallets: WalletData[];
  error?: string;
}

interface WalletBalanceCardProps {
  onUnlockVault?: () => void;
}

export function WalletBalanceCard({ onUnlockVault }: WalletBalanceCardProps) {
  const [data, setData] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/api/field-ops/wallet");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silent fail — wallet is supplementary
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Don't render if no wallet services are configured
  if (!loading && (!data || data.wallets.length === 0)) {
    return null;
  }

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const networkColor: Record<string, string> = {
    ethereum: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    base: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  };

  const explorerUrl = (address: string, network: string) =>
    network === "base"
      ? `https://basescan.org/address/${address}`
      : `https://etherscan.io/address/${address}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => fetchBalance(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data?.vaultLocked ? (
          <div className="text-center py-3 space-y-2">
            <Lock className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Vault locked</p>
            {onUnlockVault && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={onUnlockVault}
              >
                <Lock className="h-3 w-3" />
                Unlock to view balance
              </Button>
            )}
          </div>
        ) : (
          data?.wallets.map((wallet) => (
            <div key={wallet.serviceId} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{wallet.name}</span>
                <Badge className={cn("text-[10px] px-1.5 py-0", networkColor[wallet.network] ?? "")}>
                  {wallet.network}
                </Badge>
              </div>

              {wallet.error ? (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {wallet.error}
                </div>
              ) : (
                <>
                  {/* Address */}
                  {wallet.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">
                        {truncateAddress(wallet.address)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => navigator.clipboard.writeText(wallet.address!)}
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                      <a
                        href={explorerUrl(wallet.address, wallet.network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ETH</p>
                      <p className="text-sm font-mono font-medium mt-0.5">
                        {wallet.ethBalance ? Number(wallet.ethBalance).toFixed(4) : "—"}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">USDC</p>
                      <p className="text-sm font-mono font-medium mt-0.5">
                        {wallet.usdcBalance ? Number(wallet.usdcBalance).toFixed(2) : "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
