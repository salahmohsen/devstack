"use client";

import { BriefcaseIcon, XIcon } from "lucide-react";
import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import {
  DEFAULT_MIN_MATCH_SCORE,
  WORK_MODE_LABELS,
  WORK_MODES,
  type WorkMode
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { Slider } from "@tsu-stack/ui/components/slider";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@tsu-stack/ui/components/toggle-group";

import {
  useGetJobPreferenceQuery,
  useUpsertJobPreferenceMutation,
  type JobPreferenceQueryResult
} from "@/features/job-preference";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

type FormState = {
  workModes: WorkMode[];
  locations: string[];
  roleKeywords: string[];
  excludeKeywords: string[];
  minMatchScore: number;
};

const MAX_LIST_ITEMS = 50;
const MAX_ITEM_LENGTH = 120;

function normalizeList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value.slice(0, MAX_ITEM_LENGTH));
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

function listsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function workModesEqual(a: WorkMode[], b: WorkMode[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((m) => set.has(m));
}

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

function JobSettingsHeader() {
  return (
    <FrameHeader>
      <FrameTitle className="flex items-center gap-2">
        <BriefcaseIcon className="size-4 opacity-80" aria-hidden />
        Jobs
      </FrameTitle>
      <FrameDescription>Used to filter jobs from email alerts</FrameDescription>
    </FrameHeader>
  );
}

/**
 * Shell: load / error / ready. Form hooks live only in the ready branch so React
 * Compiler never sees conditional hook counts across error/loading returns.
 */
export function JobSettings() {
  const query = useGetJobPreferenceQuery();

  if (query.isError) {
    return (
      <Frame>
        <FrameHeader>
          <FrameTitle className="flex items-center gap-2">
            <BriefcaseIcon className="size-4 opacity-80" aria-hidden />
            Jobs
          </FrameTitle>
          <FrameDescription>Could not load job preferences.</FrameDescription>
        </FrameHeader>
        <FramePanel>
          <Alert variant="error">
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>Refresh the page or try again later.</AlertDescription>
          </Alert>
        </FramePanel>
      </Frame>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <Frame>
        <JobSettingsHeader />
        <FramePanel>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading…
          </div>
        </FramePanel>
      </Frame>
    );
  }

  return <JobSettingsForm data={query.data} />;
}

function JobSettingsForm({ data }: { data: JobPreferenceQueryResult }) {
  const upsert = useUpsertJobPreferenceMutation();
  const [draft, setDraft] = useState<FormState | null>(null);

  const form = useMemo(() => {
    if (draft) return draft;
    return formFromQuery(data);
  }, [data, draft]);

  const dirty = useMemo(() => {
    const server = formFromQuery(data);
    if (!workModesEqual(form.workModes, server.workModes)) return true;
    if (!listsEqual(form.locations, server.locations)) return true;
    if (!listsEqual(form.roleKeywords, server.roleKeywords)) return true;
    if (!listsEqual(form.excludeKeywords, server.excludeKeywords)) return true;
    if (form.minMatchScore !== server.minMatchScore) return true;
    return false;
  }, [form, data]);

  const discard = useCallback(() => {
    setDraft(null);
  }, []);

  const leaveGuard = useSettingsDirtyGuard(dirty, { onDiscard: discard });

  function ensureDraft(): FormState {
    if (draft) return draft;
    const next = formFromQuery(data);
    setDraft(next);
    return next;
  }

  function patch(mutator: (current: FormState) => FormState) {
    setDraft(mutator(ensureDraft()));
  }

  async function handleSave() {
    try {
      await upsert.mutateAsync({
        workModes: form.workModes,
        locations: normalizeList(form.locations),
        roleKeywords: normalizeList(form.roleKeywords),
        excludeKeywords: normalizeList(form.excludeKeywords),
        minMatchScore: form.minMatchScore
      });
      toast.success("Job preferences saved");
      setDraft(null);
    } catch {
      toast.error("Could not save job preferences");
    }
  }

  return (
    <>
      <Frame>
        <JobSettingsHeader />

        <FramePanel className="space-y-8">
          {isEmptyPrefs(form) ? (
            <p className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
              Used to filter jobs from email alerts. Add work modes, locations, or keywords so mail
              harvest can match roles you care about.
            </p>
          ) : null}

          <SettingsSection
            title="Work modes"
            description="Jobs outside selected modes are less likely to match. Leave empty to accept any."
          >
            <ToggleGroup
              variant="outline"
              value={form.workModes}
              onValueChange={(next) => {
                const modes = (next as string[]).filter((m): m is WorkMode =>
                  (WORK_MODES as readonly string[]).includes(m)
                );
                patch((current) => {
                  return { ...current, workModes: modes };
                });
              }}
              className="flex flex-wrap"
            >
              {WORK_MODES.map((mode) => (
                <ToggleGroupItem key={mode} value={mode}>
                  {WORK_MODE_LABELS[mode]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingsSection>

          <SettingsSection
            title="Locations"
            description="Cities, regions, or countries you want in job digests."
          >
            <StringListField
              id="job-locations"
              values={form.locations}
              placeholder="e.g. Berlin, Remote EU"
              onChange={(locations) =>
                patch((current) => {
                  return { ...current, locations };
                })
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Role keywords"
            description="Titles or skills that raise match score (e.g. TypeScript, Staff Engineer)."
          >
            <StringListField
              id="job-role-keywords"
              values={form.roleKeywords}
              placeholder="e.g. Full-stack, React"
              onChange={(roleKeywords) =>
                patch((current) => {
                  return { ...current, roleKeywords };
                })
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Exclude keywords"
            description="Hard negatives — roles or tech you never want harvested."
          >
            <StringListField
              id="job-exclude-keywords"
              values={form.excludeKeywords}
              placeholder="e.g. PHP, Salesforce"
              onChange={(excludeKeywords) =>
                patch((current) => {
                  return { ...current, excludeKeywords };
                })
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Minimum match score"
            description="Auto-harvest skips jobs below this score (0–100). Default is 60."
          >
            <div className="max-w-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="job-min-match-score">Threshold</Label>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {form.minMatchScore}%
                </span>
              </div>
              <Slider
                id="job-min-match-score"
                aria-label="Minimum match score"
                min={0}
                max={100}
                step={1}
                value={[form.minMatchScore]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  if (typeof next !== "number" || Number.isNaN(next)) return;
                  patch((current) => {
                    return {
                      ...current,
                      minMatchScore: Math.min(100, Math.max(0, Math.round(next)))
                    };
                  });
                }}
              />
            </div>
          </SettingsSection>

          <SettingsSaveBar
            dirty={dirty}
            saving={upsert.isPending}
            onSave={() => void handleSave()}
            onDiscard={discard}
            saveLabel="Save job preferences"
          />
        </FramePanel>
      </Frame>
      {leaveGuard.alertDialog}
    </>
  );
}

function StringListField({
  id,
  values,
  placeholder,
  onChange
}: {
  id: string;
  values: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addTokens(raw: string) {
    const tokens = raw
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;
    onChange(normalizeList([...values, ...tokens]));
    setInput("");
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTokens(input);
      return;
    }
    if (e.key === "Backspace" && input === "" && values.length > 0) {
      e.preventDefault();
      removeAt(values.length - 1);
    }
  }

  return (
    <div className="space-y-2">
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected values">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>
              <Badge variant="secondary" className="gap-1 pe-1">
                <span className="max-w-56 truncate">{value}</span>
                <button
                  type="button"
                  className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  aria-label={`Remove ${value}`}
                  onClick={() => removeAt(index)}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (input.trim()) addTokens(input);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">
        Press Enter or comma to add. Max {MAX_LIST_ITEMS}.
      </p>
    </div>
  );
}
