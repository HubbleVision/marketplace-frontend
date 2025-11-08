"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

interface ConnectWalletProps {
  showDisconnect?: boolean;
  className?: string;
  children?: (props: {
    account?: { address: string };
    chain?: { id: number };
    openConnectModal: () => void;
    mounted: boolean;
  }) => React.ReactNode;
}

export function ConnectWallet({
  showDisconnect = false,
  className = "",
  children,
}: ConnectWalletProps) {
  const { address, isConnected } = useAccount();

  // If using custom render prop
  if (children) {
    return (
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, mounted }) => {
          return (
            <>
              {children({
                account,
                chain,
                openConnectModal,
                mounted,
              })}
            </>
          );
        }}
      </ConnectButton.Custom>
    );
  }

  // Default button UI using RainbowKit
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account;

        if (connected && showDisconnect) {
          return (
            <ConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus="address"
            />
          );
        }

        if (connected && !showDisconnect) {
          return null;
        }

        return (
          <button
            type="button"
            onClick={openConnectModal}
            className={
              className ||
              "flex h-12 items-center justify-center rounded-2xl bg-hubble-primary/20 border border-hubble-primary px-6 text-sm font-semibold text-hubble-primary transition hover:bg-hubble-primary/30"
            }
          >
            Connect Wallet
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

// Custom render component for backward compatibility
ConnectWallet.Custom = function ConnectWalletCustom({
  children,
}: {
  children: (props: {
    account?: { address: string };
    chain?: { id: number };
    openConnectModal: () => void;
    mounted: boolean;
  }) => React.ReactNode;
}) {
  return <ConnectWallet>{children}</ConnectWallet>;
};
