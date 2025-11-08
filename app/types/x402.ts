/**
 * X402 Payment Protocol Types
 * Based on lego-fe implementation
 */

export interface X402PaymentRequirement {
  network: string;
  asset: string; // Token contract address
  maxAmountRequired: string | number; // Amount in smallest unit (e.g., wei, smallest token unit) - can be string or number
  payTo: string; // Payment recipient address
  maxTimeoutSeconds: number;
  description?: string;
  resource?: string;
  scheme?: string;
  mimeType?: string;
  outputSchema?: unknown;
  extra?: {
    name?: string;
    decimals?: number;
    symbol?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export interface X402ErrorResponse {
  accepts: X402PaymentRequirement[];
  error?: string;
  message?: string;
}

// EIP-3009 Payment Payload for "exact" scheme on EVM
export interface X402PaymentPayload {
  from: string; // Payer address
  to: string; // Payee address
  value: string; // Amount in smallest unit
  validAfter: string; // Timestamp when authorization becomes valid
  validBefore: string; // Timestamp when authorization expires
  nonce: string; // 32 bytes hex nonce
  v: number; // Signature v component
  r: string; // Signature r component (32 bytes hex)
  s: string; // Signature s component (32 bytes hex)
}

export interface X402PaymentProof {
  x402Version: number;
  scheme: string;
  payload: X402PaymentPayload;
}

export interface X402PaymentResponse {
  transaction?: string; // Transaction hash
  network?: string;
  networkType?: string;
  chainId?: number;
  payer?: string;
  amount?: string;
  success: boolean;
  error?: string;
}

export interface X402QueryRequest {
  question: string;
  [key: string]: unknown; // Allow additional properties
}

export interface X402QueryResponse {
  success: boolean;
  sqlQuery?: string | null;
  dbResults?: Record<string, unknown>[];
  error?: string;
  raw?: unknown;
  durationMs?: number;
}
