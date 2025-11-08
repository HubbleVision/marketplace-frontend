/**
 * x402 Payment Hook
 * Handles the complete x402 payment flow for agent runs
 */

import { useCallback, useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import type { Hash, Address } from "viem";
import type {
  X402PaymentResponse,
  X402PaymentRequirement,
} from "../types/x402";
import {
  isX402PaymentResponse,
  getFirstPaymentRequirement,
  parsePaymentAmount,
  createPaymentProof,
  ERC20_ABI,
} from "../utils/x402";

export type X402PaymentStatus =
  | "idle"
  | "detecting"
  | "preparing"
  | "awaiting_signature"
  | "confirming"
  | "completed"
  | "failed";

export interface UseX402PaymentOptions {
  onPaymentComplete?: (transactionHash: Hash) => void;
  onPaymentError?: (error: Error) => void;
}

export interface UseX402PaymentReturn {
  status: X402PaymentStatus;
  error: Error | null;
  isProcessing: boolean;
  paymentRequirement: X402PaymentRequirement | null;
  processPayment: (response: unknown) => Promise<Hash | null>;
  reset: () => void;
}

/**
 * Hook for handling x402 payment protocol
 *
 * Usage:
 * ```tsx
 * const { processPayment, status, error } = useX402Payment({
 *   onPaymentComplete: (txHash) => {
 *     console.log('Payment completed:', txHash);
 *   }
 * });
 *
 * // When API returns 402 response
 * const txHash = await processPayment(apiResponse);
 * ```
 */
export function useX402Payment(
  options: UseX402PaymentOptions = {}
): UseX402PaymentReturn {
  const { onPaymentComplete, onPaymentError } = options;

  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<X402PaymentStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [paymentRequirement, setPaymentRequirement] =
    useState<X402PaymentRequirement | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPaymentRequirement(null);
  }, []);

  const processPayment = useCallback(
    async (response: unknown): Promise<Hash | null> => {
      try {
        setError(null);
        setStatus("detecting");

        // Check if this is an x402 payment response
        if (!isX402PaymentResponse(response)) {
          throw new Error("Invalid x402 payment response");
        }

        // Get the first payment requirement
        const requirement = getFirstPaymentRequirement(response);
        if (!requirement) {
          throw new Error("No payment requirement found");
        }

        setPaymentRequirement(requirement);
        setStatus("preparing");

        // Check if wallet is connected
        if (!isConnected || !userAddress) {
          throw new Error("Wallet not connected. Please connect your wallet.");
        }

        // Get token decimals from the contract
        let decimals = 6; // Default to 6 (USDC standard)
        try {
          if (publicClient) {
            const decimalsResult = await publicClient.readContract({
              address: requirement.asset as Address,
              abi: ERC20_ABI,
              functionName: "decimals",
            });
            decimals = Number(decimalsResult);
          }
        } catch (err) {
          console.warn("Failed to fetch token decimals, using default:", err);
        }

        // Parse the payment amount
        const paymentAmount = parsePaymentAmount(requirement, decimals);

        // Check user balance
        if (publicClient) {
          try {
            const balance = (await publicClient.readContract({
              address: requirement.asset as Address,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [userAddress as Address],
            })) as bigint;

            if (balance < paymentAmount) {
              const tokenName = requirement.extra?.name ?? "tokens";
              throw new Error(
                `Insufficient ${tokenName} balance. Required: ${Number(paymentAmount) / Math.pow(10, decimals)} ${tokenName}`
              );
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes("Insufficient")) {
              throw err;
            }
            console.warn("Failed to check balance:", err);
          }
        }

        setStatus("awaiting_signature");

        // Execute the token transfer
        const txHash = await writeContractAsync({
          address: requirement.asset as Address,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [requirement.payTo as Address, paymentAmount],
        });

        setStatus("confirming");

        // Wait for transaction confirmation
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
          });
        }

        // Create payment proof
        const proof = createPaymentProof(
          response.payment_id,
          requirement,
          txHash,
          userAddress
        );

        console.log("Payment proof:", proof);

        setStatus("completed");
        onPaymentComplete?.(txHash);

        return txHash;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Payment failed");
        setError(error);
        setStatus("failed");
        onPaymentError?.(error);
        return null;
      }
    },
    [
      isConnected,
      userAddress,
      writeContractAsync,
      publicClient,
      onPaymentComplete,
      onPaymentError,
    ]
  );

  const isProcessing = ["detecting", "preparing", "awaiting_signature", "confirming"].includes(
    status
  );

  return {
    status,
    error,
    isProcessing,
    paymentRequirement,
    processPayment,
    reset,
  };
}
