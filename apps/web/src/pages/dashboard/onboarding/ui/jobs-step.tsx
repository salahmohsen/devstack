"use client";

import { useStore } from "@tanstack/react-form";
import { useMemo } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { Form } from "@tsu-stack/ui/components/form";
import { Frame, FramePanel } from "@tsu-stack/ui/components/frame";
import { Spinner } from "@tsu-stack/ui/components/spinner";

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
  const serverValues = useMemo(() => jobPreferenceFormFromQuery(data), [data]);

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: createZodFormValidator(JobPreferenceFormSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        await upsert.mutateAsync(jobPreferenceInputFromForm(value));
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
          <JobPreferenceFields
            form={form}
            emptyHint="Empty filters accept every harvested listing. Add modes, locations, or keywords so New jobs stays close to your craft."
          />
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
