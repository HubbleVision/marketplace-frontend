import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import {
  createAgentApiV1AgentsPostMutation,
  deleteAgentApiV1AgentsAgentIdDeleteMutation,
  getPublishJobApiV1AgentsAgentIdPublishJobsJobIdGetOptions,
  getAgentApiV1AgentsAgentIdGetQueryKey,
  listAgentsApiV1AgentsGetQueryKey,
  publishAgentApiV1AgentsAgentIdPublishPostMutation,
  updateAgentApiV1AgentsAgentIdPutMutation,
} from "@openapi/@tanstack/react-query.gen";
import type {
  AgentCreateRequest,
  AgentDetailResponse,
  AgentPublishJobResponse,
  AgentUpdateRequest,
} from "@openapi/types.gen";
import { JobStatus, PricingModel } from "@openapi/types.gen";
import { toastError, toastSuccess } from "~/lib/utils";
import FilterSelect from "./filterSelect";
import { useAgentsConfig } from "../hooks/use-agents-config";
import { useSession } from "~/components/session";

const pricingOptions = [
  {
    value: PricingModel.FREE,
    label: "Free",
    helper: "Open access with zero cost per run",
  },
  {
    value: PricingModel.FIXED,
    label: "Fixed",
    helper: "Charge a fixed fee for every full run",
  },
  {
    value: PricingModel.USAGE,
    label: "Usage",
    helper: "Bill users per token or usage metric",
  },
] as const;

const createAgentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Name must include at least 3 characters")
      .max(160, "Name cannot exceed 160 characters"),
    description: z
      .string()
      .trim()
      .max(800, "Description cannot exceed 800 characters")
      .optional()
      .or(z.literal("")),
    llm_provider_id: z.string().min(1, "Please choose a LLM provider"),
    data_source_id: z.string().min(1, "Please choose a data source"),
    system_prompt: z.string().trim().min(1, "System prompt cannot be empty"),
    user_prompt_template: z
      .string()
      .trim()
      .max(2000, "Prompt template is too long")
      .optional()
      .or(z.literal("")),
    pricing_model: z.nativeEnum(PricingModel),
    price_amount: z.string().trim().optional().or(z.literal("")),
    currency: z
      .string()
      .trim()
      .max(16, "Currency cannot exceed 16 characters")
      .optional()
      .or(z.literal("")),
    requires_user_input: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.pricing_model === PricingModel.FREE) {
      return;
    }

    if (!values.price_amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price_amount"],
        message: "Price is required for paid models",
      });
    } else {
      const parsed = Number(values.price_amount);
      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price_amount"],
          message: "Enter a valid positive amount",
        });
      }
    }

    if (!values.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "Currency is required for paid models",
      });
    }
  });

type CreateAgentFormValues = z.infer<typeof createAgentSchema>;

const inputClassName =
  "w-full rounded-xl border border-hubble-border bg-hubble-background-secondary px-4 py-3 text-sm text-white placeholder:text-hubble-tertiary focus:border-hubble-primary focus:outline-none focus:ring-0";

const textareaClassName = `${inputClassName} min-h-[140px] resize-none`;

type CreateAgentFormProps = {
  agentId?: string;
  initialAgent?: AgentDetailResponse | null;
};

type JobStatusValue = (typeof JobStatus)[keyof typeof JobStatus];

const terminalJobStatuses: JobStatusValue[] = [
  JobStatus.SUCCEEDED,
  JobStatus.FAILED,
];

const activeJobStatuses: JobStatusValue[] = [
  JobStatus.PENDING,
  JobStatus.RUNNING,
];

const isTerminalStatus = (
  status?: JobStatusValue | null
): status is JobStatusValue => {
  if (!status) return false;
  return terminalJobStatuses.includes(status);
};

const isActiveStatus = (
  status?: JobStatusValue | null
): status is JobStatusValue => {
  if (!status) return false;
  return activeJobStatuses.includes(status);
};

const mapAgentToFormValues = (
  agent: AgentDetailResponse
): CreateAgentFormValues => ({
  name: agent.name ?? "",
  description: agent.description ?? "",
  llm_provider_id: agent.llm_provider_id ?? "",
  data_source_id: agent.data_source_id ?? "",
  system_prompt: agent.system_prompt ?? "",
  user_prompt_template: agent.user_prompt_template ?? "",
  pricing_model: agent.pricing_model ?? PricingModel.FREE,
  price_amount: agent.price_amount ?? "",
  currency: agent.currency ?? "",
  requires_user_input:
    typeof agent.requires_user_input === "boolean"
      ? agent.requires_user_input
      : true,
});

export default function CreateAgentForm({
  agentId,
  initialAgent,
}: CreateAgentFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userProfile } = useSession();
  const [activePublishJobId, setActivePublishJobId] = useState<string | null>(
    null
  );
  const [latestPublishJob, setLatestPublishJob] =
    useState<AgentPublishJobResponse | null>(null);
  const {
    dataSourceOptions,
    llmProviderOptions,
    dataSourcesQuery,
    llmProvidersQuery,
  } = useAgentsConfig();

  const form = useForm<CreateAgentFormValues>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      description: "",
      llm_provider_id: "",
      data_source_id: "",
      system_prompt: "",
      user_prompt_template: "",
      pricing_model: PricingModel.FREE,
      price_amount: "",
      currency: "USD",
      requires_user_input: true,
    },
  });

  useEffect(() => {
    if (!initialAgent) return;
    form.reset(mapAgentToFormValues(initialAgent));
  }, [initialAgent, form]);

  useEffect(() => {
    setActivePublishJobId(null);
    setLatestPublishJob(null);
  }, [agentId]);

  const pricingModel = form.watch("pricing_model");
  const requiresPaymentFields = pricingModel !== PricingModel.FREE;
  const isEditing = Boolean(agentId);

  // Check if current user is the owner of the agent
  const isOwner = useMemo(() => {
    if (!isEditing) return true;
    if (!initialAgent || !userProfile) {
      return false; // For new agents or when not logged in, allow all actions
    }
    return (
      initialAgent.owner_wallet.toLowerCase() ===
      userProfile.wallet_address.toLowerCase()
    );
  }, [isEditing, initialAgent, userProfile]);

  const listAgentsQueryKey = listAgentsApiV1AgentsGetQueryKey(undefined);
  const agentDetailQueryKey = agentId
    ? getAgentApiV1AgentsAgentIdGetQueryKey({
        path: { agent_id: agentId },
      })
    : undefined;

  const { mutate: createAgent, isPending: isCreating } = useMutation({
    ...createAgentApiV1AgentsPostMutation(),
    onSuccess: () => {
      toastSuccess("Agent draft created");
      queryClient.invalidateQueries({
        queryKey: listAgentsQueryKey,
      });
      navigate("/");
    },
    onError: (error) => {
      const maybeRecord = error as Record<string, unknown>;
      const detail =
        typeof maybeRecord?.message === "string"
          ? maybeRecord.message
          : typeof maybeRecord?.detail === "string"
            ? maybeRecord.detail
            : undefined;
      toastError(detail ?? "Failed to create agent");
    },
  });

  const { mutate: updateAgent, isPending: isUpdating } = useMutation({
    ...updateAgentApiV1AgentsAgentIdPutMutation(),
    onSuccess: (response) => {
      toastSuccess("Agent updated");
      queryClient.invalidateQueries({
        queryKey: listAgentsQueryKey,
      });
      if (agentDetailQueryKey) {
        queryClient.invalidateQueries({
          queryKey: agentDetailQueryKey,
        });
      }
      form.reset(mapAgentToFormValues(response));
    },
    onError: (error) => {
      const maybeRecord = error as Record<string, unknown>;
      const detail =
        typeof maybeRecord?.message === "string"
          ? maybeRecord.message
          : typeof maybeRecord?.detail === "string"
            ? maybeRecord.detail
            : undefined;
      toastError(detail ?? "Failed to update agent");
    },
  });

  const { mutate: deleteAgent, isPending: isDeleting } = useMutation({
    ...deleteAgentApiV1AgentsAgentIdDeleteMutation(),
    onSuccess: () => {
      toastSuccess("Agent deleted");
      queryClient.invalidateQueries({
        queryKey: listAgentsQueryKey,
      });
      navigate("/");
    },
    onError: (error) => {
      const maybeRecord = error as Record<string, unknown>;
      const detail =
        typeof maybeRecord?.message === "string"
          ? maybeRecord.message
          : typeof maybeRecord?.detail === "string"
            ? maybeRecord.detail
            : undefined;
      toastError(detail ?? "Failed to delete agent");
    },
  });

  const publishStatusColors = useMemo<Record<JobStatusValue, string>>(
    () => ({
      [JobStatus.PENDING]: "text-yellow-400",
      [JobStatus.RUNNING]: "text-sky-300",
      [JobStatus.SUCCEEDED]: "text-emerald-300",
      [JobStatus.FAILED]: "text-red-400",
    }),
    []
  );

  const { mutate: publishAgent, isPending: isPublishing } = useMutation({
    ...publishAgentApiV1AgentsAgentIdPublishPostMutation(),
    onSuccess: (response) => {
      toastSuccess("Publish job started");
      setActivePublishJobId(response.id);
      setLatestPublishJob(response);
    },
    onError: (error) => {
      const maybeRecord = error as Record<string, unknown>;
      const detail =
        typeof maybeRecord?.message === "string"
          ? maybeRecord.message
          : typeof maybeRecord?.detail === "string"
            ? maybeRecord.detail
            : undefined;
      toastError(detail ?? "Failed to start publish job");
    },
  });

  const publishJobQuery = useQuery({
    ...getPublishJobApiV1AgentsAgentIdPublishJobsJobIdGetOptions({
      path: {
        agent_id: agentId ?? "",
        job_id: activePublishJobId ?? "",
      },
    }),
    enabled: Boolean(agentId && activePublishJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 4000;
      return isTerminalStatus(status) ? false : 4000;
    },
  });

  useEffect(() => {
    if (!publishJobQuery.data) {
      return;
    }
    setLatestPublishJob(publishJobQuery.data);
    if (isTerminalStatus(publishJobQuery.data.status)) {
      setActivePublishJobId(null);
    }
  }, [publishJobQuery.data]);

  const publishJobData = publishJobQuery.data ?? latestPublishJob;
  const publishJobStatus = publishJobData?.status;
  const isPublishJobActive = isActiveStatus(publishJobStatus);

  const isSaving = isEditing ? isUpdating : isCreating;

  const publishDisabled =
    !agentId ||
    form.formState.isDirty ||
    isSaving ||
    isDeleting ||
    isPublishing ||
    isPublishJobActive;

  const handlePublish = () => {
    if (!agentId || publishDisabled) return;
    publishAgent({
      path: { agent_id: agentId },
      body: {},
    });
  };

  const primaryActionLabel = isEditing ? "Save Changes" : "Save Agent Draft";

  const onSubmit = (values: CreateAgentFormValues) => {
    const payload: AgentCreateRequest = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      llm_provider_id: values.llm_provider_id,
      data_source_id: values.data_source_id,
      system_prompt: values.system_prompt.trim(),
      user_prompt_template: values.user_prompt_template?.trim() || undefined,
      pricing_model: values.pricing_model,
      requires_user_input: values.requires_user_input,
    };

    if (values.pricing_model !== PricingModel.FREE) {
      const parsedAmount = Number(values.price_amount);
      payload.price_amount = Number.isFinite(parsedAmount)
        ? parsedAmount
        : values.price_amount;
      payload.currency = values.currency?.toUpperCase();
    }

    if (isEditing && agentId) {
      const updatePayload: AgentUpdateRequest = {
        name: payload.name,
        description: payload.description ?? null,
        llm_provider_id: payload.llm_provider_id,
        data_source_id: payload.data_source_id,
        system_prompt: payload.system_prompt,
        user_prompt_template: payload.user_prompt_template ?? null,
        pricing_model: payload.pricing_model,
        price_amount:
          payload.pricing_model === PricingModel.FREE
            ? null
            : (payload.price_amount ?? null),
        currency:
          payload.pricing_model === PricingModel.FREE
            ? null
            : (payload.currency ?? null),
        requires_user_input: payload.requires_user_input,
      };

      updateAgent({
        path: { agent_id: agentId },
        body: updatePayload,
      });

      return;
    }

    createAgent({
      body: payload,
    });
  };

  const errors = form.formState.errors;

  const handleDelete = () => {
    if (!agentId) return;
    const confirmed = window.confirm(
      "This will permanently remove the agent. Continue?"
    );
    if (!confirmed) return;
    deleteAgent({
      path: { agent_id: agentId },
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <section className="space-y-4">
        <div>
          <span className="text-red-700 mr-1">*</span>
          <label className="text-sm text-hubble-tertiary">Agent Name</label>
          <input
            type="text"
            placeholder="Give your agent an expressive name"
            className={inputClassName}
            readOnly={!isOwner}
            {...form.register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-[#FF4343]">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm text-hubble-tertiary">Description </label>
          <textarea
            placeholder="Explain what your agent solves and how it helps others"
            className={textareaClassName}
            readOnly={!isOwner}
            {...form.register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-[#FF4343]">
              {errors.description.message}
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 lg:flex-row flex-wrap">
        <div className="flex-1">
          <div className="flex items-center text-sm w-full">
            <span className="text-red-700 mr-1">*</span>
            <span className="text-hubble-tertiary">Data Source</span>
          </div>
          <FilterSelect
            options={dataSourceOptions}
            value={form.watch("data_source_id") || undefined}
            onValueChange={(value) =>
              form.setValue("data_source_id", value ?? "", {
                shouldValidate: true,
              })
            }
            placeholder="Select data source"
            label={undefined}
            isLoading={dataSourcesQuery.isLoading}
            loadingPlaceholder="Fetching sources..."
            emptyStateLabel="No sources available"
            className="w-full"
            triggerClassName="w-full"
            contentClassName="w-full"
            disabled={!isOwner}
          />
          {errors.data_source_id && (
            <p className="mt-1 text-xs text-[#FF4343]">
              {errors.data_source_id.message}
            </p>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center text-sm w-full">
            <span className="text-red-700 mr-1">*</span>
            <span className="text-hubble-tertiary">LLM Provider</span>
          </div>
          <FilterSelect
            options={llmProviderOptions}
            value={form.watch("llm_provider_id") || undefined}
            onValueChange={(value) =>
              form.setValue("llm_provider_id", value ?? "", {
                shouldValidate: true,
              })
            }
            placeholder="Select provider"
            label={undefined}
            isLoading={llmProvidersQuery.isLoading}
            loadingPlaceholder="Fetching providers..."
            emptyStateLabel="No providers available"
            className="w-full"
            triggerClassName="w-full"
            contentClassName="w-full"
            disabled={!isOwner}
          />
          {errors.llm_provider_id && (
            <p className="mt-1 text-xs text-[#FF4343]">
              {errors.llm_provider_id.message}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="flex items-center text-sm">
            <span className="text-red-700 mr-1">*</span>
            <span className="text-hubble-tertiary">System Prompt</span>
          </div>
          <textarea
            placeholder="Describe the core behavior and constraints of the agent"
            className={textareaClassName}
            readOnly={!isOwner}
            {...form.register("system_prompt")}
          />
          {errors.system_prompt && (
            <p className="mt-1 text-xs text-[#FF4343]">
              {errors.system_prompt.message}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-hubble-tertiary">User Prompt Template</span>
          </div>
          <textarea
            placeholder="Define how user input should be wrapped before it reaches the agent"
            className={textareaClassName}
            readOnly={!isOwner}
            {...form.register("user_prompt_template")}
          />
          {errors.user_prompt_template && (
            <p className="mt-1 text-xs text-[#FF4343]">
              {errors.user_prompt_template.message}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <span className="text-red-700 mr-1">*</span>
          <span className="text-sm text-hubble-tertiary">Pricing Model</span>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {pricingOptions.map((option) => {
              const isActive = pricingModel === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex ${isOwner ? "cursor-pointer" : "cursor-not-allowed"} flex-col rounded-xl border p-4 transition-all ${
                    isActive
                      ? "border-hubble-primary bg-hubble-background-secondary"
                      : "border-hubble-border bg-transparent hover:border-hubble-primary/40"
                  } ${!isOwner ? "opacity-60" : ""}`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="hidden"
                    disabled={!isOwner}
                    {...form.register("pricing_model")}
                  />
                  <span className="text-base font-semibold text-white">
                    {option.label}
                  </span>
                  <span className="mt-1 text-xs text-hubble-secondary">
                    {option.helper}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.pricing_model && (
            <p className="mt-1 text-xs text-[#FF4343]">
              {errors.pricing_model.message}
            </p>
          )}
        </div>

        {requiresPaymentFields && (
          <div className="grid gap-6 md:grid-cols-[1fr_180px]">
            <div>
              <span className="text-red-700 mr-1">*</span>
              <span className="text-sm text-hubble-tertiary">Price Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className={inputClassName}
                readOnly={!isOwner}
                {...form.register("price_amount")}
              />
              {errors.price_amount && (
                <p className="mt-1 text-xs text-[#FF4343]">
                  {errors.price_amount.message}
                </p>
              )}
            </div>
            <div>
              <span className="text-red-700 mr-1">*</span>
              <span className="text-sm text-hubble-tertiary">Currency</span>
              <input
                type="text"
                placeholder="USD"
                className={inputClassName}
                readOnly={!isOwner}
                {...form.register("currency")}
              />
              {errors.currency && (
                <p className="mt-1 text-xs text-[#FF4343]">
                  {errors.currency.message}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-hubble-border/70 bg-hubble-background-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Requires user input</p>
          <p className="text-xs text-hubble-secondary">
            Toggle off for fully autonomous agents
          </p>
        </div>
        <label
          className={`relative inline-flex ${isOwner ? "cursor-pointer" : "cursor-not-allowed"} items-center`}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            disabled={!isOwner}
            {...form.register("requires_user_input")}
          />
          <div
            className={`h-6 w-11 rounded-full border border-hubble-border bg-hubble-background transition peer-checked:border-hubble-primary peer-checked:bg-hubble-primary/60 ${!isOwner ? "opacity-60" : ""}`}
          />
          <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-black" />
        </label>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {isEditing && isOwner && (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-red-500 px-4 py-3 text-sm font-semibold text-red-200 transition disabled:opacity-60 hover:bg-red-500 hover:text-white cursor-pointer"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </button>
        )}
        {isEditing && isOwner && (
          <button
            type="button"
            onClick={handlePublish}
            className="inline-flex items-center justify-center rounded-xl border border-hubble-border px-6 py-3 text-sm font-semibold text-white transition hover:border-hubble-primary hover:text-hubble-primary disabled:border-hubble-border/60 disabled:text-hubble-tertiary cursor-pointer"
            disabled={publishDisabled}
          >
            {(isPublishing || publishJobQuery.isFetching) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Publish
          </button>
        )}
        {isOwner && (
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-hubble-primary px-6 py-3 text-sm font-semibold text-black transition hover:bg-hubble-primary/80 disabled:opacity-60 cursor-pointer"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {primaryActionLabel}
          </button>
        )}
      </div>
      {isEditing && isOwner && (
        <section className="rounded-xl border border-hubble-border/70 bg-hubble-background-secondary/60 p-4 text-sm text-hubble-secondary">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-hubble-tertiary">
                Publish status
              </p>
              <p className="text-base font-semibold text-white">
                {publishJobStatus ? (
                  <span className={publishStatusColors[publishJobStatus]}>
                    {publishJobStatus}
                  </span>
                ) : (
                  "Not started"
                )}
              </p>
            </div>
            <div className="text-xs text-hubble-tertiary">
              {form.formState.isDirty
                ? "Save your latest edits to unlock publishing."
                : isPublishJobActive
                  ? "Publishing in progress..."
                  : "Start a publish job to take your agent live."}
            </div>
          </div>
          {publishJobData?.onchain_agent_id && (
            <p className="mt-3 text-xs text-white">
              On-chain Agent ID: {publishJobData.onchain_agent_id}
            </p>
          )}
          {publishJobData?.tx_hashes?.length ? (
            <div className="mt-3 space-y-1 text-xs">
              <p className="text-hubble-tertiary">Transactions</p>
              <div className="flex flex-wrap gap-2">
                {publishJobData.tx_hashes.map((hash) => (
                  <span
                    key={hash}
                    className="rounded-lg bg-hubble-background px-2 py-1 font-mono text-[11px] text-white"
                  >
                    {hash}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {publishJobData?.error_reason && (
            <p className="mt-3 text-xs text-red-400">
              Failed reason: {publishJobData.error_reason}
            </p>
          )}
        </section>
      )}
    </form>
  );
}
