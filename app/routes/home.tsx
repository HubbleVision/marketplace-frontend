import type { Route } from "./+types/home";
import { Link } from "react-router";
import Header from "~/components/header";
import { HeaderPadding } from "~/components/header";
import Background from "~/features/client.home/components/background";
import LuminousBody from "~/features/client.home/components/luminousBody";
import Agents from "~/features/client.agents/components/agents";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "The Marketplace for On-Chain Strategy & AI Trading Agents | Hubble" },
    {
      name: "description",
      content:
        "Build your own or leverage top AI strategies, powered by Hubble's on-chain data and the ERC-8004 & x402 protocols. Discover and deploy intelligent trading agents in the Intelligence Marketplace!",
    },
  ];
}

export default function Home() {
  return (
    <>
      <Header />
      <HeaderPadding />
      <main className="relative">
        <Background />
        <div className="relative z-10 text-center top-20 tracking-tight">
          <div className="px-6 md:px-0">
            <div className="text-center text-hubble-primary/80 text-5xl font-bold">
              The Marketplace
            </div>
            <div
              className="text-3xl mt-2 tracking-wider"
              style={{
                background: "linear-gradient(90deg, #00D2B1 0%, #EFB90B 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                fontWeight: "600",
              }}
            >
              for On-Chain Strategy & AI Trading Agents
            </div>
            <div className="text-hubble-tertiary text-xs mt-4 px-12">
              Build your own or leverage top AI strategies, powered by Hubble's
              on-chain data and the ERC-8004 & x402 protocols.
            </div>
          </div>
          <div className="flex items-center justify-center mt-10">
            <Link
              to="/agent/new"
              className="rounded-xl tracking-wide flex items-center justify-center h-12 px-14 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(4,249,210,0.5)] active:scale-100"
              style={{
                background: "linear-gradient(90deg, #04F9D2 0%, #EFB90B 100%)",
                fontWeight: "600",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(90deg, #00FFE5 0%, #FFD700 100%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(90deg, #04F9D2 0%, #EFB90B 100%)";
              }}
            >
              Create New Agent
            </Link>
          </div>

          <div
            className="text-center text-xl md:text-3xl mt-28 tracking-wider shadow-2xl"
            style={{
              background: "linear-gradient(180deg, #E0E0E0 40%, #7A7A7A 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              fontWeight: "600",
            }}
          >
            Intelligence Marketplace
          </div>

          <div
            className="mt-10 relative px-2 md:px-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 20%, #000 100%)",
            }}
          >
            <LuminousBody />
            <Agents />
          </div>
        </div>
      </main>
    </>
  );
}
