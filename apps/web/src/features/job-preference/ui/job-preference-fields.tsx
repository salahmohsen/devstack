"use client";

import { useStore } from "@tanstack/react-form";
import { InfoIcon, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  applyTitlePack,
  DAILY_BOARD_SCORE_CAP_STEP,
  JOBS_PER_RUN_STEP,
  MAX_DAILY_BOARD_SCORE_CAP,
  MAX_JOBS_PER_RUN,
  MIN_DAILY_BOARD_SCORE_CAP,
  MIN_JOBS_PER_RUN,
  type JobTitleId
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { withForm } from "@/shared/form";
import { ProgressBar } from "@/shared/ui/interior/progress-bar";
import { NumberTicker } from "@/shared/ui/motion/number-ticker";

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
    emptyHint: "Used to find and rank jobs from public boards. Email import is optional.",
    boardScoresUsedToday: undefined as number | undefined,
    onResetBoardScoresToday: undefined as (() => void) | undefined,
    resetBoardScoresPending: false
  },
  render: function JobPreferenceFieldsRender({
    form,
    emptyHint,
    boardScoresUsedToday,
    onResetBoardScoresToday,
    resetBoardScoresPending
  }) {
    const titleId = useStore(form.store, (state) => state.values.titleId);
    const dailyBoardScoreCap = useStore(form.store, (state) => state.values.dailyBoardScoreCap);
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
                  description="Optional whole monthly floor. Leave empty for no salary filter."
                  placeholder="e.g. 4000"
                  maxLength={10}
                />
              )}
            </form.AppField>

            <form.AppField name="salaryCurrency">
              {(field) => (
                <field.ComboboxField
                  label="Currency"
                  description="ISO code for the monthly floor (USD, EUR, EGP…)."
                  placeholder="Select currency"
                  emptyMessage="No currencies match."
                  items={salaryCurrencyOptions(field.state.value)}
                />
              )}
            </form.AppField>
          </div>

          <form.AppField name="dailyBoardScoreCap">
            {(field) => (
              <div className="w-full max-w-lg min-w-0 rounded-2xl border border-border/80 p-4">
                <field.SliderField
                  label="Public listings to score today"
                  description="Find jobs now uses your AI key to score public listings before they appear in New jobs. This is the most it may score in one day, so one search cannot spend your key on too many listings. Jobs per search is how many can land in a single run. Job-alert emails are not counted."
                  min={MIN_DAILY_BOARD_SCORE_CAP}
                  max={MAX_DAILY_BOARD_SCORE_CAP}
                  step={DAILY_BOARD_SCORE_CAP_STEP}
                  formatValue={(value) => `${value} listings`}
                  classNames={{ field: "max-w-none" }}
                  footer={
                    boardScoresUsedToday != null ? (
                      <BoardScoreUsage
                        used={boardScoresUsedToday}
                        cap={dailyBoardScoreCap}
                        pending={resetBoardScoresPending}
                        onReset={onResetBoardScoresToday}
                      />
                    ) : null
                  }
                />
              </div>
            )}
          </form.AppField>

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
                description="This is the passing line. Each job gets a match score. If that score is below this number, it does not go into New jobs. Years on a listing can lower the score you see; they do not hide the job by themselves."
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

function BoardScoreUsage({
  used,
  cap,
  pending,
  onReset
}: {
  used: number;
  cap: number;
  pending: boolean;
  onReset?: () => void;
}) {
  const meterMax = Math.max(cap, 1);
  const percent = Math.round((Math.min(used, meterMax) / meterMax) * 100);
  const exhausted = used >= cap && cap > 0;
  const countLabel = exhausted
    ? `${used} of ${cap} listings today · none left`
    : `${used} of ${cap} listings today`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <NumberTicker
          value={percent}
          suffix="%"
          startOnView={false}
          className="text-2xl font-semibold tracking-tight"
        />
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <p className="min-w-0 text-xs text-muted-foreground tabular-nums">{countLabel}</p>
          {onReset ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="shrink-0 active:scale-[0.96] motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
              disabled={used === 0 || pending}
              loading={pending}
              aria-label="Clear today's scoring count"
              onClick={onReset}
            >
              <RotateCcw aria-hidden="true" />
              Clear today
            </Button>
          ) : null}
        </div>
      </div>
      <ProgressBar
        value={percent}
        max={100}
        hideHeader
        label={`${percent}% of today's listing cap, ${used} of ${cap} listings scored`}
      />
    </div>
  );
}
