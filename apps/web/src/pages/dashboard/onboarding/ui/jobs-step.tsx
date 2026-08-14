"use client";

import { useStore } from "@tanstack/react-form";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  DEFAULT_MIN_MATCH_SCORE,
  JobPreferenceFieldsSchema,
  WORK_MODE_LABELS,
  WORK_MODES,
  type WorkMode
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Frame, FramePanel } from "@tsu-stack/ui/components/frame";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { normalizeTags } from "@tsu-stack/ui/components/tags-input";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  useGetJobPreferenceQuery,
  useUpsertJobPreferenceMutation,
  type JobPreferenceQueryResult
} from "@/features/job-preference";

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

export function JobsStep({ onContinue, onBack }: { onContinue: () => void; onBack?: () => void }) {
  const query = useGetJobPreferenceQuery();

  if (query.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="error">
          <AlertTitle>Could not load job preferences</AlertTitle>
          <AlertDescription>
            Refresh and try again, or continue and set these later in Settings → Jobs.
          </AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button type="button" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading preferences…
      </div>
    );
  }

  return <JobsStepForm data={query.data} onContinue={onContinue} onBack={onBack} />;
}

function JobsStepForm({
  data,
  onContinue,
  onBack
}: {
  data: JobPreferenceQueryResult;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const upsert = useUpsertJobPreferenceMutation();
  const serverValues = useMemo(() => formFromQuery(data), [data]);

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: createZodFormValidator(JobSettingsFormSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        await upsert.mutateAsync({
          workModes: value.workModes,
          locations: normalizeTags(value.locations, 50, 120),
          roleKeywords: normalizeTags(value.roleKeywords, 50, 120),
          excludeKeywords: normalizeTags(value.excludeKeywords, 50, 120),
          minMatchScore: value.minMatchScore
        });
        toast.success("Job preferences saved");
        onContinue();
      } catch {
        toast.error("Could not save job preferences");
      }
    }
  });

  const isDirty = useStore(form.store, (state) => state.isDirty);

  return (
    <Form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDirty) {
          onContinue();
          return;
        }
        void form.handleSubmit();
      }}
    >
      <Frame>
        <FramePanel className="space-y-6">
          <form.Subscribe selector={(s) => s.values}>
            {(values) =>
              isEmptyPrefs(values) ? (
                <p className="rounded-lg border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
                  Empty filters accept every harvested listing. Add modes, locations, or keywords so
                  New jobs stays close to your craft.
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
                  description="Cities, regions, or countries. Press Enter or comma to add."
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
                  description="Titles or skills that raise match score. Press Enter or comma to add."
                  placeholder="e.g. Frontend, React"
                  maxItems={50}
                  maxItemLength={120}
                />
              )}
            </form.AppField>

            <form.AppField name="excludeKeywords">
              {(field) => (
                <field.TagsField
                  label="Exclude keywords"
                  description="Hard negatives — roles or tech you never want harvested."
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
                  description="Auto-harvest skips jobs below this score. Default is 60."
                  min={0}
                  max={100}
                  step={1}
                  formatValue={(v) => `${v}%`}
                />
              )}
            </form.AppField>
          </FieldGroup>
        </FramePanel>
      </Frame>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onBack}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={upsert.isPending}
            onClick={onContinue}
          >
            Skip for now
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            {isDirty ? "Save and continue" : "Continue"}
          </Button>
        </div>
      </div>
    </Form>
  );
}
