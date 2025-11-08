import { ExternalLink, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ConnectWallet } from "~/components/connect-wallet";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AgentDetailResponse,
  AgentRunEventResponse,
} from "@openapi/types.gen";
import {
  AgentRunEventType,
  AgentRunStatus,
  PricingModel,
} from "@openapi/types.gen";
import {
  createAgentRunApiV1AgentsAgentIdRunsPostMutation,
  getAgentRunApiV1AgentsAgentIdRunsRunIdGetOptions,
} from "@openapi/@tanstack/react-query.gen";
import { useAgentsConfig } from "../hooks/use-agents-config";
import { useX402PaymentHeader } from "../hooks/use-x402-payment-header";
import { cn, toastError } from "~/lib/utils";

type LogEntry = {
  id: string;
  timestamp: string;
  content: ReactNode;
  tone: "info" | "success" | "error" | "warning";
};

type PreviewProps = {
  agent?: AgentDetailResponse | null;
  isLoading?: boolean;
};

const TERMINAL_RUN_STATUSES: Set<AgentRunStatus> = new Set([
  AgentRunStatus.SUCCEEDED,
  AgentRunStatus.FAILED,
  AgentRunStatus.CANCELLED,
]);

const RUN_PROGRESS_BY_STATUS: Record<AgentRunStatus, number> = {
  [AgentRunStatus.PENDING]: 15,
  [AgentRunStatus.PAYING]: 30,
  [AgentRunStatus.RUNNING]: 70,
  [AgentRunStatus.SUCCEEDED]: 100,
  [AgentRunStatus.FAILED]: 100,
  [AgentRunStatus.CANCELLED]: 100,
};

const friendlyPricingModel = (pricingModel?: PricingModel) => {
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

const deriveIconText = (name?: string) => {
  if (!name) return "AG";
  const tokens = name.split(/\s+/).filter(Boolean);
  if (!tokens.length) return "AG";
  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");
};

const formatCreatorHandle = (wallet?: string | null) => {
  if (!wallet) return "@anonymous";
  const trimmed = wallet.trim();
  if (trimmed.length <= 8) return `@${trimmed}`;
  return `@${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
};

const formatPriceValue = (agent?: AgentDetailResponse | null) => {
  if (!agent) return "Free";
  const { pricing_model, price_amount, currency } = agent;
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
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    iconBackground: `hsla(${hue}, 85%, 65%, 0.18)`,
    iconColor: `hsl(${hue}, 85%, 75%)`,
  };
};

const buildTagsList = (values: Array<string | undefined>) => {
  const seen = new Set<string>();
  return values.reduce<string[]>((acc, value) => {
    if (!value) return acc;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return acc;
    seen.add(trimmed);
    acc.push(trimmed);
    return acc;
  }, []);
};

const logToneStyles: Record<LogEntry["tone"], string> = {
  info: "text-white",
  success: "text-emerald-300",
  error: "text-red-300",
  warning: "text-yellow-300",
};

const eventToneMap: Partial<Record<AgentRunEventType, LogEntry["tone"]>> = {
  [AgentRunEventType.ERROR]: "error",
  [AgentRunEventType.PAYMENT_REQUIRED]: "warning",
  [AgentRunEventType.PAYMENT_CONFIRMED]: "success",
  [AgentRunEventType.INFERENCE_COMPLETE]: "success",
};

const eventLabelMap: Record<AgentRunEventType, string> = {
  [AgentRunEventType.QUEUED]: "Queued run",
  [AgentRunEventType.PAYMENT_REQUIRED]: "Payment required",
  [AgentRunEventType.PAYMENT_CONFIRMED]: "Payment confirmed",
  [AgentRunEventType.DATASOURCE_FETCH]: "Fetched datasource",
  [AgentRunEventType.INFERENCE_COMPLETE]: "Inference complete",
  [AgentRunEventType.ERROR]: "Execution error",
};

const statusToneMap: Partial<Record<AgentRunStatus, LogEntry["tone"]>> = {
  [AgentRunStatus.SUCCEEDED]: "success",
  [AgentRunStatus.FAILED]: "error",
  [AgentRunStatus.CANCELLED]: "warning",
};

const formatTimestamp = (value?: string | Date | null) => {
  const date =
    typeof value === "string" ? new Date(value) : (value ?? new Date());
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const renderPayload = (payload?: AgentRunEventResponse["payload"]) => {
  if (!payload) return null;
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return (
      <p className="mt-2 text-xs text-hubble-tertiary">{payload.message}</p>
    );
  }

  try {
    const json = JSON.stringify(payload, null, 2);
    return (
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-hubble-tertiary">
        {json}
      </pre>
    );
  } catch {
    return (
      <p className="mt-2 text-xs text-hubble-tertiary">
        {String(payload ?? "")}
      </p>
    );
  }
};

const Preview = ({ agent, isLoading = false }: PreviewProps) => {
  const { dataSourceOptions, llmProviderOptions } = useAgentsConfig();
  const [userInput, setUserInput] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);
  const [inputSnapshot, setInputSnapshot] = useState("");
  const logViewportRef = useRef<HTMLDivElement>(null);

  const requiresUserInput = agent?.requires_user_input ?? false;

  // x402 payment header handling
  const x402PaymentHeader = useX402PaymentHeader({
    onHeaderGenerated: (header) => {
      console.log("Payment header generated:", header.slice(0, 100) + "...");
      // The handleRun function will handle retry after header generation
    },
    onError: (error) => {
      toastError(error.message);
    },
  });

  const dataSourceLabel = useMemo(
    () =>
      agent?.data_source_id
        ? dataSourceOptions.find(
            (option) => option.value === agent.data_source_id
          )?.label
        : undefined,
    [agent?.data_source_id, dataSourceOptions]
  );

  const llmProviderLabel = useMemo(
    () =>
      agent?.llm_provider_id
        ? llmProviderOptions.find(
            (option) => option.value === agent.llm_provider_id
          )?.label
        : undefined,
    [agent?.llm_provider_id, llmProviderOptions]
  );

  const tags = useMemo(
    () =>
      buildTagsList([
        dataSourceLabel,
        llmProviderLabel,
        friendlyPricingModel(agent?.pricing_model),
        agent?.currency?.toUpperCase(),
      ]),
    [agent?.currency, agent?.pricing_model, dataSourceLabel, llmProviderLabel]
  );

  const palette = useMemo(
    () => generateColorPalette(agent?.id ?? agent?.name ?? "agent"),
    [agent?.id, agent?.name]
  );

  useEffect(() => {
    setActiveRunId(null);
    setRunStartedAt(null);
    setInputSnapshot("");
    setUserInput("");
  }, [agent?.id]);

  const createRunMutation = useMutation({
    ...createAgentRunApiV1AgentsAgentIdRunsPostMutation(),
  });

  const runQuery = useQuery({
    ...getAgentRunApiV1AgentsAgentIdRunsRunIdGetOptions({
      path: {
        agent_id: agent?.id ?? "",
        run_id: activeRunId ?? "",
      },
    }),
    enabled: Boolean(agent?.id && activeRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) {
        return Boolean(activeRunId) ? 1500 : false;
      }
      return TERMINAL_RUN_STATUSES.has(status) ? false : 1500;
    },
  });

  useEffect(() => {
    if (!runQuery.error) return;
    toastError("Failed to fetch run progress, please retry.");
  }, [runQuery.error]);

  const isRunProcessing =
    Boolean(activeRunId) &&
    (!runQuery.data ||
      (runQuery.data?.status &&
        !TERMINAL_RUN_STATUSES.has(runQuery.data.status)));
  const isRunning =
    createRunMutation.isPending || isRunProcessing || x402PaymentHeader.isProcessing;
  const runStatus = runQuery.data?.status;
  const progress = isRunning
    ? runStatus
      ? (RUN_PROGRESS_BY_STATUS[runStatus] ?? 10)
      : 10
    : 0;

  const handleRun = useCallback(async () => {
    if (!agent) return;
    const trimmedInput = userInput.trim();
    const now = new Date().toISOString();
    setRunStartedAt(now);
    setInputSnapshot(trimmedInput);

    // Prepare the request body (will be reused for retry)
    const requestBody = {
      input_payload: trimmedInput ? { text: trimmedInput } : undefined,
      client_context: {
        preview: true,
      },
    };

    try {
      console.log("Starting agent run...");
      const response = await createRunMutation.mutateAsync({
        path: { agent_id: agent.id },
        body: requestBody,
      });

      // Check if response requires x402 payment
      console.log("response", response);
      if (
        response &&
        typeof response === "object" &&
        "payment_requirements" in response &&
        "status" in response &&
        response.status === "payment_required"
      ) {
        console.log("Received 402 response, generating X-PAYMENT header...");

        // Generate X-PAYMENT header (not executing on-chain transfer)
        const paymentHeader = await x402PaymentHeader.generatePaymentHeader(response);

        if (paymentHeader) {
          // Header generated successfully, retry the request with X-PAYMENT header
          console.log("Payment header generated, retrying request with X-PAYMENT header...");

          // IMPORTANT: Use the SAME URL and body, but add X-PAYMENT header
          const retryResponse = await createRunMutation.mutateAsync({
            path: { agent_id: agent.id },
            body: requestBody, // Same body as the first request
            headers: {
              "X-PAYMENT": paymentHeader, // Add X-PAYMENT header
            },
          });

          if ("id" in retryResponse && typeof retryResponse.id === "string") {
            setActiveRunId(retryResponse.id);
          } else {
            setActiveRunId(null);
            toastError("Unexpected run response from server after payment.");
          }
        } else {
          // Payment header generation failed or was cancelled
          setRunStartedAt(null);
          setActiveRunId(null);
        }
        return;
      }

      if ("id" in response && typeof response.id === "string") {
        setActiveRunId(response.id);
      } else {
        setActiveRunId(null);
        toastError("Unexpected run response from server.");
      }
    } catch (error) {
      console.log("error caught", error);

      // Check if the error contains an x402 payment response
      const maybeRecord = error as Record<string, unknown>;

      // Check for x402 response in error.response or error.body
      let x402Response = null;
      if (maybeRecord?.response && typeof maybeRecord.response === "object") {
        x402Response = maybeRecord.response;
      } else if (maybeRecord?.body && typeof maybeRecord.body === "object") {
        x402Response = maybeRecord.body;
      } else if (
        maybeRecord?.status === "payment_required" &&
        "payment_requirements" in maybeRecord
      ) {
        x402Response = maybeRecord;
      }

      console.log("x402Response", x402Response);

      // If this is an x402 payment required error, handle it
      if (
        x402Response &&
        typeof x402Response === "object" &&
        "payment_requirements" in x402Response &&
        "status" in x402Response &&
        x402Response.status === "payment_required"
      ) {
        console.log("Detected x402 payment requirement in error");

        // Generate X-PAYMENT header
        const paymentHeader = await x402PaymentHeader.generatePaymentHeader(x402Response);

        if (paymentHeader) {
          // Header generated successfully, retry the request
          console.log("Payment header generated, retrying request with X-PAYMENT header...");

          try {
            // IMPORTANT: Use the SAME URL and body, but add X-PAYMENT header
            const retryResponse = await createRunMutation.mutateAsync({
              path: { agent_id: agent.id },
              body: requestBody, // Same body as the first request
              headers: {
                "X-PAYMENT": paymentHeader, // Add X-PAYMENT header
              },
            });

            if ("id" in retryResponse && typeof retryResponse.id === "string") {
              setActiveRunId(retryResponse.id);
            } else {
              setActiveRunId(null);
              toastError("Unexpected run response from server after payment.");
            }
          } catch (retryError) {
            console.error("Retry after payment failed:", retryError);
            setRunStartedAt(null);
            setActiveRunId(null);
            toastError("Failed to run agent after payment.");
          }
        } else {
          // Payment header generation failed or was cancelled
          setRunStartedAt(null);
          setActiveRunId(null);
        }
        return;
      }

      // Not an x402 error, handle as normal error
      setRunStartedAt(null);
      setActiveRunId(null);
      const detail =
        typeof maybeRecord?.message === "string"
          ? maybeRecord.message
          : typeof maybeRecord?.detail === "string"
            ? maybeRecord.detail
            : "Failed to start run.";
      toastError(detail);
    }
  }, [agent, createRunMutation, userInput, x402PaymentHeader]);

  const summaryCard = useMemo(() => {
    if (isLoading && !agent) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="h-20 w-20 rounded-2xl border border-hubble-border/60 bg-hubble-background-secondary animate-pulse" />
          <div className="h-6 w-40 rounded-xl bg-hubble-border/60 animate-pulse" />
          <div className="h-4 w-56 rounded-xl bg-hubble-border/40 animate-pulse" />
        </div>
      );
    }

    if (!agent) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center text-hubble-secondary">
          <p className="text-base font-medium">Creating a new agent</p>
          <p className="text-sm mt-2">
            Fill in the agent details and save to preview its run state.
          </p>
          <p className="text-xs mt-4 text-hubble-tertiary">
            Once saved, you can test your agent here and see log outputs in
            real-time.
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl border border-hubble-border/70"
          style={{
            background: palette.iconBackground,
            color: palette.iconColor,
          }}
        >
          <span className="text-2xl font-semibold">
            {deriveIconText(agent.name)}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <p className="text-lg font-semibold text-white">{agent.name}</p>
            {agent.registration_tx_hashes_url && (
              <a
                href={agent.registration_tx_hashes_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-hubble-primary hover:text-hubble-primary/80 transition-colors cursor-pointer"
                title="Open registration transactions"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="text-sm text-hubble-secondary">
            {formatCreatorHandle(agent.owner_wallet)} •{" "}
            {formatPriceValue(agent)}
          </p>
        </div>
        {agent.description && (
          <p className="max-w-lg text-sm text-hubble-secondary">
            {agent.description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 text-xs text-hubble-secondary">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-hubble-border px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }, [agent, isLoading, palette.iconBackground, palette.iconColor, tags]);

  const runLogEntries = useMemo<LogEntry[]>(() => {
    if (!activeRunId) return [];
    const entries: LogEntry[] = [];

    if (runStartedAt) {
      entries.push({
        id: `${activeRunId}-start`,
        timestamp: formatTimestamp(runStartedAt),
        tone: "info",
        content: `Started run ${activeRunId}`,
      });
    }

    if (inputSnapshot) {
      entries.push({
        id: `${activeRunId}-input`,
        timestamp: formatTimestamp(runStartedAt),
        tone: "info",
        content: (
          <span>
            User input:{" "}
            <span className="text-hubble-tertiary">{inputSnapshot}</span>
          </span>
        ),
      });
    }

    if (runQuery.data?.events?.length) {
      const sortedEvents = [...runQuery.data.events].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return aTime - bTime;
      });

      sortedEvents.forEach((event) => {
        const timestamp = formatTimestamp(event.created_at);
        const tone =
          eventToneMap[event.event_type] !== undefined
            ? eventToneMap[event.event_type]!
            : "info";
        entries.push({
          id: event.id,
          timestamp,
          tone,
          content: (
            <div>
              <p>{eventLabelMap[event.event_type] ?? event.event_type}</p>
              {renderPayload(event.payload)}
            </div>
          ),
        });
      });
    }

    if (runQuery.data?.status) {
      const tone = statusToneMap[runQuery.data.status] ?? "info";
      entries.push({
        id: `${activeRunId}-status`,
        timestamp: formatTimestamp(
          runQuery.data.finished_at ?? runQuery.data.created_at
        ),
        tone,
        content: (
          <div>
            Run status:{" "}
            <span className="uppercase tracking-wide">
              {runQuery.data.status}
            </span>
            {runQuery.data.error_reason && (
              <p className="mt-1 text-xs text-hubble-tertiary">
                {runQuery.data.error_reason}
              </p>
            )}
          </div>
        ),
      });
    }

    if (
      runQuery.data?.output_payload &&
      Object.keys(runQuery.data.output_payload).length
    ) {
      entries.push({
        id: `${activeRunId}-output`,
        timestamp: formatTimestamp(runQuery.data.finished_at),
        tone: "success",
        content: (
          <div>
            <p>Output payload</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-hubble-tertiary">
              {JSON.stringify(runQuery.data.output_payload, null, 2)}
            </pre>
          </div>
        ),
      });
    }

    return entries;
  }, [activeRunId, inputSnapshot, runQuery.data, runStartedAt]);

  useEffect(() => {
    if (!logViewportRef.current) return;
    logViewportRef.current.scrollTop = logViewportRef.current.scrollHeight;
  }, [runLogEntries.length]);

  const hasLogs = runLogEntries.length > 0;
  const runDisabled =
    !agent ||
    isLoading ||
    isRunning ||
    (requiresUserInput && !userInput.trim());

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 min-h-0">
        <div className="flex h-full flex-col p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-wide text-hubble-tertiary">
            {x402PaymentHeader.isProcessing ? (
              <span className="text-yellow-300">
                {x402PaymentHeader.status === "signing"
                  ? "Signing payment authorization..."
                  : x402PaymentHeader.status === "preparing"
                    ? "Preparing payment..."
                    : "Processing payment..."}
              </span>
            ) : isRunning ? (
              <span className="text-emerald-300">Running...</span>
            ) : null}
          </div>
          <div ref={logViewportRef} className="flex-1 overflow-y-auto">
            {hasLogs ? (
              <div className="space-y-4 pr-1">
                {runLogEntries.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl bg-hubble-background-secondary p-4"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-hubble-tertiary">
                      {log.timestamp}
                    </div>
                    <div className={`mt-2 text-sm ${logToneStyles[log.tone]}`}>
                      {log.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              summaryCard
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-hubble-border bg-hubble-background-secondary/40 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {requiresUserInput && (
            <div className="flex-1">
              <input
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                placeholder="Describe what you want this agent to do..."
                className="w-full rounded-2xl border border-hubble-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-hubble-tertiary focus:border-hubble-primary focus:outline-none"
              />
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-3 sm:justify-end",
              !requiresUserInput ? "w-full" : "min-w-[120px]"
            )}
          >
            <ConnectWallet.Custom>
              {({ account, openConnectModal, mounted }) => {
                const connected = mounted && account;

                return (
                  <>
                    {/* {!connected && (
                      <button
                        type="button"
                        onClick={openConnectModal}
                        className="flex h-12 items-center justify-center rounded-2xl bg-hubble-primary/20 border border-hubble-primary px-6 text-sm font-semibold text-hubble-primary transition hover:bg-hubble-primary/30"
                      >
                        Connect Wallet for Payments
                      </button>
                    )} */}
                    <button
                      type="button"
                      onClick={handleRun}
                      disabled={runDisabled || !connected}
                      className="flex h-12 w-full items-center justify-center rounded-2xl bg-hubble-primary px-6 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {x402PaymentHeader.isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {x402PaymentHeader.status === "signing"
                            ? "Signing Payment..."
                            : x402PaymentHeader.status === "preparing"
                              ? "Preparing Payment..."
                              : "Processing Payment..."}
                        </>
                      ) : isRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running
                        </>
                      ) : (
                        "Run"
                      )}
                    </button>
                  </>
                );
              }}
            </ConnectWallet.Custom>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;
