import { useState } from "react";
import Header, { HeaderPadding } from "~/components/header";
import { cn } from "~/lib/utils";

type AgentEditorPageProps = {
  title: string | React.ReactNode;
  description: string;
  children: React.ReactNode;
  preview?: React.ReactNode;
};

type TabType = "configure" | "preview";

export default function AgentEditorPage({
  title,
  description,
  children,
  preview,
}: AgentEditorPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("configure");
  const isPreviewActive = activeTab === "preview";
  const isConfigureActive = activeTab === "configure";

  return (
    <>
      <Header />
      <HeaderPadding />

      {/* Mobile Tabs */}
      <div className="lg:hidden sticky top-12 z-10 backdrop-blur-xs border-b border-hubble-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("configure")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "configure"
                ? "text-white border-b-2 border-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Configure
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "preview"
                ? "text-white border-b-2 border-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      <main className="relative overflow-hidden flex min-h-[calc(100vh-48px)] lg:min-h-[calc(100vh-64px)]">
        {/* Mobile: Show content based on active tab */}
        <div className="lg:hidden flex-1">
          <div
            className={cn(
              "p-6 overflow-hidden",
              isConfigureActive ? "block" : "hidden"
            )}
          >
            <h1 className="text-white text-4xl font-bold mb-10 hidden lg:block">
              Configure
            </h1>
            {children}
          </div>
          <div
            className={`fixed top-[calc(48px+49px)] left-0 right-0 bottom-0 text-white overflow-hidden ${
              isPreviewActive ? "flex" : "hidden"
            }`}
            aria-hidden={!isPreviewActive}
          >
            {preview}
          </div>
        </div>

        {/* Desktop: Side-by-side layout */}
        <section className="hidden lg:flex flex-1">
          <div className="w-20 h-full border-r border-hubble-border" />
          <div className="flex-1 p-6 lg:p-10 border-r border-hubble-border overflow-hidden">
            <h1 className="text-white text-4xl font-bold mb-10">Configure</h1>
            {children}
          </div>
        </section>
        <section className="hidden lg:block flex-1" />
        <section className="hidden flex-1 fixed top-12 lg:top-16 right-0 w-1/2 h-[calc(100vh-48px)] lg:h-[calc(100vh-64px)] text-white lg:flex">
          {preview}
        </section>
      </main>
    </>
  );
}
