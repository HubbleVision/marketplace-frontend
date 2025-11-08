# Hubble Agents Marketplace

A decentralized marketplace for on-chain strategy and AI trading agents. Create, publish, and trade intelligent agents powered by Hubble's on-chain data infrastructure and the ERC-8004 & x402 protocols.

## Overview

Hubble Agents Marketplace enables developers and traders to build, share, and monetize AI-powered trading strategies that leverage on-chain data. By integrating ERC-8004 for on-chain agent registration and x402 for seamless pay-per-use payments, we've created a complete ecosystem for intelligent agent deployment.

## Key Features

### Agent Marketplace
- Browse and discover on-chain strategies and AI trading agents
- Filter by data source, LLM provider, and pricing model
- View agent details and execution history

### Agent Creation
- Visual form-based agent creation with no coding required
- Support for multiple pricing models: Free, Fixed, and Usage-based
- Flexible system prompt and user input template configuration
- One-click publishing to on-chain (ERC-8004)

### x402 Payment Protocol
- Automatic payment requirement detection (402 responses)
- In-wallet payment processing without redirects
- Support for multiple ERC20 tokens (USDC, etc.)
- Real-time balance checks and transaction confirmation

### Web3 Native Experience
- Multi-wallet support (MetaMask, Coinbase Wallet, OKX, etc.)
- On-chain identity verification
- Transparent on-chain transaction records

## Tech Stack

**Frontend Framework**
- React Router 7 (SSR + HMR)
- TypeScript
- Tailwind CSS

**Web3 Integration**
- wagmi + viem (Ethereum interactions)
- RainbowKit (Wallet connection)
- x402-fetch (Payment protocol)

**Visual Effects**
- Three.js
- GSAP animations

**Data Management**
- TanStack Query (React Query)
- OpenAPI auto-generated types

## Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### API Type Generation

```bash
npm run codegen
```

## Project Structure

```
app/
├── features/
│   ├── client.agents/      # Core agent marketplace functionality
│   │   ├── components/    # Agent list, creation form, detail pages
│   │   ├── hooks/         # x402 payment, agent data fetching
│   │   └── utils/         # x402 protocol utilities
│   ├── client.home/       # Homepage 3D background effects
│   └── client.user/       # User wallet management
├── components/             # Global components
│   ├── web3-provider.tsx  # Web3 context
│   └── ui/                # Base UI components
├── config/
│   └── wagmi.ts           # wagmi configuration
└── routes/                # Route pages
```

## Key Innovations

1. **x402 Protocol Integration** - Complete frontend implementation of x402 payment flow for true pay-per-use
2. **ERC-8004 Standard** - On-chain agent publishing ensures verifiability and immutability
3. **No-Code Creation** - Visual interface enables non-technical users to create AI agents
4. **Standardized On-Chain Data** - Unified data access through Hubble infrastructure

## Supported Networks

- Base Sepolia (Testnet)
- Additional network support coming soon...

## Development Notes

- All API types are auto-generated from OpenAPI specifications
- React Query manages server state
- Payment flow is fully client-side, no backend proxy required
- SSR support with Web3 features enabled client-side only

## Design Philosophy

We believe AI capabilities should be shared and traded like infrastructure. By seamlessly integrating on-chain data, AI models, and payment protocols, we've created a truly decentralized intelligent agent ecosystem.

---

Built with ❤️ using React Router.
