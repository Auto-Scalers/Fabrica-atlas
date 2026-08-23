/**
 * Ethereum / Base Adapter
 *
 * Supports Ethereum mainnet and Base L2 via ethers.js v6.
 * Server-side only — never imported from client components.
 *
 * Credential format in vault (JSON string):
 * {
 *   "privateKey": "0x...",           // For automated send operations
 *   "address": "0x..."               // Optional: used for read-only operations
 * }
 *
 * Note: For MetaMask integration, the frontend will handle transaction
 * signing via WalletConnect/injected provider. This adapter handles
 * server-side automated execution. MetaMask-signed transactions would
 * be submitted via a separate client-side flow.
 *
 * Network config from service.config:
 * {
 *   "network": "ethereum" | "base",
 *   "rpcUrl": "https://..."           // Optional: custom RPC URL
 * }
 *
 * Operations:
 * - read-balance: ETH + USDC balance (free, no gas, no private key needed)
 * - send-eth: Native ETH transfer
 * - send-usdc: ERC-20 USDC transfer
 */

import { ethers } from "ethers";
import type { ServiceAdapter, AdapterContext, AdapterResult, PayloadValidation, FinancialSnapshot, HealthCheckResult } from "./types";
import type { FieldOpsService } from "@/lib/types";
import { registerAdapter } from "./registry";

// ─── USDC Contract Addresses ────────────────────────────────────────────────

const USDC_ADDRESSES: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle USDC on Sepolia
};

// ─── Default RPC URLs (free public endpoints) ───────────────────────────────

const DEFAULT_RPC: Record<string, string> = {
  ethereum: "https://eth.llamarpc.com",
  base: "https://mainnet.base.org",
  sepolia: "https://rpc.sepolia.org",
};

// ─── Block Explorers ────────────────────────────────────────────────────────

const EXPLORER_URLS: Record<string, string> = {
  ethereum: "https://etherscan.io",
  base: "https://basescan.org",
  sepolia: "https://sepolia.etherscan.io",
};

// ─── Minimal ERC-20 ABI ────────────────────────────────────────────────────

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// ─── Helper functions ───────────────────────────────────────────────────────

function getProvider(network: string, customRpcUrl?: string): ethers.JsonRpcProvider {
  const rpcUrl = customRpcUrl || DEFAULT_RPC[network];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for network: ${network}`);
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

function isValidAddress(address: string): boolean {
  try {
    ethers.getAddress(address); // throws if invalid
    return true;
  } catch {
    return false;
  }
}

// ─── Operations ─────────────────────────────────────────────────────────────

async function readBalance(
  address: string,
  network: string,
  rpcUrl?: string,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    const provider = getProvider(network, rpcUrl);

    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    const ethFormatted = ethers.formatEther(ethBalance);

    // Get USDC balance
    let usdcFormatted = "0";
    let usdcDecimals = 6;
    const usdcAddress = USDC_ADDRESSES[network];

    if (usdcAddress) {
      const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
      const [usdcBalance, decimals] = await Promise.all([
        usdc.balanceOf(address),
        usdc.decimals(),
      ]);
      usdcDecimals = Number(decimals);
      usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    }

    return {
      success: true,
      data: {
        address,
        network,
        ethBalance: ethFormatted,
        ethBalanceWei: ethBalance.toString(),
        usdcBalance: usdcFormatted,
        usdcDecimals,
        operation: "read-balance",
      },
      executionMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      data: { address, network },
      error: err instanceof Error ? err.message : "Failed to read balance",
      executionMs: Date.now() - start,
    };
  }
}

async function sendEth(
  privateKey: string,
  to: string,
  amountEth: string,
  network: string,
  rpcUrl?: string,
  dryRun?: boolean,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    const provider = getProvider(network, rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Check balance first
    const balance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amountEth);

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to,
      value: amountWei,
    });
    const feeData = await provider.getFeeData();
    const gasCost = gasEstimate * (feeData.gasPrice ?? BigInt(0));
    const totalCost = amountWei + gasCost;

    if (balance < totalCost) {
      return {
        success: false,
        data: {
          address: wallet.address,
          balance: ethers.formatEther(balance),
          required: ethers.formatEther(totalCost),
          gasEstimate: ethers.formatEther(gasCost),
        },
        error: `Insufficient ETH. Have ${ethers.formatEther(balance)} ETH, need ${ethers.formatEther(totalCost)} ETH (${amountEth} + gas)`,
        executionMs: Date.now() - start,
      };
    }

    // Dry run: validation passed, return simulated result without sending
    if (dryRun) {
      return {
        success: true,
        data: {
          dryRun: true,
          from: wallet.address,
          to,
          amountEth,
          network,
          balance: ethers.formatEther(balance),
          estimatedGas: ethers.formatEther(gasCost),
          operation: "send-eth",
          message: "Dry run — validation passed, transaction not sent.",
        },
        executionMs: Date.now() - start,
      };
    }

    // Send transaction
    const tx = await wallet.sendTransaction({
      to,
      value: amountWei,
    });

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    const explorerBase = EXPLORER_URLS[network] ?? EXPLORER_URLS.ethereum;

    return {
      success: true,
      data: {
        txHash: receipt?.hash ?? tx.hash,
        from: wallet.address,
        to,
        amountEth,
        network,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        operation: "send-eth",
        explorerUrl: `${explorerBase}/tx/${receipt?.hash ?? tx.hash}`,
      },
      executionMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Failed to send ETH",
      executionMs: Date.now() - start,
    };
  }
}

async function sendUsdc(
  privateKey: string,
  to: string,
  amountUsdc: string,
  network: string,
  rpcUrl?: string,
  dryRun?: boolean,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    const usdcAddress = USDC_ADDRESSES[network];
    if (!usdcAddress) {
      return {
        success: false,
        data: {},
        error: `USDC not supported on network: ${network}`,
        executionMs: Date.now() - start,
      };
    }

    const provider = getProvider(network, rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, wallet);

    // Get USDC decimals and check balance
    const decimals = await usdc.decimals();
    const amountRaw = ethers.parseUnits(amountUsdc, decimals);
    const usdcBalance = await usdc.balanceOf(wallet.address);

    if (usdcBalance < amountRaw) {
      return {
        success: false,
        data: {
          address: wallet.address,
          usdcBalance: ethers.formatUnits(usdcBalance, decimals),
          required: amountUsdc,
        },
        error: `Insufficient USDC. Have ${ethers.formatUnits(usdcBalance, decimals)} USDC, need ${amountUsdc} USDC`,
        executionMs: Date.now() - start,
      };
    }

    // Check ETH for gas
    const ethBalance = await provider.getBalance(wallet.address);
    if (ethBalance === BigInt(0)) {
      return {
        success: false,
        data: {
          address: wallet.address,
          ethBalance: "0",
        },
        error: "Insufficient ETH for gas. Need ETH to pay for USDC transfer gas fees.",
        executionMs: Date.now() - start,
      };
    }

    // Dry run: validation passed, return simulated result without sending
    if (dryRun) {
      return {
        success: true,
        data: {
          dryRun: true,
          from: wallet.address,
          to,
          amountUsdc,
          network,
          usdcBalance: ethers.formatUnits(usdcBalance, decimals),
          ethBalance: ethers.formatEther(ethBalance),
          operation: "send-usdc",
          message: "Dry run — validation passed, transaction not sent.",
        },
        executionMs: Date.now() - start,
      };
    }

    // Send USDC transfer
    const tx = await usdc.transfer(to, amountRaw);
    const receipt = await tx.wait(1);
    const explorerBase = EXPLORER_URLS[network] ?? EXPLORER_URLS.ethereum;

    return {
      success: true,
      data: {
        txHash: receipt?.hash ?? tx.hash,
        from: wallet.address,
        to,
        amountUsdc,
        network,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        operation: "send-usdc",
        explorerUrl: `${explorerBase}/tx/${receipt?.hash ?? tx.hash}`,
      },
      executionMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Failed to send USDC",
      executionMs: Date.now() - start,
    };
  }
}

// ─── Chain IDs ──────────────────────────────────────────────────────────────

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  sepolia: 11155111,
};

// ─── Prepare Transaction (for wallet/MetaMask signing) ──────────────────────

/**
 * Prepare an unsigned transaction for client-side wallet signing.
 * Returns transaction parameters that can be passed to MetaMask's eth_sendTransaction.
 */
export async function prepareTransaction(
  operation: string,
  payload: Record<string, unknown>,
  network: string,
  rpcUrl?: string,
): Promise<{
  success: boolean;
  txParams?: {
    from?: string;
    to: string;
    value?: string;
    data?: string;
    chainId: string;
    gas?: string;
  };
  error?: string;
}> {
  try {
    // read-balance doesn't require signing
    if (operation === "read-balance") {
      return { success: false, error: "read-balance doesn't require signing" };
    }

    const chainId = CHAIN_IDS[network];
    if (chainId === undefined) {
      return { success: false, error: `Unsupported network: ${network}` };
    }
    const chainIdHex = "0x" + chainId.toString(16);

    const to = payload.to as string | undefined;
    if (!to || !isValidAddress(to)) {
      return { success: false, error: `Invalid or missing 'to' address: ${to ?? "(none)"}` };
    }

    const provider = getProvider(network, rpcUrl);

    if (operation === "send-eth") {
      const amount = payload.amount as string | number | undefined;
      if (!amount || Number(amount) <= 0) {
        return { success: false, error: "'amount' must be a positive number" };
      }

      const valueWei = ethers.parseEther(String(amount));
      const valueHex = "0x" + valueWei.toString(16);

      // Estimate gas
      let gasHex: string | undefined;
      try {
        const gasEstimate = await provider.estimateGas({ to, value: valueWei });
        gasHex = "0x" + gasEstimate.toString(16);
      } catch {
        // Gas estimation may fail without a from address; leave it for the wallet
      }

      return {
        success: true,
        txParams: {
          to: ethers.getAddress(to),
          value: valueHex,
          chainId: chainIdHex,
          gas: gasHex,
        },
      };
    }

    if (operation === "send-usdc") {
      const usdcAddress = USDC_ADDRESSES[network];
      if (!usdcAddress) {
        return { success: false, error: `USDC not supported on network: ${network}` };
      }

      const amount = payload.amount as string | number | undefined;
      if (!amount || Number(amount) <= 0) {
        return { success: false, error: "'amount' must be a positive number" };
      }

      // Encode transfer(address,uint256) calldata
      const iface = new ethers.Interface(ERC20_ABI);
      // USDC uses 6 decimals on all supported networks
      const amountRaw = ethers.parseUnits(String(amount), 6);
      const calldata = iface.encodeFunctionData("transfer", [ethers.getAddress(to), amountRaw]);

      // Estimate gas for the ERC-20 transfer
      let gasHex: string | undefined;
      try {
        const gasEstimate = await provider.estimateGas({
          to: usdcAddress,
          data: calldata,
        });
        gasHex = "0x" + gasEstimate.toString(16);
      } catch {
        // Gas estimation may fail without a from address; leave it for the wallet
      }

      return {
        success: true,
        txParams: {
          to: ethers.getAddress(usdcAddress),
          data: calldata,
          chainId: chainIdHex,
          gas: gasHex,
        },
      };
    }

    return { success: false, error: `Unsupported operation for wallet signing: ${operation}` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to prepare transaction",
    };
  }
}

// ─── Credential Parsing ─────────────────────────────────────────────────────

interface EthCredentials {
  privateKey?: string;
  address?: string;
}

function parseCredentials(creds: Record<string, unknown>): EthCredentials {
  return {
    privateKey: typeof creds.privateKey === "string" ? creds.privateKey : undefined,
    address: typeof creds.address === "string" ? creds.address : undefined,
  };
}

function getWalletAddress(creds: EthCredentials): string | null {
  if (creds.address) return creds.address;
  if (creds.privateKey) {
    try {
      const wallet = new ethers.Wallet(creds.privateKey);
      return wallet.address;
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Ethereum Adapter ───────────────────────────────────────────────────────

const ethereumAdapter: ServiceAdapter = {
  serviceId: "ethereum-wallet",
  name: "Ethereum / Base Wallet",
  supportedOperations: ["read-balance", "send-eth", "send-usdc"],

  validatePayload(payload: Record<string, unknown>): PayloadValidation {
    const errors: string[] = [];
    const operation = (payload.operation as string) ?? "read-balance";

    if (!["read-balance", "send-eth", "send-usdc"].includes(operation)) {
      errors.push(`Unsupported operation: "${operation}". Supported: read-balance, send-eth, send-usdc`);
      return { valid: false, errors };
    }

    if (operation === "send-eth" || operation === "send-usdc") {
      const to = payload.to as string | undefined;
      if (!to) {
        errors.push("'to' address is required");
      } else if (!isValidAddress(to)) {
        errors.push(`Invalid Ethereum address: ${to}`);
      }

      const amount = payload.amount as string | number | undefined;
      if (!amount) {
        errors.push("'amount' is required");
      } else {
        const num = Number(amount);
        if (isNaN(num) || num <= 0) {
          errors.push("'amount' must be a positive number");
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(ctx: AdapterContext): Promise<AdapterResult> {
    const creds = parseCredentials(ctx.credentials);
    const operation = (ctx.task.payload.operation as string) ?? "read-balance";
    const network = (ctx.service.config.network as string) ?? "ethereum";
    const rpcUrl = ctx.service.config.rpcUrl as string | undefined;

    // ── Safety: recipient whitelist + amount limits (from service.config) ──
    const approvedRecipients = (ctx.service.config.approvedRecipients ?? []) as string[];
    const maxAmountEth = Number(ctx.service.config.maxAmountEth ?? 0.1);
    const maxAmountUsdc = Number(ctx.service.config.maxAmountUsdc ?? 100);

    if (["send-eth", "send-usdc"].includes(operation)) {
      const to = ctx.task.payload.to as string;
      const amount = Number(ctx.task.payload.amount);

      // Recipient whitelist check
      if (approvedRecipients.length > 0) {
        const normalizedTo = to.toLowerCase();
        const isApproved = approvedRecipients.some(
          (addr) => addr.toLowerCase() === normalizedTo,
        );
        if (!isApproved) {
          return {
            success: false,
            data: { to, approvedRecipients },
            error: `Recipient "${to}" is not in the approved recipients list. Add it to the service config before sending.`,
          };
        }
      }

      // Per-transaction amount limits
      const limit = operation === "send-eth" ? maxAmountEth : maxAmountUsdc;
      const unit = operation === "send-eth" ? "ETH" : "USDC";
      if (amount > limit) {
        return {
          success: false,
          data: { amount, limit, unit },
          error: `Amount ${amount} ${unit} exceeds the per-transaction limit of ${limit} ${unit}. Update maxAmount${unit === "ETH" ? "Eth" : "Usdc"} in the service config to increase.`,
        };
      }
    }

    switch (operation) {
      case "read-balance": {
        const address = getWalletAddress(creds);
        if (!address) {
          return {
            success: false,
            data: {},
            error: `No wallet address found in credentials. Found: address=${!!creds.address}, privateKey=${!!creds.privateKey}. Provide 'address' or 'privateKey'.`,
          };
        }
        return readBalance(address, network, rpcUrl);
      }

      case "send-eth": {
        if (!creds.privateKey) {
          return {
            success: false,
            data: {},
            error: "Private key required for send operations. Store privateKey in vault credentials.",
          };
        }
        return sendEth(
          creds.privateKey,
          ctx.task.payload.to as string,
          String(ctx.task.payload.amount),
          network,
          rpcUrl,
          ctx.dryRun,
        );
      }

      case "send-usdc": {
        if (!creds.privateKey) {
          return {
            success: false,
            data: {},
            error: "Private key required for send operations. Store privateKey in vault credentials.",
          };
        }
        return sendUsdc(
          creds.privateKey,
          ctx.task.payload.to as string,
          String(ctx.task.payload.amount),
          network,
          rpcUrl,
          ctx.dryRun,
        );
      }

      default:
        return {
          success: false,
          data: {},
          error: `Unknown operation: ${operation}`,
        };
    }
  },

  async healthCheck(
    service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    const creds = parseCredentials(credentials);
    const address = getWalletAddress(creds);

    if (!address) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: `No wallet address found in credentials. Found: address=${!!creds.address}, privateKey=${!!creds.privateKey}`,
      };
    }

    const network = (service.config.network as string) ?? "ethereum";
    const rpcUrl = service.config.rpcUrl as string | undefined;

    try {
      const provider = getProvider(network, rpcUrl);
      const balance = await provider.getBalance(address);
      return {
        ok: true,
        latencyMs: Date.now() - start,
        message: `Connected to ${network}. Wallet: ${address.slice(0, 6)}…${address.slice(-4)}`,
        details: {
          address,
          network,
          ethBalance: ethers.formatEther(balance),
        },
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : "Failed to connect to RPC provider",
      };
    }
  },

  async getFinancials(
    service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<FinancialSnapshot> {
    const creds = parseCredentials(credentials);
    const network = (service.config.network as string) ?? "ethereum";
    const rpcUrl = service.config.rpcUrl as string | undefined;
    const address = getWalletAddress(creds);
    const isTestnet = network === "sepolia";
    const explorerBase = EXPLORER_URLS[network] ?? EXPLORER_URLS.ethereum;

    if (!address) {
      return {
        serviceId: service.id,
        serviceName: service.name,
        icon: "Wallet",
        network,
        metrics: [],
        error: "No wallet address configured",
        fetchedAt: new Date().toISOString(),
      };
    }

    const result = await readBalance(address, network, rpcUrl);

    if (!result.success) {
      return {
        serviceId: service.id,
        serviceName: service.name,
        icon: "Wallet",
        network,
        address,
        explorerUrl: `${explorerBase}/address/${address}`,
        metrics: [],
        error: result.error ?? "Failed to read balance",
        fetchedAt: new Date().toISOString(),
      };
    }

    return {
      serviceId: service.id,
      serviceName: service.name,
      icon: "Wallet",
      network,
      address,
      explorerUrl: `${explorerBase}/address/${address}`,
      metrics: [
        {
          label: "ETH",
          value: Number(result.data.ethBalance).toFixed(4),
          currency: "ETH",
          type: "balance",
          detail: isTestnet ? "Sepolia testnet" : undefined,
        },
        {
          label: "USDC",
          value: Number(result.data.usdcBalance).toFixed(2),
          currency: "USDC",
          type: "balance",
          detail: isTestnet ? "Sepolia testnet" : undefined,
        },
      ],
      fetchedAt: new Date().toISOString(),
    };
  },
};

// ─── Self-register ──────────────────────────────────────────────────────────

registerAdapter(ethereumAdapter);

export { ethereumAdapter };
