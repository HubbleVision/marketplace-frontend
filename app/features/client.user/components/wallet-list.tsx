import { type FC, type SVGProps, useEffect } from "react";
import { detectWalletProviders, type WalletProvider } from "../lib/wallet-detector";
import { useWalletLogin } from "../hooks/use-wallet-login";
import {
  WalletId,
  WALLET_CONFIGS,
  getWalletDownloadUrl,
  getWalletMobileDeepLink,
  isMobile
} from "../lib/wallet-config";
import Wallet from "~/svg/wallet";
import Metamask from "~/svg/metamask";
import Coinbase from "~/svg/coinbase";
import Okx from "~/svg/okx";
import TokenPocket from "~/svg/tokenpocket";

interface WalletListProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onConnectingChange?: (isConnecting: boolean) => void;
}

// Wallet icon component mapping
type WalletIconComponent = FC<SVGProps<SVGSVGElement>>;

const walletIconMap: Record<WalletId, WalletIconComponent | null> = {
  [WalletId.METAMASK]: Metamask,
  [WalletId.OKX]: Okx,
  [WalletId.TOKENPOCKET]: TokenPocket,
  [WalletId.COINBASE]: Coinbase,
  [WalletId.ETHEREUM]: null,
};

export const WalletList: FC<WalletListProps> = ({
  onSuccess,
  onError,
  onConnectingChange,
}) => {
  const { login, isConnecting } = useWalletLogin();
  const providers = detectWalletProviders();
  const isMobileDevice = isMobile();

  // Notify parent component of connection state changes
  useEffect(() => {
    onConnectingChange?.(isConnecting);
  }, [isConnecting, onConnectingChange]);

  // Sort providers: installed first, then not installed
  const sortedProviders = [...providers].sort((a, b) => {
    if (a.isInstalled && !b.isInstalled) return -1;
    if (!a.isInstalled && b.isInstalled) return 1;
    return 0;
  });

  const handleWalletSelect = async (provider: WalletProvider) => {
    // Mobile: open deep link
    if (isMobileDevice && provider.isMobileAvailable) {
      const deepLink = getWalletMobileDeepLink(provider.id);
      if (deepLink) {
        window.location.href = deepLink;
        // Mobile redirect doesn't count as connection success, so don't call onSuccess
        return;
      }
    }

    // PC: connect wallet plugin
    try {
      await login(provider);
      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      onError?.(err);
    }
  };

  const handleInstallClick = (provider: WalletProvider, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getWalletDownloadUrl(provider.id);
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (sortedProviders.length === 0) {
    return (
      <div className="text-center text-hubble-secondary py-4 text-sm">
        No wallet providers detected. Please install a Web3 wallet.
      </div>
    );
  }

  const WalletIcon: FC<{ providerId: string }> = ({ providerId }) => {
    const IconComponent = walletIconMap[providerId as WalletId];

    if (IconComponent) {
      return <IconComponent className="w-5 h-5" />;
    }

    return <Wallet className="w-5 h-5 text-white" />;
  };

  return (
    <div className="flex flex-col gap-2 pl-4 border-l-2 border-hubble-border">
      {sortedProviders.map((provider) => {
        const config = WALLET_CONFIGS[provider.id as WalletId];
        const borderColor = config?.borderColor || "transparent";
        const hoverBorderColor = config?.color || "transparent";
        const backgroundColor = config?.color || "#1A1A1A";
        const bgOpacity = provider.isInstalled ? "15" : "08";

        return (
          <div
            key={provider.id}
            className={`rounded-lg p-3 flex items-center gap-3 transition-all duration-150 border ${
              provider.isInstalled
                ? "cursor-pointer hover:border-opacity-50"
                : "opacity-50"
            } ${isConnecting && provider.isInstalled ? "opacity-50 pointer-events-none" : ""}`}
            style={{
              backgroundColor: `${backgroundColor}${bgOpacity}`,
              borderColor: provider.isInstalled
                ? `${borderColor}40`
                : "transparent",
            }}
            onMouseEnter={(e) => {
              if (provider.isInstalled && !isConnecting) {
                e.currentTarget.style.borderColor = hoverBorderColor;
                e.currentTarget.style.backgroundColor = `${backgroundColor}25`;
              }
            }}
            onMouseLeave={(e) => {
              if (provider.isInstalled) {
                e.currentTarget.style.borderColor = `${borderColor}40`;
                e.currentTarget.style.backgroundColor = `${backgroundColor}${bgOpacity}`;
              }
            }}
            onClick={() => {
              if (provider.isInstalled && !isConnecting) {
                handleWalletSelect(provider);
              }
            }}
            role={provider.isInstalled ? "button" : undefined}
            tabIndex={provider.isInstalled ? 0 : -1}
            onKeyDown={(e) => {
              if (
                provider.isInstalled &&
                !isConnecting &&
                (e.key === "Enter" || e.key === " ")
              ) {
                e.preventDefault();
                handleWalletSelect(provider);
              }
            }}
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <WalletIcon providerId={provider.id} />
            </div>
            <div className="flex-1">
              <span className="text-white text-sm">{provider.name}</span>
              {/* PC shows not installed prompt */}
              {!isMobileDevice && !provider.isInstalled && (
                <span className="text-hubble-secondary text-xs ml-2">
                  (Not installed)
                </span>
              )}
            </div>
            {/* PC: show install button or connection status */}
            {!isMobileDevice && !provider.isInstalled ? (
              <button
                onClick={(e) => handleInstallClick(provider, e)}
                className="px-3 py-1 text-xs bg-hubble-primary text-black rounded hover:bg-hubble-primary/80 transition-colors"
                type="button"
              >
                Install
              </button>
            ) : !isMobileDevice && isConnecting ? (
              <span className="text-hubble-secondary text-xs">
                Connecting...
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

