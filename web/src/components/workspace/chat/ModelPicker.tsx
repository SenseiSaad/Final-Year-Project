"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { cn } from "@/lib/cn";
import type { ModelCatalog, ProviderInfo } from "@/lib/workspace-api";

import { ConfirmModal } from "../ui";

export type Choice = { provider: string; model: string };

function CompactSelect({ label, className, children, ...props }: ComponentProps<"select"> & { label: string }) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={props.id} className="sr-only">
        {label}
      </label>
      <select
        {...props}
        className="h-8 w-full appearance-none truncate rounded-[10px] border border-line-strong bg-transparent pl-3 pr-8 text-[13px] text-ink transition-colors duration-150 hover:border-ink-3 focus:border-ink focus:outline-none disabled:opacity-60"
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.5} />
    </div>
  );
}

/* Provider and model, with a confirmation before the first switch from local to a cloud provider */
export function ModelPicker({ models, value, onChange }: { models: ModelCatalog; value: Choice; onChange: (choice: Choice) => void }) {
  const [pendingProvider, setPendingProvider] = useState<ProviderInfo | null>(null);
  const current = models.providers.find((p) => p.id === value.provider) ?? models.providers[0];

  function switchProvider(id: string) {
    const target = models.providers.find((p) => p.id === id);
    if (!target || target.id === value.provider) return;
    if (target.external && !current.external) setPendingProvider(target);
    else onChange({ provider: target.id, model: target.default_model });
  }

  const note = !current.available
    ? current.note
    : current.external
      ? `Your question and the passages found in permitted documents are sent to ${current.label}.`
      : "Runs on the workspace server. Nothing is sent to a cloud provider.";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <CompactSelect id="provider-select" label="Model provider" value={value.provider} onChange={(event) => switchProvider(event.target.value)} className="w-[8.5rem]">
          {models.providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
              {provider.available ? "" : " (not available)"}
            </option>
          ))}
        </CompactSelect>
        <CompactSelect
          id="model-select"
          label="Model"
          value={value.model}
          onChange={(event) => onChange({ provider: value.provider, model: event.target.value })}
          disabled={current.models.length === 0}
          className="w-[11rem]"
        >
          {current.models.length === 0 && <option value="">No model configured</option>}
          {current.models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </CompactSelect>
      </div>
      <p className="min-w-0 flex-1 basis-60 text-[12px] leading-[16px] text-ink-3">{note}</p>

      <ConfirmModal
        open={pendingProvider !== null}
        title={`Send questions to ${pendingProvider?.label ?? "an external provider"}?`}
        text={`Each question, and the passages found in documents you may open, will be sent to ${pendingProvider?.label ?? "this provider"}, which runs outside the workspace server. Use synthetic data only in this public demo.`}
        confirmLabel={`Use ${pendingProvider?.label ?? "provider"}`}
        danger={false}
        onClose={() => setPendingProvider(null)}
        onConfirm={() => {
          if (pendingProvider) onChange({ provider: pendingProvider.id, model: pendingProvider.default_model });
          setPendingProvider(null);
        }}
      />
    </div>
  );
}
