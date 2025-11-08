import { useEffect, useMemo, useState, type FC } from "react";
import FilterSelect from "./filterSelect";
import MagicBento, { type BentoCardProps } from "./magicBento";
import { cn } from "~/lib/utils";
import { useAgentsList } from "../hooks/use-agents-list";
import { useAgentsConfig } from "../hooks/use-agents-config";
import { PricingModel, type AgentSummary } from "@openapi/types.gen";
import { useNavigate } from "react-router";

const AGENTS_PAGE_SIZE = 12;

type SelectOption = {
  value: string;
  label: string;
};

const buildLabelMap = (options: SelectOption[]) =>
  options.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

const formatCreatorHandle = (wallet?: string | null) => {
  if (!wallet) return "@anonymous";
  const normalized = wallet.trim();
  if (normalized.length <= 8) return `@${normalized}`;
  return `@${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
};

const deriveIconText = (name: string) => {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "AG";
  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");
};

const friendlyPricingModel = (pricingModel?: AgentSummary["pricing_model"]) => {
  switch (pricingModel) {
    case PricingModel.USAGE:
      return "Usage";
    case PricingModel.FIXED:
      return "Fixed";
    case PricingModel.FREE:
      return "Free";
    default:
      return undefined;
  }
};

const getPriceUnit = (
  pricingModel?: AgentSummary["pricing_model"]
): string | undefined => {
  switch (pricingModel) {
    case PricingModel.USAGE:
      return "usage";
    case PricingModel.FIXED:
      return "run";
    default:
      return undefined;
  }
};

const formatPriceValue = (agent: AgentSummary) => {
  const { price_amount, currency, pricing_model } = agent;
  if (
    pricing_model === PricingModel.FREE ||
    !price_amount ||
    Number(price_amount) === 0
  ) {
    return "Free";
  }

  const parsed = Number(price_amount);
  const isNumeric = Number.isFinite(parsed);
  const currencyLabel = currency?.toUpperCase();

  if (isNumeric && currencyLabel === "USD") {
    return `$${parsed.toFixed(2)}`;
  }

  if (isNumeric && currencyLabel) {
    return `${parsed.toFixed(2)} ${currencyLabel}`;
  }

  if (isNumeric) {
    return parsed.toFixed(2);
  }

  return price_amount;
};

const generateColorPalette = (seed: string) => {
  const normalizedSeed = seed || "agent";
  let hash = 0;

  for (let i = 0; i < normalizedSeed.length; i++) {
    hash = normalizedSeed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return {
    networkColor: `hsl(${hue}, 70%, 55%)`,
    iconBackground: `hsla(${hue}, 85%, 65%, 0.18)`,
    iconColor: `hsl(${hue}, 85%, 75%)`,
  };
};

const buildTagsList = (candidates: Array<string | undefined | null>) => {
  const seen = new Set<string>();

  return candidates.reduce<string[]>((acc, value) => {
    if (!value) return acc;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return acc;
    seen.add(trimmed);
    acc.push(trimmed);
    return acc;
  }, []);
};

const createCardFromAgent = (
  agent: AgentSummary,
  dataSourceLabelMap: Record<string, string>,
  llmProviderLabelMap: Record<string, string>
): BentoCardProps => {
  const dataSourceLabel =
    agent.data_source_id && dataSourceLabelMap[agent.data_source_id];
  const llmProviderLabel =
    agent.llm_provider_id && llmProviderLabelMap[agent.llm_provider_id];

  const palette = generateColorPalette(agent.id);
  const priceValue = formatPriceValue(agent);
  const priceUnit = getPriceUnit(agent.pricing_model);
  const price =
    priceUnit && priceValue !== "Free"
      ? `${priceValue}/${priceUnit}`
      : priceValue;
  const priceSuffixSource = llmProviderLabel ?? dataSourceLabel;
  const priceSuffix = priceSuffixSource ? `via ${priceSuffixSource}` : "";
  const tags = buildTagsList([
    dataSourceLabel,
    llmProviderLabel,
    friendlyPricingModel(agent.pricing_model),
    agent.currency?.toUpperCase(),
  ]);

  return {
    id: agent.id,
    title: agent.name,
    creatorHandle: formatCreatorHandle(agent.owner_wallet),
    network: dataSourceLabel ?? llmProviderLabel ?? "Custom",
    networkColor: palette.networkColor,
    price,
    priceSuffix,
    tags: tags.length ? tags : ["Agent"],
    iconText: deriveIconText(agent.name),
    iconBackground: palette.iconBackground,
    iconColor: palette.iconColor,
  };
};

const Agents: FC = () => {
  const navigate = useNavigate();
  const [selectAll, setSelectAll] = useState(true);
  const [selectedDataSource, setSelectedDataSource] = useState<string>();
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>();
  const [pagination, setPagination] = useState({
    limit: AGENTS_PAGE_SIZE,
    offset: 0,
  });
  const {
    dataSourceOptions,
    llmProviderOptions,
    dataSourcesQuery,
    llmProvidersQuery,
  } = useAgentsConfig();

  const agentsQuery = useAgentsList({
    filters: {
      search: selectedDataSource,
      llmProviderId: selectedLlmProvider,
    },
    pagination,
  });

  useEffect(() => {
    setPagination((prev) =>
      prev.offset === 0 ? prev : { ...prev, offset: 0 }
    );
  }, [selectedLlmProvider, selectedDataSource]);

  const dataSourceLabelMap = useMemo(
    () => buildLabelMap(dataSourceOptions),
    [dataSourceOptions]
  );
  const llmProviderLabelMap = useMemo(
    () => buildLabelMap(llmProviderOptions),
    [llmProviderOptions]
  );

  const agentCards = useMemo(() => {
    const items = agentsQuery.data?.items ?? [];
    return items.map((agent) =>
      createCardFromAgent(agent, dataSourceLabelMap, llmProviderLabelMap)
    );
  }, [agentsQuery.data, dataSourceLabelMap, llmProviderLabelMap]);

  const isAgentsLoading = agentsQuery.isFetching;

  return (
    <>
      <div className="flex items-center flex-wrap px-6 md:px-10">
        <div className="flex items-center gap-4 flex-wrap w-full">
          <div
            className={cn(
              selectAll
                ? "text-hubble-primary border-hubble-primary bg-black"
                : "text-white bg-hubble-background-secondary border-white/5",
              "p-1 px-4 rounded-md cursor-pointer border hover:border-hubble-primary/60 transition-all duration-300"
            )}
            onClick={() => {
              if (selectedLlmProvider || selectedDataSource) {
                setSelectedLlmProvider(undefined);
                setSelectedDataSource(undefined);
                setSelectAll(true);
                return;
              }
              agentsQuery.refetch();
            }}
          >
            All
          </div>
          <FilterSelect
            options={dataSourceOptions}
            value={selectedDataSource}
            onValueChange={(value) => {
              setSelectedDataSource(value);
              const shouldSelectAll = !value && !selectedLlmProvider;
              setSelectAll(shouldSelectAll);
              if (shouldSelectAll) {
                console.log("refetching");
                agentsQuery.refetch();
              }
            }}
            label="Data Source"
            labelClassName="text-xs border-b border-hubble-border pb-2"
            placeholder="Data Source"
            isLoading={dataSourcesQuery.isLoading}
            loadingPlaceholder="Loading data sources..."
          />
          <FilterSelect
            options={llmProviderOptions}
            value={selectedLlmProvider}
            onValueChange={(value) => {
              setSelectedLlmProvider(value);
              const shouldSelectAll = !selectedDataSource && !value;
              setSelectAll(shouldSelectAll);
              if (shouldSelectAll) {
                console.log("refetching");
                agentsQuery.refetch();
              }
            }}
            placeholder="LLM Provider"
            label="LLM Provider"
            labelClassName="text-xs border-b border-hubble-border pb-2"
            isLoading={llmProvidersQuery.isLoading}
            loadingPlaceholder="Loading LLM providers..."
            triggerClassName="w-[160px]"
          />
        </div>
      </div>
      <MagicBento
        spotlightRadius={400}
        enableMagnetism={false}
        enableStars={false}
        enableTilt={false}
        clickEffect={false}
        isLoading={isAgentsLoading}
        cards={agentCards}
        emptyStateMessage="No agents match the current filters."
        onClick={(card) => {
          navigate(`/agent/${card.id}`);
        }}
      />
    </>
  );
};

export default Agents;
