"use client";

import { useStore } from "@tanstack/react-form";
import { BriefcaseIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DEFAULT_MIN_MATCH_SCORE,
  JobPreferenceFieldsSchema,
  WORK_MODE_LABELS,
  WORK_MODES,
  type WorkMode
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { StatusBadge, type StatusState } from "@tsu-stack/ui/components/status-badge";
import { normalizeTags } from "@tsu-stack/ui/components/tags-input";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  useGetJobPreferenceQuery,
  useUpsertJobPreferenceMutation,
  type JobPreferenceQueryResult
} from "@/features/job-preference";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsFrame } from "./settings-frame";
import { SettingsSaveBar } from "./settings-save-bar";

type FormState = {
  workModes: WorkMode[];
  locations: string[];
  roleKeywords: string[];
  excludeKeywords: string[];
  minMatchScore: number;
};

const JobSettingsFormSchema = JobPreferenceFieldsSchema.pick({
  workModes: true,
  locations: true,
  roleKeywords: true,
  excludeKeywords: true,
  minMatchScore: true
});

const WORK_MODE_OPTIONS = WORK_MODES.map((mode) => {
  return {
    value: mode,
    label: WORK_MODE_LABELS[mode]
  };
});

function formFromQuery(data: JobPreferenceQueryResult): FormState {
  return {
    workModes: data.workModes.filter((m): m is WorkMode =>
      (WORK_MODES as readonly string[]).includes(m)
    ),
    locations: [...data.locations],
    roleKeywords: [...data.roleKeywords],
    excludeKeywords: [...data.excludeKeywords],
    minMatchScore: data.minMatchScore
  };
}

function isEmptyPrefs(form: FormState): boolean {
  return (
    form.workModes.length === 0 &&
    form.locations.length === 0 &&
    form.roleKeywords.length === 0 &&
    form.excludeKeywords.length === 0 &&
    form.minMatchScore === DEFAULT_MIN_MATCH_SCORE
  );
}

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
  const serverValues = useMemo(() => formFromQuery(data), [data]);
  const [flashSubmitted, setFlashSubmitted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: createZodFormValidator(JobSettingsFormSchema)
    },
    onSubmit: async ({ value }) => {
      setSaveFailed(false);
      try {
        const saved = await upsert.mutateAsync({
          workModes: value.workModes,
          locations: normalizeTags(value.locations, 50, 120),
          roleKeywords: normalizeTags(value.roleKeywords, 50, 120),
          excludeKeywords: normalizeTags(value.excludeKeywords, 50, 120),
          minMatchScore: value.minMatchScore
        });
        form.reset(formFromQuery(saved));
        setFlashSubmitted(true);
        toast.success("Job preferences saved");
      } catch {
        setSaveFailed(true);
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
    setSaveFailed(false);
    setFlashSubmitted(false);
    form.reset(serverValues);
  }, [form, serverValues]);

  const isDirty = useStore(form.store, (state) => state.isDirty);
  const values = useStore(form.store, (state) => state.values);
  const leaveGuard = useSettingsDirtyGuard(isDirty, { onDiscard: discard });

  useEffect(() => {
    setSaveFailed(false);
  }, [values]);

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
          <form.Subscribe selector={(s) => s.values}>
            {(values) =>
              isEmptyPrefs(values) ? (
                <p className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
                  Used to filter jobs from email alerts. Add work modes, locations, or keywords so
                  mail harvest can match roles you care about.
                </p>
              ) : null
            }
          </form.Subscribe>

          <FieldGroup className="gap-6">
            <form.AppField name="workModes">
              {(field) => (
                <field.ToggleGroupField
                  label="Work modes"
                  description="Jobs outside selected modes are less likely to match. Leave empty to accept any."
                  options={WORK_MODE_OPTIONS}
                  multiple
                  variant="outline"
                />
              )}
            </form.AppField>

            <form.AppField name="locations">
              {(field) => (
                <field.TagsField
                  label="Locations"
                  description="Cities, regions, or countries you want in job digests. Press Enter or comma to add."
                  placeholder="e.g. Berlin, Remote EU"
                  maxItems={50}
                  maxItemLength={120}
                />
              )}
            </form.AppField>

            <form.AppField name="roleKeywords">
              {(field) => (
                <field.TagsField
                  label="Role keywords"
                  description="Titles or skills that raise match score (e.g. TypeScript, Staff Engineer). Press Enter or comma to add."
                  placeholder="e.g. Full-stack, React"
                  maxItems={50}
                  maxItemLength={120}
                />
              )}
            </form.AppField>

            <form.AppField name="excludeKeywords">
              {(field) => (
                <field.TagsField
                  label="Exclude keywords"
                  description="Hard negatives — roles or tech you never want harvested. Press Enter or comma to add."
                  placeholder="e.g. PHP, Salesforce"
                  maxItems={50}
                  maxItemLength={120}
                />
              )}
            </form.AppField>

            <form.AppField name="minMatchScore">
              {(field) => (
                <field.SliderField
                  label="Minimum match score"
                  description="Auto-harvest skips jobs below this score (0–100). Default is 60."
                  min={0}
                  max={100}
                  step={1}
                  formatValue={(v) => `${v}%`}
                />
              )}
            </form.AppField>
          </FieldGroup>
        </Form>
      </SettingsFrame>
      {leaveGuard.alertDialog}
    </>
  );
}
