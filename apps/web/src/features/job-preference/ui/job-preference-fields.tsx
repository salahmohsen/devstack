"use client";

import { useStore } from "@tanstack/react-form";
import { RotateCcw } from "lucide-react";
import { type ReactNode } from "react";

import {
  DAILY_BOARD_SCORE_CAP_STEP,
  DISCOVERY_SALARY_NOTE,
  MAX_DAILY_BOARD_SCORE_CAP,
  MIN_DAILY_BOARD_SCORE_CAP
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { withForm } from "@/shared/form";
import { ProgressBar } from "@/shared/ui/interior/progress-bar";
import { NumberTicker } from "@/shared/ui/motion/number-ticker";

import {
  emptyJobPreferenceForm,
  isOpenJobPreferenceForm,
  JOB_PREFERENCE_CATEGORY_OPTIONS,
  JOB_PREFERENCE_COLLECTION_OPTIONS,
  JOB_PREFERENCE_COMPANY_SIZE_OPTIONS,
  JOB_PREFERENCE_COMPANY_TYPE_OPTIONS,
  JOB_PREFERENCE_DOMAIN_OPTIONS,
  JOB_PREFERENCE_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PREFERENCE_REALITY_OPTIONS,
  JOB_PREFERENCE_REGION_OPTIONS,
  JOB_PREFERENCE_SENIORITY_OPTIONS,
  JOB_PREFERENCE_TRI_STATE_OPTIONS,
  JOB_PREFERENCE_WORK_MODE_OPTIONS,
  salaryCurrencyOptions
} from "@/features/job-preference/lib/job-preference-form";

import { GeoTagField } from "./geo-tag-field";

function FieldsSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="min-w-0 space-y-0.5">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      </div>
      {children}
    </section>
  );
}

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
    const dailyBoardScoreCap = useStore(form.store, (state) => state.values.dailyBoardScoreCap);

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

        <FieldGroup className="gap-8">
          <FieldsSection
            title="Where"
            description="Remote reach and locations for hybrid or on-site work."
          >
            <form.AppField name="regions">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Remote regions"
                  description="Where remote roles can hire. Global means worldwide postings."
                  placeholder="e.g. EU, MENA"
                  emptyMessage="No regions match."
                  items={JOB_PREFERENCE_REGION_OPTIONS}
                />
              )}
            </form.AppField>

            <form.AppField name="countries">
              {() => (
                <GeoTagField
                  label="Countries"
                  description="Two-letter country codes. Picking a city below adds its country."
                  placeholder="e.g. DE, NL"
                  kind="country"
                />
              )}
            </form.AppField>

            <form.AppField name="cities">
              {() => (
                <GeoTagField
                  label="Cities"
                  description="Type to search, or enter a city name directly."
                  placeholder="e.g. Berlin, Cairo"
                  kind="city"
                />
              )}
            </form.AppField>
          </FieldsSection>

          <FieldsSection title="Role" description="What the work should be about.">
            <form.AppField name="roleKeywords">
              {(field) => (
                <field.TagsField
                  label="Role keywords"
                  description="Optional title terms. Choose at least one role keyword or category to enable discovery."
                  placeholder="e.g. Full-stack, React"
                  maxItems={50}
                  maxItemLength={120}
                />
              )}
            </form.AppField>

            <form.AppField name="categories">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Categories"
                  description="Job categories. Leave empty for any."
                  placeholder="e.g. Backend, SRE"
                  emptyMessage="No categories match."
                  items={JOB_PREFERENCE_CATEGORY_OPTIONS}
                />
              )}
            </form.AppField>

            <form.AppField name="skills">
              {(field) => (
                <field.TagsField
                  label="Skills"
                  description="Must-have stack or skills. Leave empty for any."
                  placeholder="e.g. Go, Kubernetes"
                  maxItems={50}
                  maxItemLength={120}
                />
              )}
            </form.AppField>
          </FieldsSection>

          <FieldsSection title="Level" description="Seniority and years of experience.">
            <form.AppField name="seniority">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Seniority"
                  description="Levels to include. Leave empty for any."
                  placeholder="e.g. Senior, Staff"
                  emptyMessage="No levels match."
                  items={JOB_PREFERENCE_SENIORITY_OPTIONS}
                />
              )}
            </form.AppField>

            <div className="grid gap-6 sm:grid-cols-2">
              <form.AppField name="experienceYearsMin">
                {(field) => (
                  <field.InputField
                    type="number"
                    label="Minimum years"
                    description="Minimum experience a posting asks for. Unspecified requirements stay eligible."
                    placeholder="e.g. 3"
                    maxLength={3}
                  />
                )}
              </form.AppField>

              <form.AppField name="experienceYearsMax">
                {(field) => (
                  <field.InputField
                    type="number"
                    label="Maximum years"
                    description="Most experience a posting may ask for. Unspecified requirements stay eligible."
                    placeholder="e.g. 10"
                    maxLength={3}
                  />
                )}
              </form.AppField>
            </div>
          </FieldsSection>

          <FieldsSection title="Terms" description="Work mode, contract type, and pay floor.">
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

            <form.AppField name="employmentTypes">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Employment types"
                  description="Contract types to include. Leave empty for any."
                  placeholder="e.g. Full-time, Contract"
                  emptyMessage="No types match."
                  items={JOB_PREFERENCE_EMPLOYMENT_TYPE_OPTIONS}
                />
              )}
            </form.AppField>

            <div className="grid gap-6 sm:grid-cols-2">
              <form.AppField name="salaryMin">
                {(field) => (
                  <field.InputField
                    type="number"
                    label="Minimum monthly"
                    description={DISCOVERY_SALARY_NOTE}
                    placeholder="e.g. 4000"
                    maxLength={10}
                  />
                )}
              </form.AppField>

              <form.AppField name="salaryCurrency">
                {(field) => (
                  <field.ComboboxField
                    label="Currency"
                    description="ISO code for the monthly floor (USD, EUR, GBP, RUB)."
                    placeholder="Select currency"
                    emptyMessage="No currencies match."
                    items={salaryCurrencyOptions(field.state.value)}
                  />
                )}
              </form.AppField>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <form.AppField name="visaSponsorship">
                {(field) => (
                  <field.DropdownField
                    label="Visa sponsorship"
                    description="Yes = only jobs that sponsor a visa. No = exclude sponsoring jobs."
                    items={JOB_PREFERENCE_TRI_STATE_OPTIONS.map((item) => {
                      return { ...item };
                    })}
                    placeholder="No preference"
                  />
                )}
              </form.AppField>

              <form.AppField name="requiresClearance">
                {(field) => (
                  <field.DropdownField
                    label="Security clearance"
                    description="Yes = only jobs requiring clearance. No = exclude jobs that require it."
                    items={JOB_PREFERENCE_TRI_STATE_OPTIONS.map((item) => {
                      return { ...item };
                    })}
                    placeholder="No preference"
                  />
                )}
              </form.AppField>
            </div>
          </FieldsSection>

          <FieldsSection title="Companies" description="Who you want to work for.">
            <form.AppField name="companyTypes">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Company types"
                  description="Leave empty for any."
                  placeholder="e.g. Product, Startup"
                  emptyMessage="No types match."
                  items={JOB_PREFERENCE_COMPANY_TYPE_OPTIONS}
                />
              )}
            </form.AppField>

            <form.AppField name="companySizes">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Company size"
                  description="Headcount ranges. Leave empty for any."
                  placeholder="e.g. 11-50, 1000+"
                  emptyMessage="No sizes match."
                  items={JOB_PREFERENCE_COMPANY_SIZE_OPTIONS}
                />
              )}
            </form.AppField>

            <form.AppField name="domains">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Domains"
                  description="Industries or product areas. Leave empty for any."
                  placeholder="e.g. DevTools, Fintech"
                  emptyMessage="No domains match."
                  items={JOB_PREFERENCE_DOMAIN_OPTIONS}
                />
              )}
            </form.AppField>

            <form.AppField name="collections">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Collections"
                  description="Curated company lists. Leave empty for any."
                  placeholder="e.g. YC, Unicorn"
                  emptyMessage="No collections match."
                  items={JOB_PREFERENCE_COLLECTION_OPTIONS}
                />
              )}
            </form.AppField>
          </FieldsSection>

          <FieldsSection title="Freshness" description="How new listings should be.">
            <form.AppField name="openWithinDays">
              {(field) => (
                <field.InputField
                  type="number"
                  label="Posted within days"
                  description="Only jobs posted in the last N days. Leave empty for no limit."
                  placeholder="e.g. 14"
                  maxLength={4}
                />
              )}
            </form.AppField>

            <form.AppField name="reality">
              {(field) => (
                <field.ComboboxMultipleField
                  label="Reality"
                  description="Listing freshness class. Leave empty for any."
                  placeholder="e.g. Fresh"
                  emptyMessage="No options match."
                  items={JOB_PREFERENCE_REALITY_OPTIONS}
                />
              )}
            </form.AppField>
          </FieldsSection>

          <FieldsSection
            title="Scoring"
            description="How strictly jobs are filtered into New jobs."
          >
            <form.AppField name="dailyBoardScoreCap">
              {(field) => (
                <div className="w-full max-w-lg min-w-0 rounded-2xl border border-border/80 p-4">
                  <field.SliderField
                    label="Public listings to score today"
                    description="Find jobs now uses your AI key to score public listings before they appear in New jobs. This is the most it may score in one day, so one search cannot spend your key on too many listings. Job-alert emails are not counted."
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
          </FieldsSection>

          <FieldsSection title="Intake" description="Where listings come from.">
            <form.AppField name="importFromEmail">
              {(field) => (
                <field.SwitchField
                  label="Also import from email"
                  description="Turn on to harvest job-alert digests into New jobs. Off by default — discovery APIs still run."
                  layout="card"
                />
              )}
            </form.AppField>

            <form.AppField name="reviewApplyKit">
              {(field) => (
                <field.SwitchField
                  label="Review apply kit"
                  description="On = dashboard review sheet before accept. Off = generate+accept from the button without the sheet. Hub chat still asks for approval."
                  layout="card"
                />
              )}
            </form.AppField>
          </FieldsSection>
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
