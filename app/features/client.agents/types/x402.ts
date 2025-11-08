/**
 * x402 Protocol Types
 * Based on the x402 payment protocol specification
 */

export type X402PaymentScheme = "exact" | "range";

export type X402Network = string; // e.g., "base-sepolia", "ethereum", "polygon"

export interface X402PaymentRequirement {
  scheme: X402PaymentScheme;
  network: X402Network;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema: {
    input: {
      type: string;
      method: string;
      discoverable: boolean;
    };
    output: null | unknown;
  };
  payTo: string; // Recipient address
  maxTimeoutSeconds: number;
  asset: string; // ERC20 token contract address
  extra?: {
    name?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export interface X402PaymentResponse {
  status: "payment_required";
  agent_run_id: string;
  payment_id: string;
  x402_version: string;
  payment_requirements: X402PaymentRequirement[];
  error: string;
}

export interface X402PaymentProof {
  payment_id: string;
  transaction_hash: string;
  network: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  timestamp: number;
}
