import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createWalletClient, custom, type Address } from "viem";
import { useSession, TOKEN_KEY } from "~/components/session";

import type { WalletProvider } from "../lib/wallet-detector";
import { createChallengeApiV1AuthChallengePostMutation, loginApiV1AuthLoginPostMutation } from "@openapi/@tanstack/react-query.gen";

// Base Sepolia chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

export function useWalletLogin() {
  const { setSession } = useSession();
  const [isConnecting, setIsConnecting] = useState(false);

  const challengeMutation = useMutation(
    createChallengeApiV1AuthChallengePostMutation()
  );

  const loginMutation = useMutation(loginApiV1AuthLoginPostMutation());

  const login = async (provider: WalletProvider) => {
    if (!provider.isInstalled || !provider.provider) {
      throw new Error(`${provider.name} is not installed`);
    }

    const ethereumProvider = provider.provider as {
      request: <T = unknown>(args: {
        method: string;
        params?: unknown[];
      }) => Promise<T>;
    };

    try {
      setIsConnecting(true);

      // 1. Connect wallet and get accounts
      // Verify if provider is really available (prevent case where MetaMask is disabled but still shows as clickable)
      let accounts: string[];
      try {
        accounts = await ethereumProvider.request<string[]>({
          method: "eth_requestAccounts",
        });
      } catch (requestError: any) {
        // If request fails, wallet might be disabled or access not allowed
        if (requestError?.code === 4001) {
          throw new Error("User rejected the connection request");
        } else if (requestError?.message?.includes("not allowed") || requestError?.message?.includes("blocked")) {
          throw new Error(`${provider.name} has blocked access to this site. Please allow access in wallet settings`);
        } else {
          throw new Error(`${provider.name} connection failed: ${requestError?.message || "Unknown error"}`);
        }
      }

      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet account found");
      }

      const walletAddress = accounts[0] as Address;

      // 2. Get current chain ID
      const chainIdHex = await ethereumProvider.request<string>({
        method: "eth_chainId",
      });
      const chainId = parseInt(chainIdHex, 16);

      // 3. Switch chain if needed
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        try {
          await ethereumProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          // If chain doesn't exist, try to add it
          if (switchError.code === 4902) {
            await ethereumProvider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}`,
                  chainName: "Base Sepolia",
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://sepolia.base.org"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      // 4. Get challenge
      const challengeResponse = await challengeMutation.mutateAsync({
        body: {
          wallet_address: walletAddress,
          chain_id: BASE_SEPOLIA_CHAIN_ID,
        },
      });

      if (!challengeResponse.message) {
        throw new Error("Failed to get challenge");
      }

      // 5. Sign message with wallet
      const walletClient = createWalletClient({
        account: walletAddress,
        transport: custom(ethereumProvider),
      });

      const signature = await walletClient.signMessage({
        message: challengeResponse.message,
      });

      // 6. Submit login request
      const loginResponse = await loginMutation.mutateAsync({
        body: {
          wallet_address: walletAddress,
          chain_id: BASE_SEPOLIA_CHAIN_ID,
          signature: signature,
          nonce: challengeResponse.nonce,
        },
      });

      // 7. Save token and update session
      if (loginResponse.access_token) {
        window.localStorage.setItem(TOKEN_KEY, loginResponse.access_token);
        setSession(true);
        return { success: true };
      } else {
        throw new Error("Login failed: No access token received");
      }
    } catch (error) {
      console.error("Wallet login failed:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    login,
    isConnecting:
      isConnecting || challengeMutation.isPending || loginMutation.isPending,
    error: challengeMutation.error || loginMutation.error,
  };
}
