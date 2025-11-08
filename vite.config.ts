import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { ServerResponse } from "http";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    proxy: {
      // Proxy all requests starting with /api to the dev server and remove the /api prefix
      "/api": {
        target: process.env.SERVER_BASE_URL,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy, options) => {
          // Use http-proxy instance event listeners to dynamically modify request headers
          proxy.on("proxyReq", (proxyReq, req, res) => {
            // Safely get target URL information
            const targetUrl = process.env.SERVER_BASE_URL;
            const targetHost = process.env.SERVER_BASE_URL;

            // Dynamically set headers for each request
            proxyReq.setHeader("Origin", "");
            proxyReq.setHeader("Referer", "");
            proxyReq.setHeader("Host", targetHost);

            // Optional: Add other custom headers
            proxyReq.setHeader("User-Agent", "Vite Dev Server");

            // ⚠️ CRITICAL for x402 Payment Protocol:
            // Forward x402 payment headers from client to backend
            // These headers contain the payment authorization signature
            if (req.headers["x-payment"]) {
              proxyReq.setHeader("X-Payment", req.headers["x-payment"] as string);
              console.log("💳 Forwarding X-Payment header to backend");
            }
            if (req.headers["x-payment-request"]) {
              proxyReq.setHeader("X-Payment-Request", req.headers["x-payment-request"] as string);
            }

            // Debug logs (can be enabled in development)
            console.log(
              `Proxy request: ${req.method} ${req.url} -> ${targetUrl}${proxyReq.path}`
            );
          });

          // Optional: Handle response errors
          proxy.on("error", (err, req, res) => {
            console.error("Proxy error:", err.message);
            // Check if res is of ServerResponse type
            if (res && typeof (res as ServerResponse).writeHead === "function") {
              const httpRes = res as ServerResponse;
              if (!httpRes.headersSent) {
                httpRes.writeHead(500, {
                  "Content-Type": "text/plain",
                });
                httpRes.end("Proxy server error");
              }
            }
          });

          // Optional: Log successful proxy requests
          proxy.on("proxyRes", (proxyRes, req, res) => {
            // ⚠️ CRITICAL for x402 Payment Protocol:
            // Forward x402 payment response headers from backend to client
            // These headers contain the payment receipt/confirmation
            if (proxyRes.headers["x-payment-response"]) {
              res.setHeader("X-Payment-Response", proxyRes.headers["x-payment-response"]);
              console.log("💳 Forwarding X-Payment-Response header to client");
            }
            if (proxyRes.headers["x-payment-receipt"]) {
              res.setHeader("X-Payment-Receipt", proxyRes.headers["x-payment-receipt"]);
            }

            console.log(`Proxy response: ${proxyRes.statusCode} ${req.url}`);
          });
        },
      },
    },
  },
  build: {
    // Optimize build process to avoid circular dependency issues
    rollupOptions: {
      onwarn(warning, warn) {
        // For specific warning types, we can choose to ignore or log
        if (warning.code === "CIRCULAR_DEPENDENCY") {
          console.warn("Circular dependency detected:", warning.message);
          return;
        }
        if (warning.code === "SOURCEMAP_ERROR") {
          return;
        }
        warn(warning);
      },
    },
  },
  optimizeDeps: {
    // Pre-build optimization to ensure consistent dependency resolution
    include: ["react", "react-dom", "react-router"],
  },
});
