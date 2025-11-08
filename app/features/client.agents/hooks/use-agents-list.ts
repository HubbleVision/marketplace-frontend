import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAgentsApiV1AgentsGetOptions } from "@openapi/@tanstack/react-query.gen";
import type { ListAgentsApiV1AgentsGetData } from "@openapi/types.gen";
import { useSession } from "~/components/session";

type AgentsFilters = {
  search?: string;
  llmProviderId?: string;
};

type Pagination = {
  limit: number;
  offset: number;
};

type UseAgentsListArgs = {
  filters: AgentsFilters;
  pagination: Pagination;
};

export function useAgentsList({ filters, pagination }: UseAgentsListArgs) {
  const { pending: sessionPending } = useSession();
  const queryFilters = useMemo<ListAgentsApiV1AgentsGetData["query"]>(() => {
    const baseFilters: ListAgentsApiV1AgentsGetData["query"] = {
      limit: pagination.limit,
      offset: pagination.offset,
    };

    if (filters.llmProviderId) {
      baseFilters.llm_provider_id = filters.llmProviderId;
    }

    if (filters.search) {
      // Backend currently exposes a generic `search` filter, so reuse it
      // until chain/network specific filters become available.
      baseFilters.search = filters.search;
    }

    return baseFilters;
  }, [
    filters.llmProviderId,
    filters.search,
    pagination.limit,
    pagination.offset,
  ]);

  const queryOptions = useMemo(
    () => ({
      ...listAgentsApiV1AgentsGetOptions({
        query: queryFilters,
      }),
      // Force a refetch whenever filters collapse back to "all" even if
      // we're reusing a previously cached query key (useful when toggling
      // between filters quickly).
      staleTime: 0,
      enabled: !sessionPending,
    }),
    [queryFilters, sessionPending]
  );

  const query = useQuery(queryOptions);

  useEffect(() => {
    if (!query.data) return;
    const { total, limit, offset, items } = query.data;
    const page = limit ? Math.floor(offset / limit) + 1 : 1;

    console.log("[Agents] fetched paginated results", {
      filters: {
        network: filters.search ?? "all",
        llmProviderId: filters.llmProviderId ?? "all",
      },
      pagination: { total, limit, offset, page },
      items,
    });
  }, [filters.llmProviderId, filters.search, query.data]);

  return { ...query, isFetching: query.isFetching || sessionPending };
}
