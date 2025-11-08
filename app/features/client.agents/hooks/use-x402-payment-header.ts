/**
 * x402 Payment Header Hook
 * Handles the x402 payment flow by generating payment headers (not executing on-chain transfers)
 * Based on examples/x402-payment-header.py
 */

import { useCallback, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import type { WalletClient } from "viem";
import {
  preparePaymentHeader,
  signPaymentHeader,
} from "x402/client";
import type { PaymentRequirements } from "x402/types";

export type X402PaymentHeaderStatus =
  | "idle"
  | "detecting"
  | "preparing"
  | "signing"
  | "completed"
  | "failed";

export interface X402PaymentResponse {
  status: "payment_required";
  agent_run_id: string;
  payment_id: string;
  x402_version: number | string;
  payment_requirements: PaymentRequirements[];
  error?: string;
}

export interface UseX402PaymentHeaderOptions {
  onHeaderGenerated?: (header: string) => void;
  onError?: (error: Error) => void;
}

export interface UseX402PaymentHeaderReturn {
  status: X402PaymentHeaderStatus;
  error: Error | null;
  isProcessing: boolean;
  paymentResponse: X402PaymentResponse | null;
  generatePaymentHeader: (response: unknown) => Promise<string | null>;
  reset: () => void;
}

/**
 * Check if a response is an x402 payment required response
 */
function isX402PaymentResponse(response: unknown): response is X402PaymentResponse {
  if (!response || typeof response !== "object") return false;

  const obj = response as Record<string, unknown>;

  return (
    obj.status === "payment_required" &&
    typeof obj.agent_run_id === "string" &&
    typeof obj.payment_id === "string" &&
    (typeof obj.x402_version === "string" || typeof obj.x402_version === "number") &&
    Array.isArray(obj.payment_requirements) &&
    obj.payment_requirements.length > 0
  );
}

/**
 * Hook for generating x402 payment headers
 *
 * Unlike the previous implementation that executes on-chain transfers,
 * this hook generates the X-PAYMENT header using EIP-3009 authorization signatures.
 *
 * Flow:
 * 1. First request returns 402 with payment_requirements
 * 2. Generate X-PAYMENT header using preparePaymentHeader + signPaymentHeader
 * 3. Retry request with same URL/body but add X-PAYMENT header
 *
 * Usage:
 * ```tsx
 * const { generatePaymentHeader, status } = useX402PaymentHeader({
 *   onHeaderGenerated: (header) => {
 *     console.log('Payment header generated:', header);
 *   }
 * });
 *
 * // When API returns 402 response
 * const paymentHeader = await generatePaymentHeader(apiResponse);
 * if (paymentHeader) {
 *   // Retry request with X-PAYMENT header
 *   await fetch(url, {
 *     headers: { 'X-PAYMENT': paymentHeader }
 *   });
 * }
 * ```
 */
export function useX402PaymentHeader(
  options: UseX402PaymentHeaderOptions = {}
): UseX402PaymentHeaderReturn {
  const { onHeaderGenerated, onError } = options;

  const { address: userAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<X402PaymentHeaderStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<X402PaymentResponse | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPaymentResponse(null);
  }, []);

  const generatePaymentHeader = useCallback(
    async (response: unknown): Promise<string | null> => {
      try {
        setError(null);
        setStatus("detecting");

        // Check if this is an x402 payment response
        if (!isX402PaymentResponse(response)) {
          throw new Error("Invalid x402 payment response");
        }

        setPaymentResponse(response);
        setStatus("preparing");

        // Check if wallet is connected
        if (!isConnected || !userAddress || !walletClient) {
          throw new Error("Wallet not connected. Please connect your wallet.");
        }

        // Get the first payment requirement
        const paymentRequirement = response.payment_requirements[0];
        if (!paymentRequirement) {
          throw new Error("No payment requirement found");
        }

        // Parse x402 version
        const x402Version = typeof response.x402_version === "string"
          ? parseInt(response.x402_version, 10)
          : response.x402_version;

        if (isNaN(x402Version)) {
          console.warn(`Cannot parse x402_version=${response.x402_version}, using default version 1`);
        }

        console.log("Generating x402 payment signature:", {
          agent_run_id: response.agent_run_id,
          payment_id: response.payment_id,
          x402_version: x402Version,
          value: paymentRequirement.maxAmountRequired,
          network: paymentRequirement.network,
          pay_to: paymentRequirement.payTo,
        });

        // Prepare the unsigned payment header
        const unsignedHeader = preparePaymentHeader(
          userAddress,
          x402Version || 1,
          paymentRequirement
        );

        console.log("Unsigned header prepared:", unsignedHeader);

        setStatus("signing");

        // Sign the payment header using the wallet client
        // The signPaymentHeader function from x402/client will use the wallet's signTypedData method
        const signedHeader = await signPaymentHeader(
          walletClient as any,
          paymentRequirement,
          unsignedHeader
        );

        console.log("Payment header signed successfully");
        console.log("X-PAYMENT header (first 100 chars):", signedHeader.slice(0, 100) + "...");

        setStatus("completed");
        onHeaderGenerated?.(signedHeader);

        return signedHeader;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to generate payment header");
        console.error("Error generating payment header:", error);
        setError(error);
        setStatus("failed");
        onError?.(error);
        return null;
      }
    },
    [isConnected, userAddress, walletClient, onHeaderGenerated, onError]
  );

  const isProcessing = ["detecting", "preparing", "signing"].includes(status);

  return {
    status,
    error,
    isProcessing,
    paymentResponse,
    generatePaymentHeader,
    reset,
  };
}
