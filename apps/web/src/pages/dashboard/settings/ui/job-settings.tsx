"use client";

import { useStore } from "@tanstack/react-form";
import { BriefcaseIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Form } from "@tsu-stack/ui/components/form";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { StatusBadge, type StatusState } from "@tsu-stack/ui/components/status-badge";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  JobPreferenceFields,
  JobPreferenceFormSchema,
  jobPreferenceFormFromQuery,
  jobPreferenceInputFromForm,
  useGetJobPreferenceQuery,
  useUpsertJobPreferenceMutation,
  type JobPreferenceQueryResult
} from "@/features/job-preference";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsFrame } from "./settings-frame";
import { SettingsSaveBar } from "./settings-save-bar";

const FORM_STATUS_LABELS = {
  success: "Saved",
  warning: "Changes unsaved",
  pending: "Submitted",
  failed: "Failed"
} as const;

/**
 * Shell: load / error / ready. Form hooks live only in the ready branch so React
 * Compiler never sees conditional hook counts across error/loading returns.
 */
export function JobSettings() {
  const query = useGetJobPreferenceQuery();

  if (query.isError) {
    return (
      <SettingsFrame
        title="Jobs"
        icon={<BriefcaseIcon className="size-4 opacity-80" aria-hidden />}
        description="Could not load job preferences."
      >
        <Alert variant="error">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
      </SettingsFrame>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <SettingsFrame
        title="Jobs"
        icon={<BriefcaseIcon className="size-4 opacity-80" aria-hidden />}
        description="Used to filter jobs from email alerts"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading…
        </div>
      </SettingsFrame>
    );
  }

  return <JobSettingsForm data={query.data} />;
}

function JobSettingsForm({ data }: { data: JobPreferenceQueryResult }) {
  const upsert = useUpsertJobPreferenceMutation();
  const serverValues = useMemo(() => jobPreferenceFormFromQuery(data), [data]);
  const [flashSubmitted, setFlashSubmitted] = useState(false);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: createZodFormValidator(JobPreferenceFormSchema)
    },
    onSubmit: async ({ value }) => {
      setFailedKey(null);
      try {
        const saved = await upsert.mutateAsync(jobPreferenceInputFromForm(value));
        form.reset(jobPreferenceFormFromQuery(saved));
        setFlashSubmitted(true);
        toast.success("Job preferences saved");
      } catch {
        setFailedKey(JSON.stringify(value));
        toast.error("Could not save job preferences");
      }
    }
  });

  useEffect(() => {
    if (form.store.state.isDirty) return;
    form.reset(serverValues);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- form API is stable; re-sync only when server values change
  }, [serverValues]);

  useEffect(() => {
    if (!flashSubmitted) return;
    const timer = window.setTimeout(() => setFlashSubmitted(false), 1000);
    return () => window.clearTimeout(timer);
  }, [flashSubmitted]);

  const discard = useCallback(() => {
    setFailedKey(null);
    setFlashSubmitted(false);
    form.reset(serverValues);
  }, [form, serverValues]);

  const isDirty = useStore(form.store, (state) => state.isDirty);
  const values = useStore(form.store, (state) => state.values);
  const leaveGuard = useSettingsDirtyGuard(isDirty, { onDiscard: discard });
  const saveFailed = failedKey === JSON.stringify(values);

  const formStatus: StatusState = upsert.isPending
    ? "pending"
    : flashSubmitted
      ? "pending"
      : saveFailed
        ? "failed"
        : isDirty
          ? "warning"
          : "success";

  return (
    <>
      <SettingsFrame
        title="Jobs"
        icon={<BriefcaseIcon className="size-4 opacity-80" aria-hidden />}
        description="Used to filter jobs from email alerts"
        actions={
          <>
            {!isDirty && !upsert.isPending && !saveFailed && !flashSubmitted ? (
              <StatusBadge state={formStatus} labels={FORM_STATUS_LABELS} />
            ) : null}
            <SettingsSaveBar
              dirty={isDirty}
              saving={upsert.isPending}
              statusKey={values}
              onSave={() => void form.handleSubmit()}
              onDiscard={discard}
              saveLabel="Save"
            />
          </>
        }
      >
        <Form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <JobPreferenceFields
            form={form}
            emptyHint="Used to filter jobs from email alerts. Add work modes, locations, or keywords so mail harvest can match roles you care about."
          />
        </Form>
      </SettingsFrame>
      {leaveGuard.alertDialog}
    </>
  );
}
