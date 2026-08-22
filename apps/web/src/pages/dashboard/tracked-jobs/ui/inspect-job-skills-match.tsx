"use client";

import { useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { TagsIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  normalizeJobSkillName,
  preselectHeldSkillForAlias,
  type HeldSkill,
  type HeldSkillWithId
} from "@tsu-stack/core";
import { PromptDialog } from "@tsu-stack/ui/components/prompt-dialog";

import { useAppForm } from "@/shared/form";
import { invalidateApplicationsListQueries } from "@/shared/lib/invalidate-applications-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { JobSkillsMatch, type JobSkillChipHaveItKind } from "@/shared/ui/job-card-marks";

import { requestHubCreateSkillFromInspect } from "@/features/agent-hub";
import {
  useGetJobPreferenceQuery,
  useUpsertJobPreferenceMutation
} from "@/features/job-preference";

function catalogFromHeld(held: readonly HeldSkill[] | undefined): HeldSkillWithId[] {
  const rows: HeldSkillWithId[] = [];
  for (const row of held ?? []) {
    const id = row.id?.trim();
    if (!id) continue;
    rows.push({ id, name: row.name, aliases: row.aliases ?? [] });
  }
  return rows;
}

async function invalidateAliasQueries(queryClient: QueryClient) {
  await invalidateStacksListQueries(queryClient);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpcQueryClient.applications.get.key() }),
    invalidateApplicationsListQueries(queryClient)
  ]);
}

function tokenAlreadyOnSkill(
  token: string,
  skill: { name: string; aliases?: readonly string[] }
): boolean {
  const tokenKey = normalizeJobSkillName(token);
  if (!tokenKey) return true;
  if (normalizeJobSkillName(skill.name) === tokenKey) return true;
  return (skill.aliases ?? []).some((alias) => normalizeJobSkillName(alias) === tokenKey);
}

function AliasSkillPickerDialog({
  token,
  catalog,
  pending,
  onOpenChange,
  onConfirm
}: {
  token: string;
  catalog: readonly HeldSkillWithId[];
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (skillId: string) => void;
}) {
  const items = useMemo(
    () =>
      catalog.map((skill) => {
        const aliases = skill.aliases ?? [];
        return {
          value: skill.id,
          label: aliases.length > 0 ? `${skill.name} · ${aliases.join(", ")}` : skill.name
        };
      }),
    [catalog]
  );

  const form = useAppForm({
    defaultValues: { skillId: preselectHeldSkillForAlias(token, catalog) ?? "" },
    onSubmit: ({ value }) => {
      const id = value.skillId.trim();
      if (!id) return;
      onConfirm(id);
    }
  });
  const skillId = useStore(form.store, (state) => state.values.skillId);

  return (
    <PromptDialog
      open
      onOpenChange={onOpenChange}
      size="sm"
      title="I have it"
      description={`Add “${token}” as an alias of which skill you already have?`}
      icon={<TagsIcon className="size-4" strokeWidth={2} />}
      submitLabel="Add alias"
      submitLoading={pending}
      submitDisabled={!skillId.trim() || pending}
      onSubmit={() => void form.handleSubmit()}
    >
      <form.AppField name="skillId">
        {(field) => (
          <field.ComboboxField
            label="Skill"
            placeholder="Search skills…"
            emptyMessage="No matching skills."
            items={items}
          />
        )}
      </form.AppField>
    </PromptDialog>
  );
}

export function InspectJobSkillsMatch({
  jobSkills,
  held,
  listingMinYears,
  seekerYears
}: {
  jobSkills: readonly string[];
  held?: readonly HeldSkill[];
  listingMinYears?: number | null;
  seekerYears?: number | null;
}) {
  const queryClient = useQueryClient();
  const catalog = useMemo(() => catalogFromHeld(held), [held]);
  const [pickerToken, setPickerToken] = useState<string | null>(null);
  const preferenceQuery = useGetJobPreferenceQuery();
  const upsertPreference = useUpsertJobPreferenceMutation();
  const excludeKeywords = preferenceQuery.data?.excludeKeywords ?? [];

  const updateStack = useMutation(
    orpcQueryClient.stacks.update.mutationOptions({
      onSuccess: async () => {
        await invalidateAliasQueries(queryClient);
      }
    })
  );

  function handleHaveIt({ token, kind }: { token: string; kind: JobSkillChipHaveItKind }) {
    if (kind === "close") {
      toast("Close, not the same skill.");
      return;
    }
    if (catalog.length === 0) {
      requestHubCreateSkillFromInspect(token);
      return;
    }
    setPickerToken(token);
  }

  function handleAvoid(token: string) {
    const trimmed = token.trim();
    if (!trimmed) return;
    if (!preferenceQuery.isSuccess || !preferenceQuery.data) return;

    const current = preferenceQuery.data.excludeKeywords ?? [];
    const tokenKey = normalizeJobSkillName(trimmed);
    if (current.some((keyword) => normalizeJobSkillName(keyword) === tokenKey)) return;

    const next = [...current, trimmed];
    void upsertPreference
      .mutateAsync({ excludeKeywords: next })
      .then(() => {
        toast.success(`Avoiding ${trimmed}.`, {
          action: {
            label: "Undo",
            onClick: () => {
              void upsertPreference.mutateAsync({ excludeKeywords: current }).catch(() => {
                toast.error("Could not undo avoid.");
              });
            }
          }
        });
      })
      .catch(() => {
        toast.error("Could not update job preferences.");
      });
  }

  function handleConfirmAlias(skillId: string) {
    const token = pickerToken?.trim() ?? "";
    const skill = catalog.find((row) => row.id === skillId);
    if (!token || !skill) return;

    const previousAliases = [...(skill.aliases ?? [])];
    const alreadyHas = tokenAlreadyOnSkill(token, skill);

    void (async () => {
      try {
        if (!alreadyHas) {
          await updateStack.mutateAsync({
            id: skill.id,
            data: { aliases: [...previousAliases, token] }
          });
        }
        setPickerToken(null);
        toast.success(`Added ${token} as an alias of ${skill.name}.`, {
          action: alreadyHas
            ? undefined
            : {
                label: "Undo",
                onClick: () => {
                  void updateStack
                    .mutateAsync({
                      id: skill.id,
                      data: { aliases: previousAliases }
                    })
                    .catch(() => {
                      toast.error("Could not undo alias.");
                    });
                }
              }
        });
      } catch {
        toast.error("Could not add alias.");
      }
    })();
  }

  return (
    <>
      <JobSkillsMatch
        jobSkills={jobSkills}
        held={held}
        listingMinYears={listingMinYears}
        seekerYears={seekerYears}
        onHaveIt={handleHaveIt}
        onAvoid={handleAvoid}
        hasAliasCatalog={catalog.length > 0}
        canAvoid={preferenceQuery.isSuccess && !upsertPreference.isPending}
        excludedKeywords={excludeKeywords}
      />
      {pickerToken ? (
        <AliasSkillPickerDialog
          key={pickerToken}
          token={pickerToken}
          catalog={catalog}
          pending={updateStack.isPending}
          onOpenChange={(open) => {
            if (!open) setPickerToken(null);
          }}
          onConfirm={handleConfirmAlias}
        />
      ) : null}
    </>
  );
}
