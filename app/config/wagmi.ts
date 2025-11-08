import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, mainnet } from "wagmi/chains";
import { defineChain } from "viem";

// WalletConnect Project ID - required for RainbowKit
export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not defined");
}

// Custom Base Sepolia configuration with Coinbase RPC
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://chain-proxy.wallet.coinbase.com?targetName=base-sepolia"],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
});

// USDC contract address on Base Sepolia (testnet)
export const USDC_CONTRACT_ADDRESS_SEPOLIA =
  "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

// USDC contract address on Base (mainnet) - TODO: update with real address if needed
export const USDC_CONTRACT_ADDRESS_MAINNET =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Determine chains based on environment
const isDevelopment =
  import.meta.env.DEV || import.meta.env.MODE === "development";

// Local dev: Base Sepolia testnet only
// Production: Base mainnet + Ethereum mainnet
const chains = isDevelopment ? [baseSepolia] : [baseSepolia, base, mainnet];

console.log(
  "🔗 Wagmi chains configured:",
  chains.map((c) => c.name).join(", ")
);
console.log(
  "🌍 Environment:",
  isDevelopment ? "Development (Testnet)" : "Production (Mainnet)"
);

// Use RainbowKit's getDefaultConfig for better wallet support
export const config = getDefaultConfig({
  appName: "Hubble Agents Marketplace",
  projectId,
  chains: chains as any,
  ssr: false, // Pure frontend project, disable SSR
});

// Helper function to get USDC contract address based on current chain
export function getUSDCAddress(chainId?: number): string {
  if (!chainId) return USDC_CONTRACT_ADDRESS_SEPOLIA;

  switch (chainId) {
    case baseSepolia.id:
      return USDC_CONTRACT_ADDRESS_SEPOLIA;
    case base.id:
      return USDC_CONTRACT_ADDRESS_MAINNET;
    default:
      console.warn(`Unknown chain ID ${chainId}, using Sepolia USDC address`);
      return USDC_CONTRACT_ADDRESS_SEPOLIA;
  }
}
