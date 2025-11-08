// Wallet provider detection and connection utilities

import {
  WalletId,
  WALLET_CONFIGS,
  SUPPORTED_WALLET_IDS,
  isMobile,
} from "./wallet-config";

export type WalletProvider = {
  id: string;
  name: string;
  icon?: string;
  isInstalled: boolean;
  provider?: unknown;
  isMobileAvailable?: boolean; // Mark whether available on mobile
};

// Detect all available wallet providers
export function detectWalletProviders(): WalletProvider[] {
  if (typeof window === "undefined") {
    return [];
  }

  const providers: WalletProvider[] = [];
  const isMobileDevice = isMobile();

  // On mobile, all supported wallets are marked as available (opened via deep link)
  if (isMobileDevice) {
    // Exclude ethereum, only add wallets with deep links and enabled
    const mobileWallets = SUPPORTED_WALLET_IDS.filter(
      (id) => id !== WalletId.ETHEREUM && WALLET_CONFIGS[id].mobileDeepLink && WALLET_CONFIGS[id].enable
    );

    mobileWallets.forEach((walletId) => {
      const config = WALLET_CONFIGS[walletId];
      providers.push({
        id: config.id,
        name: config.name,
        isInstalled: true, // Mark as installed on mobile because it will be opened via deep link
        isMobileAvailable: true,
      });
    });

    return providers;
  }

  // PC: Prioritize detecting wallets with independent objects (avoid conflicts with window.ethereum)
  // Detection order: OKX, TokenPocket, Coinbase, MetaMask, Ethereum
  const detectionOrder: WalletId[] = [
    WalletId.OKX,
    WalletId.TOKENPOCKET,
    WalletId.COINBASE,
    WalletId.METAMASK,
    WalletId.ETHEREUM,
  ];

  for (const walletId of detectionOrder) {
    const config = WALLET_CONFIGS[walletId];
    if (!config || !config.enable) continue;

    try {
      const provider = config.getProvider();
      if (provider && config.checkProvider(provider)) {
        // For MetaMask and Ethereum, need additional check if already added
        if (walletId === WalletId.ETHEREUM) {
          const isMetaMaskAdded = providers.some((p) => p.id === WalletId.METAMASK);
          if (isMetaMaskAdded) {
            continue; // If MetaMask is already added, skip Ethereum
          }
        }

        providers.push({
          id: config.id,
          name: config.name,
          isInstalled: true,
          provider: provider,
          isMobileAvailable: false,
        });
      }
    } catch (error) {
      // If error accessing provider, it's unavailable, don't add
      console.debug(`${config.name} provider not available (may be blocked):`, error);
    }
  }

  // Add not installed wallets for download links
  // Only add wallets with download links and enabled (exclude ethereum)
  const walletsWithDownloadLinks = SUPPORTED_WALLET_IDS.filter(
    (id) => id !== WalletId.ETHEREUM && WALLET_CONFIGS[id].downloadUrl && WALLET_CONFIGS[id].enable
  );

  walletsWithDownloadLinks.forEach((walletId) => {
    const isInstalled = providers.some((p) => p.id === walletId);
    if (!isInstalled) {
      const config = WALLET_CONFIGS[walletId];
      providers.push({
        id: config.id,
        name: config.name,
        isInstalled: false,
        isMobileAvailable: false,
      });
    }
  });

  return providers;
}

// Get a specific wallet provider by ID
export function getWalletProvider(id: string): WalletProvider | undefined {
  const providers = detectWalletProviders();
  return providers.find((p) => p.id === id);
}

// Check if any wallet is installed
export function hasAnyWalletInstalled(): boolean {
  return detectWalletProviders().some((p) => p.isInstalled);
}

