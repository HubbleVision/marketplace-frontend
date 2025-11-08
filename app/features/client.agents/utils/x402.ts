/**
 * x402 Protocol Utilities
 * Helper functions for handling x402 payment protocol
 */

import type {
  X402PaymentRequirement,
  X402PaymentResponse,
  X402PaymentProof,
} from "../types/x402";
import type { Address, Hash } from "viem";
import { parseUnits } from "viem";

/**
 * Check if a response is an x402 payment required response
 */
export function isX402PaymentResponse(
  response: unknown
): response is X402PaymentResponse {
  if (!response || typeof response !== "object") return false;

  const obj = response as Record<string, unknown>;

  return (
    obj.status === "payment_required" &&
    typeof obj.payment_id === "string" &&
    typeof obj.x402_version === "string" &&
    Array.isArray(obj.payment_requirements) &&
    obj.payment_requirements.length > 0
  );
}

/**
 * Get the first payment requirement from the response
 * Currently only supports single payment requirement
 */
export function getFirstPaymentRequirement(
  response: X402PaymentResponse
): X402PaymentRequirement | null {
  return response.payment_requirements[0] ?? null;
}

/**
 * Parse the payment amount from the requirement
 * Returns the amount in the smallest unit (e.g., wei for ETH, smallest unit for ERC20)
 */
export function parsePaymentAmount(
  requirement: X402PaymentRequirement,
  decimals: number = 6 // Default to 6 for USDC
): bigint {
  try {
    const amountStr = requirement.maxAmountRequired;
    // If the amount is already in smallest units (no decimal point)
    if (!amountStr.includes(".")) {
      return BigInt(amountStr);
    }
    // If the amount has decimals, parse it properly
    return parseUnits(amountStr, decimals);
  } catch (error) {
    console.error("Failed to parse payment amount:", error);
    throw new Error("Invalid payment amount format");
  }
}

/**
 * Format the payment requirement into a human-readable string
 */
export function formatPaymentRequirement(
  requirement: X402PaymentRequirement
): string {
  const tokenName = requirement.extra?.name ?? "tokens";
  const amount = Number(requirement.maxAmountRequired) / 1_000_000; // Assuming 6 decimals for USDC
  return `${amount.toFixed(2)} ${tokenName}`;
}

/**
 * Create a payment proof object after successful transaction
 */
export function createPaymentProof(
  paymentId: string,
  requirement: X402PaymentRequirement,
  transactionHash: Hash,
  fromAddress: Address
): X402PaymentProof {
  return {
    payment_id: paymentId,
    transaction_hash: transactionHash,
    network: requirement.network,
    from: fromAddress,
    to: requirement.payTo,
    amount: requirement.maxAmountRequired,
    asset: requirement.asset,
    timestamp: Date.now(),
  };
}

/**
 * ERC20 ABI for token transfer
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;
