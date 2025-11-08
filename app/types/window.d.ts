// Extend Window interface to support ethereum providers
interface Window {
  ethereum?: {
    request: <T = unknown>(args: {
      method: string;
      params?: unknown[];
    }) => Promise<T>;
    isMetaMask?: boolean;
  };
  okxwallet?: {
    request: <T = unknown>(args: {
      method: string;
      params?: unknown[];
    }) => Promise<T>;
  };
  tokenpocket?: {
    ethereum?: {
      request: <T = unknown>(args: {
        method: string;
        params?: unknown[];
      }) => Promise<T>;
    };
  };
  coinbaseWalletExtension?: {
    request: <T = unknown>(args: {
      method: string;
      params?: unknown[];
    }) => Promise<T>;
  };
}

