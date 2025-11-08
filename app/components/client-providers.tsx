"use client";

import type { PropsWithChildren } from "react";
import { Web3Provider } from "./web3-provider";

/**
 * Client-only Provider component
 * Only includes Web3Provider (depends on browser APIs, must execute on client)
 */
export function ClientProviders({ children }: PropsWithChildren) {
  return <Web3Provider>{children}</Web3Provider>;
}

