"use client";

import type { FC } from "react";
import { Link } from "react-router";
import WalletConnectButton from "~/features/client.user/components/wallet-connect-button";
import { cn } from "~/lib/utils";
import Logo from "~/svg/logo";
import LogoAi from "~/svg/logo-ai";

const Header: FC = () => {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "border-b border-hubble-border",
        "flex items-center justify-between",
        "px-4 h-12",
        "md:px-10 md:h-16",
        "backdrop-blur-xs"
      )}
    >
      <Link to="/" className="space-x-1">
        <Logo className="inline" />
        <LogoAi className="inline" />
      </Link>
      <WalletConnectButton />
    </header>
  );
};

export const HeaderPadding = () => (
  <div className={cn("px-4 h-12", "md:px-10 md:h-16")} />
);

export default Header;
