import { type FC } from "react";
import {
  detectWalletProviders,
  type WalletProvider,
} from "../lib/wallet-detector";
import { useWalletLogin } from "../hooks/use-wallet-login";
import {
  getWalletDownloadUrl,
  getWalletMobileDeepLink,
  isMobile,
} from "../lib/wallet-config";
import Wallet from "~/svg/wallet";

interface WalletSelectorProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const WalletSelector: FC<WalletSelectorProps> = ({
  onSuccess,
  onError,
}) => {
  const { login, isConnecting } = useWalletLogin();
  const providers = detectWalletProviders();
  const isMobileDevice = isMobile();

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

  const handleInstallClick = (
    provider: WalletProvider,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const url = getWalletDownloadUrl(provider.id);
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (sortedProviders.length === 0) {
    return (
      <div className="text-center text-hubble-secondary py-4">
        No wallet providers detected. Please install a Web3 wallet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sortedProviders.map((provider) => (
        <div
          key={provider.id}
          className={`bg-hubble-background-secondary rounded-lg p-4 flex items-center gap-3 transition-all duration-150 ${
            provider.isInstalled
              ? "hover:bg-hubble-background-secondary/60 cursor-pointer"
              : "opacity-50"
          } ${isConnecting && provider.isInstalled ? "opacity-50 pointer-events-none" : ""}`}
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
          <Wallet />
          <div className="flex-1">
            <span className="text-white">{provider.name}</span>
            {/* PC shows not installed prompt */}
            {!isMobileDevice && !provider.isInstalled && (
              <span className="text-hubble-secondary text-sm ml-2">
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
            <span className="text-hubble-secondary text-sm">Connecting...</span>
          ) : null}
        </div>
      ))}
    </div>
  );
};
