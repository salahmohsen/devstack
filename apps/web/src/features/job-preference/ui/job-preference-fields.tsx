"use client";

import { isOpenJobPreference } from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { withForm } from "@/shared/form";

import {
  emptyJobPreferenceForm,
  JOB_PREFERENCE_WORK_MODE_OPTIONS
} from "@/features/job-preference/lib/job-preference-form";

export const JobPreferenceFields = withForm({
  defaultValues: emptyJobPreferenceForm,
  props: {
    emptyHint:
      "Used to filter jobs from email alerts. Add work modes, locations, or keywords so mail harvest can match roles you care about."
  },
  render: function JobPreferenceFieldsRender({ form, emptyHint }) {
    return (
      <>
        <form.Subscribe selector={(state) => state.values}>
          {(values) =>
            isOpenJobPreference(values) ? (
              <p className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
                {emptyHint}
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
                options={JOB_PREFERENCE_WORK_MODE_OPTIONS}
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
                description="Auto-harvest skips jobs below this score (0–100). Default is 60."
                min={0}
                max={100}
                step={1}
                formatValue={(value) => `${value}%`}
              />
            )}
          </form.AppField>
        </FieldGroup>
      </>
    );
  }
});
