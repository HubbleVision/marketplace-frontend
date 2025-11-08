import { useMemo } from "react";
import type { Route } from "./+types/me.agents";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, RefreshCw, SquarePen } from "lucide-react";
import Header, { HeaderPadding } from "~/components/header";
import { useSession } from "~/components/session";
import { listMyAgentsApiV1MeAgentsGetOptions } from "@openapi/@tanstack/react-query.gen";
import type { AgentSummary } from "@openapi/types.gen";

const PAGE_SIZE = 50;

type AgentTableItem = AgentSummary &
  Partial<{
    description: string | null;
    revenue: string | number | null;
    calls: number | null;
    updated_at: Date | string | null;
  }>;

const numberFormatter = new Intl.NumberFormat("en-US");

const formatRevenue = (agent: AgentTableItem) => {
  const value = agent.revenue ?? agent.price_amount;
  if (value == null || value === "") {
    return "$0";
  }

  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    const currency = agent.currency?.toUpperCase() ?? "USD";
    if (currency === "USD") {
      return `$${parsed.toLocaleString()}`;
    }
    return `${parsed.toLocaleString()} ${currency}`;
  }

  return `${value}`;
};

const formatCalls = (agent: AgentTableItem) => {
  if (agent.calls == null) return "0";
  return numberFormatter.format(agent.calls);
};

const formatDate = (date: Date) => format(date, "MMM d, yyyy");

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Data Lab - Hubble Marketplace" },
    {
      name: "description",
      content:
        "Review and manage every AI agent you've drafted or published on Hubble.",
    },
  ];
}

export default function MyAgentsRoute() {
  const { session, pending } = useSession();
  const myAgentsQuery = useQuery({
    ...listMyAgentsApiV1MeAgentsGetOptions({
      query: { limit: PAGE_SIZE, offset: 0 },
    }),
    enabled: session && !pending,
    staleTime: 30_000,
  });

  const agents = useMemo<AgentTableItem[]>(() => {
    if (!myAgentsQuery.data?.items) return [];
    // Backend currently returns a superset of AgentSummary fields (description, metrics, etc.).
    // Cast here so we can surface those optional properties while keeping strict typing elsewhere.
    return myAgentsQuery.data.items as AgentTableItem[];
  }, [myAgentsQuery.data?.items]);

  const renderTableBody = () => {
    if (myAgentsQuery.isLoading) {
      return (
        <div className="space-y-4 p-8">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-12 rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (myAgentsQuery.isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <p className="text-lg font-semibold text-white">
            Something went wrong while loading your agents.
          </p>
          <p className="text-sm text-white/60 max-w-md">
            {myAgentsQuery.error instanceof Error
              ? myAgentsQuery.error.message
              : "Please try again in a moment."}
          </p>
          <button
            onClick={() => myAgentsQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:border-hubble-primary hover:text-hubble-primary transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }

    if (!agents.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <p className="text-lg font-semibold text-white">
            You haven&apos;t drafted any agents yet.
          </p>
          <p className="text-sm text-white/60 max-w-md">
            Publishing your first agent turns this space into a personal control
            room for monitoring visibility, status, and performance.
          </p>
          <Link
            to="/agent/new"
            className="inline-flex items-center gap-2 rounded-xl bg-hubble-primary px-5 py-2 text-sm font-medium text-black transition hover:bg-hubble-primary/80"
          >
            Create agent
          </Link>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-white/40">
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Visibility</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Calls</th>
              <th className="px-6 py-4 font-medium">Revenue</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => {
              const visibilityLabel = agent.is_published ? "Public" : "Private";
              const statusLabel = agent.is_published ? "Live" : "Draft";
              const visibilityStyles = agent.is_published
                ? "bg-white/5 text-white"
                : "bg-amber-500/10 text-amber-300";
              const statusStyles = agent.is_published
                ? {
                    dot: "bg-emerald-400",
                    text: "text-emerald-300",
                  }
                : {
                    dot: "bg-white/40",
                    text: "text-white/70",
                  };

              return (
                <tr
                  key={agent.id}
                  className="border-t border-white/5 last:border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-5 align-top">
                    <div className="font-semibold text-white">
                      {agent.name}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      {agent.owner_wallet}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top text-sm text-white/70">
                    <div className="max-w-xs truncate md:max-w-sm md:whitespace-normal">
                      {agent.description ?? "No description provided"}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${visibilityStyles}`}
                    >
                      {visibilityLabel}
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
                      />
                      <span
                        className={`text-sm font-medium ${statusStyles.text}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top text-sm text-white">
                    {formatCalls(agent)}
                  </td>
                  <td className="px-6 py-5 align-top text-sm text-white">
                    {formatRevenue(agent)}
                  </td>
                  <td className="px-6 py-5 align-top text-sm text-white">
                    {formatDate(agent.created_at)}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <Link
                      to={`/agent/${agent.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white transition hover:border-hubble-primary hover:text-hubble-primary"
                      aria-label={`Open ${agent.name}`}
                    >
                      <SquarePen className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (pending) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/5 bg-black/40 px-8 py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
          <p className="text-sm text-white/60">
            Checking your session. Hang tight.
          </p>
        </div>
      );
    }

    if (!session) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/5 bg-black/40 px-8 py-16 text-center">
          <p className="text-lg font-semibold text-white">
            Log in to access My Data Lab
          </p>
          <p className="text-sm text-white/60 max-w-md">
            Connect your wallet or email account from the header to unlock your
            personal workspace.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-white/5 bg-hubble-background-secondary/70 backdrop-blur">
        {renderTableBody()}
      </div>
    );
  };

  return (
    <>
      <Header />
      <HeaderPadding />
      <main className="min-h-[calc(100vh-48px)] lg:min-h-[calc(100vh-64px)] bg-[#050505] px-4 pb-16 pt-8 text-white md:px-10">
        <section className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                My Data Lab
              </h1>
            </div>
            {session && (
              <div className="flex flex-col gap-3 md:flex-row">
                {/* <button
                  onClick={() => myAgentsQuery.refetch()}
                  disabled={myAgentsQuery.isFetching}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-2 text-sm font-medium text-white transition hover:border-hubble-primary hover:text-hubble-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {myAgentsQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </button> */}
                <Link
                  to="/agent/new"
                  className="inline-flex items-center justify-center rounded-xl bg-hubble-primary px-6 py-2 text-sm font-semibold text-black transition hover:bg-hubble-primary/80"
                >
                  New agent
                </Link>
              </div>
            )}
          </div>
          {renderContent()}
        </section>
      </main>
    </>
  );
}
