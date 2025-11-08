import type { Route } from "./+types/agent.$id";
import { useParams } from "react-router";
import CreateAgentForm from "~/features/client.agents/components/createAgentForm";
import AgentEditorPage from "~/features/client.agents/components/agent-editor-page";
import { useAgentDetail } from "~/features/client.agents/hooks/use-agent-detail";
import Preview from "~/features/client.agents/components/preview";

export function meta({ params }: Route.MetaArgs) {
  return [
    {
      title: params.id
        ? `Edit Agent ${params.id} - Hubble Marketplace`
        : "Edit Agent - Hubble Marketplace",
    },
    {
      name: "description",
      content:
        "Update agent prompts, providers, and pricing directly from the builder studio.",
    },
  ];
}

export default function AgentDetailRoute() {
  const { id } = useParams();
  const agentId = id ?? "";
  const agentQuery = useAgentDetail(agentId);

  return (
    <AgentEditorPage
      title={agentQuery.data?.name ?? "Edit agent"}
      description="Adjust your agent configuration, prompts, and pricing. Changes are saved as drafts until you publish them on-chain."
      preview={
        <Preview
          agent={agentQuery.data}
          isLoading={agentQuery.isPending}
        />
      }
    >
      {agentQuery.isPending ? (
        <div className="space-y-8 animate-pulse">
          {/* Agent Name & Description */}
          <section className="space-y-4">
            <div>
              <div className="h-4 w-24 bg-hubble-border rounded mb-2" />
              <div className="h-12 w-full bg-hubble-border rounded-xl" />
            </div>
            <div>
              <div className="h-4 w-20 bg-hubble-border rounded mb-2" />
              <div className="h-36 w-full bg-hubble-border rounded-xl" />
            </div>
          </section>

          {/* Data Source & LLM Provider */}
          <section className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1">
              <div className="h-4 w-24 bg-hubble-border rounded mb-2" />
              <div className="h-12 w-full bg-hubble-border rounded-xl" />
            </div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-hubble-border rounded mb-2" />
              <div className="h-12 w-full bg-hubble-border rounded-xl" />
            </div>
          </section>

          {/* System Prompt & User Prompt Template */}
          <section className="space-y-4">
            <div>
              <div className="h-4 w-28 bg-hubble-border rounded mb-2" />
              <div className="h-36 w-full bg-hubble-border rounded-xl" />
            </div>
            <div>
              <div className="h-4 w-36 bg-hubble-border rounded mb-2" />
              <div className="h-36 w-full bg-hubble-border rounded-xl" />
            </div>
          </section>

          {/* Pricing Model */}
          <section className="space-y-6">
            <div>
              <div className="h-4 w-28 bg-hubble-border rounded mb-3" />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="h-20 bg-hubble-border rounded-xl" />
                <div className="h-20 bg-hubble-border rounded-xl" />
                <div className="h-20 bg-hubble-border rounded-xl" />
              </div>
            </div>
          </section>

          {/* Requires user input toggle */}
          <section className="flex items-center justify-between rounded-xl border border-hubble-border/70 bg-hubble-background-secondary/40 p-4">
            <div className="space-y-1">
              <div className="h-4 w-36 bg-hubble-border rounded" />
              <div className="h-3 w-48 bg-hubble-border rounded" />
            </div>
            <div className="h-6 w-11 bg-hubble-border rounded-full" />
          </section>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <div className="h-12 w-32 bg-hubble-border rounded-xl" />
          </div>
        </div>
      ) : agentQuery.isError || !agentQuery.data ? (
        <div className="rounded-2xl border border-red-500/40 bg-[#1a0a0a] p-8 text-center text-red-200">
          Unable to load this agent. It may not exist or you may not have
          permission to edit it.
        </div>
      ) : (
        <CreateAgentForm agentId={agentId} initialAgent={agentQuery.data} />
      )}
    </AgentEditorPage>
  );
}
