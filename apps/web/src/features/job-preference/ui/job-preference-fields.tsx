"use client";

import { useStore } from "@tanstack/react-form";
import { InfoIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  applyTitlePack,
  JOBS_PER_RUN_STEP,
  MAX_JOBS_PER_RUN,
  MIN_JOBS_PER_RUN,
  type JobTitleId
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { withForm } from "@/shared/form";

import {
  emptyJobPreferenceForm,
  isOpenJobPreferenceForm,
  leftoverRemoteRegionLocationTokens,
  leftoverRemoteRegionsHint,
  salaryCurrencyOptions,
  JOB_PREFERENCE_LEVEL_FLOOR_OPTIONS,
  JOB_PREFERENCE_WORK_MODE_OPTIONS,
  JOB_TITLE_PACK_OPTIONS
} from "@/features/job-preference/lib/job-preference-form";

export const JobPreferenceFields = withForm({
  defaultValues: emptyJobPreferenceForm,
  props: {
    emptyHint: "Used to find and rank jobs from public boards. Email import is optional."
  },
  render: function JobPreferenceFieldsRender({ form, emptyHint }) {
    const titleId = useStore(form.store, (state) => state.values.titleId);
    const previousTitleIdRef = useRef<JobTitleId | "">(titleId);

    useEffect(() => {
      // Keep last non-empty pack so clear → next pack still drops previous seeds.
      if (titleId === "") return;
      previousTitleIdRef.current = titleId;
    }, [titleId]);

    return (
      <>
        <form.Subscribe selector={(state) => state.values}>
          {(values) =>
            isOpenJobPreferenceForm(values) ? (
              <p className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
                {emptyHint}
              </p>
            ) : null
          }
        </form.Subscribe>

        <FieldGroup className="gap-6">
          <form.AppField
            name="titleId"
            listeners={{
              onChange: ({ value }) => {
                const previous = previousTitleIdRef.current;
                if (value === "" || value === previous) return;
                form.setFieldValue(
                  "roleKeywords",
                  applyTitlePack({
                    nextTitleId: value,
                    previousTitleId: previous === "" ? null : previous,
                    currentKeywords: form.getFieldValue("roleKeywords")
                  })
                );
              }
            }}
          >
            {(field) => (
              <field.ComboboxField
                label="Job title"
                description="Packs seed role keywords. Choose Custom title to type your own."
                placeholder="Select a title"
                emptyMessage="No titles match."
                items={JOB_TITLE_PACK_OPTIONS}
              />
            )}
          </form.AppField>

          <form.Subscribe selector={(state) => state.values.titleId}>
            {(titleId) =>
              titleId === "custom" ? (
                <form.AppField name="customTitle">
                  {(field) => (
                    <field.InputField
                      label="Custom title"
                      description="Shown as the search title. Needs at least two role keywords."
                      placeholder="e.g. Staff SRE"
                      maxLength={120}
                    />
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>

          <form.AppField name="levelFloor">
            {(field) => (
              <field.ComboboxField
                label="Level floor"
                description="Optional. Jobs below this seniority fail the match. Leave empty for no floor."
                placeholder="No floor"
                emptyMessage="No levels match."
                items={JOB_PREFERENCE_LEVEL_FLOOR_OPTIONS}
              />
            )}
          </form.AppField>

          <form.AppField name="workModes">
            {(field) => (
              <field.ToggleGroupField
                label="Work modes"
                description="Jobs outside selected modes are less likely to match. Leave empty to accept any."
                options={JOB_PREFERENCE_WORK_MODE_OPTIONS}
                multiple
                variant="outline"
                showSelectedCheck
              />
            )}
          </form.AppField>

          <form.AppField name="locations">
            {(field) => (
              <field.TagsField
                label="Locations"
                description="On-site and hybrid must match these places. Do not add Worldwide here."
                placeholder="e.g. Cairo, Berlin"
                maxItems={50}
                maxItemLength={120}
              />
            )}
          </form.AppField>

          <form.Subscribe selector={(state) => state.values.locations}>
            {(locations) => {
              const leftover = leftoverRemoteRegionLocationTokens(locations);
              if (leftover.length === 0) return null;
              return (
                <Alert variant="info">
                  <InfoIcon />
                  <AlertTitle>Move remote regions</AlertTitle>
                  <AlertDescription>{leftoverRemoteRegionsHint(leftover)}</AlertDescription>
                </Alert>
              );
            }}
          </form.Subscribe>

          <form.AppField name="remoteRegions">
            {(field) => (
              <field.TagsField
                label="Remote regions"
                description="Empty = anywhere remote. Add MENA / EU / US only to restrict."
                placeholder="e.g. MENA, EU, US"
                maxItems={50}
                maxItemLength={120}
              />
            )}
          </form.AppField>

          <form.AppField name="roleKeywords">
            {(field) => (
              <field.TagsField
                label="Role keywords"
                description="Pack seeds stay; add extras. Custom needs at least two keywords."
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

          <div className="grid gap-6 sm:grid-cols-2">
            <form.AppField name="salaryMin">
              {(field) => (
                <field.InputField
                  type="number"
                  label="Minimum monthly"
                  description="Optional monthly floor. Leave empty for no salary filter."
                  placeholder="e.g. 4000"
                />
              )}
            </form.AppField>

            <form.AppField name="salaryCurrency">
              {(field) => (
                <field.ComboboxField
                  label="Currency"
                  description="ISO code for the monthly floor (USD, EUR, EGP…)."
                  placeholder="USD"
                  emptyMessage="No currencies match."
                  items={salaryCurrencyOptions(field.state.value)}
                />
              )}
            </form.AppField>
          </div>

          <form.AppField name="jobsPerRun">
            {(field) => (
              <field.SliderField
                label="Jobs per search"
                description="How many listings to land each search (15–40)."
                min={MIN_JOBS_PER_RUN}
                max={MAX_JOBS_PER_RUN}
                step={JOBS_PER_RUN_STEP}
                formatValue={(value) => `${value} jobs`}
              />
            )}
          </form.AppField>

          <form.AppField name="minMatchScore">
            {(field) => (
              <field.SliderField
                label="Minimum match score"
                description="AI match bar (0–100). Cheap ranking does not use this."
                min={0}
                max={100}
                step={1}
                formatValue={(value) => `${value}%`}
              />
            )}
          </form.AppField>

          <form.AppField name="importFromEmail">
            {(field) => (
              <field.SwitchField
                label="Also import from email"
                description="Turn on to harvest job-alert digests into New jobs. Off by default — discovery APIs still run."
                layout="card"
              />
            )}
          </form.AppField>
        </FieldGroup>
      </>
    );
  }
});
