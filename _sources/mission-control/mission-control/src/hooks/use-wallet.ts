"use client";

import { useState, useEffect, useCallback } from "react";

// EIP-1193 provider type (MetaMask injects window.ethereum)
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface WalletState {
  isAvailable: boolean;        // MetaMask detected
  isConnected: boolean;        // Account connected
  address: string | null;      // Connected address (checksummed)
  chainId: number | null;      // Current chain ID
  isMetaMask: boolean;         // Is specifically MetaMask
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isAvailable: false,
    isConnected: false,
    address: null,
    chainId: null,
    isMetaMask: false,
  });
  const [connecting, setConnecting] = useState(false);

  // Detect provider on mount
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    setState(prev => ({
      ...prev,
      isAvailable: true,
      isMetaMask: !!ethereum.isMetaMask,
    }));

    // Check if already connected
    ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      const accts = accounts as string[];
      if (accts.length > 0) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          address: accts[0],
        }));
      }
    }).catch(() => {});

    // Get chain ID
    ethereum.request({ method: "eth_chainId" }).then((chainId) => {
      setState(prev => ({ ...prev, chainId: parseInt(chainId as string, 16) }));
    }).catch(() => {});

    // Listen for account changes
    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setState(prev => ({ ...prev, isConnected: false, address: null }));
      } else {
        setState(prev => ({ ...prev, isConnected: true, address: accounts[0] }));
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainId = args[0] as string;
      setState(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // Connect wallet
  const connect = useCallback(async (): Promise<string | null> => {
    const ethereum = window.ethereum;
    if (!ethereum) return null;
    setConnecting(true);
    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts.length > 0) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          address: accounts[0],
        }));
        return accounts[0];
      }
      return null;
    } catch {
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  // Switch chain
  const switchChain = useCallback(async (chainId: number): Promise<boolean> => {
    const ethereum = window.ethereum;
    if (!ethereum) return false;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  // Send transaction (MetaMask popup)
  const sendTransaction = useCallback(async (txParams: {
    to: string;
    value?: string;
    data?: string;
    chainId?: string;
    gas?: string;
  }): Promise<string | null> => {
    const ethereum = window.ethereum;
    if (!ethereum || !state.address) return null;
    try {
      const txHash = (await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: state.address,
          ...txParams,
        }],
      })) as string;
      return txHash;
    } catch {
      return null;
    }
  }, [state.address]);

  // Disconnect (just clear local state — MetaMask doesn't have a disconnect method)
  const disconnect = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: false, address: null }));
  }, []);

  return {
    ...state,
    connecting,
    connect,
    disconnect,
    switchChain,
    sendTransaction,
  };
}
