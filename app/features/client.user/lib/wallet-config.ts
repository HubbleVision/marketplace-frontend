// Wallet type enum
export enum WalletId {
  METAMASK = "metamask",
  OKX = "okx",
  TOKENPOCKET = "tokenpocket",
  COINBASE = "coinbase",
  ETHEREUM = "ethereum",
}

// Mobile detection
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Detect mobile devices
  const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );

  // Detect touch screen
  const hasTouchScreen =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;

  // Detect screen width
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileDevice || (hasTouchScreen && isSmallScreen);
}

// Wallet base configuration
export interface WalletConfig {
  id: WalletId;
  name: string;
  downloadUrl: string;
  mobileDeepLink?: string; // Mobile deep link
  color: string;
  borderColor: string;
  enable: boolean; // Whether to enable this wallet
  // Detection logic: how to get provider from window object
  getProvider: () => unknown;
  // Detection condition: determine if provider is available
  checkProvider: (provider: unknown) => boolean;
}

// Verify if provider is really available (can call request method)
function isProviderAvailable(provider: unknown): boolean {
  if (!provider) return false;
  if (typeof provider !== "object") return false;

  const p = provider as { request?: unknown };
  return typeof p.request === "function";
}

// Configuration for all wallets
export const WALLET_CONFIGS: Record<WalletId, WalletConfig> = {
  [WalletId.METAMASK]: {
    id: WalletId.METAMASK,
    name: "MetaMask",
    downloadUrl: "https://metamask.io/download/",
    mobileDeepLink: "https://metamask.app.link/dapp/" + (typeof window !== "undefined" ? window.location.host : ""),
    color: "#FF5C16",
    borderColor: "#FF5C16",
    enable: true,
    getProvider: () => {
      const ethereum = window.ethereum as typeof window.ethereum & {
        providers?: Array<typeof window.ethereum>;
      };

      // Check if there's a providers array (EIP-1193 standard, when multiple wallets)
      if (ethereum?.providers && Array.isArray(ethereum.providers)) {
        // Find MetaMask in providers array
        return ethereum.providers.find(
          (p) => p?.isMetaMask === true && isProviderAvailable(p)
        );
      } else if (ethereum?.isMetaMask) {
        // Directly check if window.ethereum is MetaMask
        if (isProviderAvailable(ethereum)) {
          return ethereum;
        }
      }
      return undefined;
    },
    checkProvider: (provider: unknown) => {
      if (!provider) return false;
      const p = provider as { request?: unknown; isMetaMask?: boolean };
      return (
        typeof p.request === "function" && p.isMetaMask === true
      );
    },
  },
  [WalletId.OKX]: {
    id: WalletId.OKX,
    name: "OKX Wallet",
    downloadUrl: "https://www.okx.com/web3",
    mobileDeepLink: "okx://wallet/dapp/url?dappUrl=" + encodeURIComponent(typeof window !== "undefined" ? window.location.href : ""),
    color: "#9bed2c",
    borderColor: "#9bed2c",
    enable: true,
    getProvider: () => window.okxwallet,
    checkProvider: isProviderAvailable,
  },
  [WalletId.TOKENPOCKET]: {
    id: WalletId.TOKENPOCKET,
    name: "TokenPocket",
    downloadUrl: "https://tokenpocket.pro/",
    mobileDeepLink: "tpoutside://wap?url=" + encodeURIComponent(typeof window !== "undefined" ? window.location.href : ""),
    color: "#2980FE",
    borderColor: "#2980FE",
    enable: false,
    getProvider: () => window.tokenpocket?.ethereum,
    checkProvider: isProviderAvailable,
  },
  [WalletId.COINBASE]: {
    id: WalletId.COINBASE,
    name: "Coinbase Wallet",
    downloadUrl: "https://www.coinbase.com/wallet",
    mobileDeepLink: "https://go.cb-w.com/dapp?cb_url=" + encodeURIComponent(typeof window !== "undefined" ? window.location.href : ""),
    color: "#0052FF",
    borderColor: "#0052FF",
    enable: true,
    getProvider: () => window.coinbaseWalletExtension,
    checkProvider: isProviderAvailable,
  },
  [WalletId.ETHEREUM]: {
    id: WalletId.ETHEREUM,
    name: "Ethereum Wallet",
    downloadUrl: "",
    color: "#627EEA",
    borderColor: "#627EEA",
    enable: true,
    getProvider: () => {
      // Only return if not MetaMask and not occupied by other wallets
      if (
        window.ethereum &&
        !window.ethereum.isMetaMask &&
        isProviderAvailable(window.ethereum)
      ) {
        return window.ethereum;
      }
      return undefined;
    },
    checkProvider: isProviderAvailable,
  },
};

// Get list of all supported wallet IDs
export const SUPPORTED_WALLET_IDS = Object.values(WalletId);

// Get wallet configuration by ID
export function getWalletConfig(id: WalletId | string): WalletConfig | undefined {
  return WALLET_CONFIGS[id as WalletId];
}

// Get wallet download link
export function getWalletDownloadUrl(id: WalletId | string): string {
  return getWalletConfig(id)?.downloadUrl || "";
}

// Get wallet mobile deep link
export function getWalletMobileDeepLink(id: WalletId | string): string {
  return getWalletConfig(id)?.mobileDeepLink || "";
}

