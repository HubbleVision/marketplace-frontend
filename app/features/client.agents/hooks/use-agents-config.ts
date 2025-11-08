import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listDataSourcesApiV1ConfigDataSourcesGetOptions,
  listLlmProvidersApiV1ConfigLlmProvidersGetOptions,
} from "@openapi/@tanstack/react-query.gen";

export function useAgentsConfig() {
  const llmProvidersQuery = useQuery(
    listLlmProvidersApiV1ConfigLlmProvidersGetOptions()
  );
  const dataSourcesQuery = useQuery(
    listDataSourcesApiV1ConfigDataSourcesGetOptions()
  );

  useEffect(() => {
    if (!llmProvidersQuery.data) return;
    console.log("[AgentsConfig] fetched llm providers", {
      count: llmProvidersQuery.data.length,
    });
  }, [llmProvidersQuery.data]);

  useEffect(() => {
    if (!dataSourcesQuery.data) return;
    console.log("[AgentsConfig] fetched data sources", {
      count: dataSourcesQuery.data.length,
    });
  }, [dataSourcesQuery.data]);

  useEffect(() => {
    if (llmProvidersQuery.error) {
      console.error(
        "[AgentsConfig] failed to fetch llm providers",
        llmProvidersQuery.error
      );
    }
  }, [llmProvidersQuery.error]);

  useEffect(() => {
    if (dataSourcesQuery.error) {
      console.error(
        "[AgentsConfig] failed to fetch data sources",
        dataSourcesQuery.error
      );
    }
  }, [dataSourcesQuery.error]);

  const llmProviderOptions = useMemo(
    () =>
      (llmProvidersQuery.data ?? []).map((provider) => ({
        value: provider.id,
        label: `${provider.vendor} ${provider.model}`,
      })),
    [llmProvidersQuery.data]
  );

  const dataSourceOptions = useMemo(
    () =>
      (dataSourcesQuery.data ?? []).map((source) => ({
        value: source.id,
        label: source.name,
      })),
    [dataSourcesQuery.data]
  );

  return {
    llmProviderOptions,
    dataSourceOptions,
    llmProvidersQuery,
    dataSourcesQuery,
  };
}
