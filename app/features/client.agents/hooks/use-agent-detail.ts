import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAgentApiV1AgentsAgentIdGetOptions } from "@openapi/@tanstack/react-query.gen";
import { useSession } from "~/components/session";

export function useAgentDetail(agentId?: string) {
  const { pending: sessionPending } = useSession();
  const query = useQuery({
    ...getAgentApiV1AgentsAgentIdGetOptions({
      path: { agent_id: agentId ?? "" },
    }),
    enabled: Boolean(agentId) && !sessionPending,
  });

  useEffect(() => {
    if (!query.data) return;
    console.log("[AgentDetail] fetched agent", {
      agentId,
      name: query.data.name,
    });
  }, [agentId, query.data]);

  useEffect(() => {
    if (!query.error) return;
    console.error("[AgentDetail] failed to fetch agent", {
      agentId,
      error: query.error,
    });
  }, [agentId, query.error]);

  return query;
}
