/**
 * x402 Payment Hook - Based on lego-fe implementation
 * Uses x402-fetch for automatic payment handling
 */

import { useState, useCallback, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import type { X402PaymentResponse } from "~/types/x402";

// Use local API route to avoid CORS issues
// The API route should proxy to the actual x402 gateway
const API_ROUTE = "/api/query";

interface UseX402PaymentOptions {
  apiRoute?: string; // Custom API route if needed
}

interface UseX402PaymentReturn<TRequest = unknown, TResponse = unknown> {
  loading: boolean;
  error: string | null;
  paymentResponse: X402PaymentResponse | null;
  executeQuery: (request: TRequest) => Promise<TResponse | null>;
  isConnected: boolean;
  address: string | undefined;
}

/**
 * Hook for handling x402 payment protocol with automatic payment flow
 *
 * Usage:
 * ```tsx
 * const { executeQuery, loading, error, paymentResponse } = useX402Payment();
 *
 * const result = await executeQuery({
 *   question: "What is the total revenue?"
 * });
 * ```
 *
 * The hook will:
 * 1. Automatically detect 402 Payment Required responses
 * 2. Prompt user to sign EIP-3009 authorization with their wallet
 * 3. Retry the request with the payment proof
 * 4. Return the successful response
 */
export function useX402Payment<TRequest = unknown, TResponse = unknown>(
  options: UseX402PaymentOptions = {}
): UseX402PaymentReturn<TRequest, TResponse> {
  const { apiRoute = API_ROUTE } = options;

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<X402PaymentResponse | null>(null);

  // Create x402-fetch wrapper with user's wallet
  // Official x402 browser wallet pattern: pass walletClient directly
  const fetchWithPayment = useMemo(() => {
    if (!walletClient || !walletClient.account) return null;

    try {
      console.log("✅ Created x402-fetch wrapper with user wallet:", walletClient.account.address);

      // Pass walletClient directly to x402-fetch (official pattern from x402 examples)
      // x402-fetch will use walletClient.signTypedData for EIP-3009 authorization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return wrapFetchWithPayment(fetch, walletClient as any);
    } catch (err) {
      console.error("❌ Failed to create x402-fetch wrapper:", err);
      return null;
    }
  }, [walletClient]);

  // Execute query with user's wallet for payment
  const executeQuery = useCallback(
    async (request: TRequest): Promise<TResponse | null> => {
      if (!isConnected || !address) {
        setError("Please connect your wallet first");
        return null;
      }

      if (!fetchWithPayment) {
        setError("Wallet client not ready. Please try again.");
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        setPaymentResponse(null);

        console.log("\n" + "=".repeat(60));
        console.log("🚀 Executing Query with User Wallet Payment");
        console.log("=".repeat(60));
        console.log("👛 Wallet Address:", address);
        console.log("📤 Request:", request);

        // Use x402-fetch wrapper - it will automatically:
        // 1. Detect 402 Payment Required response
        // 2. Prompt user to sign payment with their wallet
        // 3. Retry request with payment proof
        const response = await fetchWithPayment(apiRoute, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        console.log("📊 Response Status:", response.status);

        // Check for payment response header
        const paymentResponseHeader =
          response.headers.get("X-Payment-Response") ||
          response.headers.get("x-payment-response");

        if (paymentResponseHeader) {
          try {
            const decodedPaymentResponse = decodeXPaymentResponse(paymentResponseHeader);
            console.log("💳 Payment Response:", decodedPaymentResponse);
            setPaymentResponse(decodedPaymentResponse as X402PaymentResponse);
          } catch (e) {
            console.warn("⚠️  Failed to decode payment response:", e);
          }
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ Request failed:", errorData);
          setError(errorData.error || `Request failed: ${response.status}`);
          return null;
        }

        // Parse response
        const data = await response.json();
        console.log("✅ Query successful!");
        console.log("📦 Response data:", data);
        console.log("=".repeat(60) + "\n");

        // Extract payment info if available from response body
        if ((data as any).paymentInfo) {
          console.log("💳 Payment info from response:", (data as any).paymentInfo);
          setPaymentResponse((data as any).paymentInfo);
        }

        return data as TResponse;
      } catch (err) {
        console.error("\n" + "❌".repeat(30));
        console.error("❌ Query Execution Error:");
        console.error("❌ Error:", err);
        console.error("❌".repeat(30) + "\n");

        setError(err instanceof Error ? err.message : "Query execution failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, address, fetchWithPayment, apiRoute]
  );

  return {
    loading,
    error,
    paymentResponse,
    executeQuery,
    isConnected,
    address,
  };
}
