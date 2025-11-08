import type { Route } from "./+types/agent.new";
import CreateAgentForm from "~/features/client.agents/components/createAgentForm";
import AgentEditorPage from "~/features/client.agents/components/agent-editor-page";
import Preview from "~/features/client.agents/components/preview";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create Agent - Hubble Marketplace" },
    {
      name: "description",
      content:
        "Design and publish new AI trading agents powered by Hubble's on-chain intelligence stack.",
    },
  ];
}

export default function AgentNewRoute() {
  return (
    <AgentEditorPage
      title="Launch a new agent"
      description="Wire up your preferred data source, LLM provider, prompts, and economics. Drafts are private until you publish them on-chain."
      preview={<Preview />}
    >
      <CreateAgentForm />
    </AgentEditorPage>
  );
}
