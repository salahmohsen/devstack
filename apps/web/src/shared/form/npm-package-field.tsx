"use client";

import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxStatus,
  ComboboxValue
} from "@tsu-stack/ui/components/combobox";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type NpmPackage = {
  npmPackage: string;
  description: string | null;
  homepage: string | null;
};

type NpmPackageSearchResult = {
  name: string;
  description?: string;
  links?: { npm?: string };
};

type NpmPackageFieldProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
  };
};

function NpmPackageField(props: NpmPackageFieldProps) {
  const field = useFieldContext<NpmPackage[]>();
  const selected: NpmPackage[] = field.state.value ?? [];

  const [searchValue, setSearchValue] = useState("");
  const [debouncedQuery] = useDebouncedValue(searchValue, 300);

  const npmSearchQuery = useQuery({
    ...orpcQueryClient.stacks.searchNpm.queryOptions({ input: { query: debouncedQuery } }),
    enabled: debouncedQuery.length >= 2
  });

  const suggestions: NpmPackageSearchResult[] = npmSearchQuery.data?.items ?? [];
  const isLoading = npmSearchQuery.isLoading && debouncedQuery.length >= 2;
  // oxlint-disable-next-line react-hooks(exhaustive-deps) -- suggestions comes from TanStack Query, stable reference
  const selectedNames = useMemo(() => new Set(selected.map((d) => d.npmPackage)), [selected]);

  // oxlint-disable-next-line react-hooks(exhaustive-deps) -- selectedNames is stable via useMemo above
  const items = useMemo(
    () =>
      suggestions
        .filter((item) => !selectedNames.has(item.name))
        .map((item) => {
          return {
            value: item.name,
            label: item.name,
            description: item.description ?? null,
            homepage: item.links?.npm ?? null
          };
        }),
    [suggestions, selectedNames]
  );

  function getStatus() {
    if (isLoading) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Spinner className="size-4.5 sm:size-4" />
          Searching packages...
        </span>
      );
    }

    if (debouncedQuery.trim().length >= 2 && suggestions.length === 0) {
      return `No packages found for "${debouncedQuery}"`;
    }

    return null;
  }

  function getEmptyMessage() {
    if (debouncedQuery.trim().length < 2 || isLoading || suggestions.length > 0) {
      return null;
    }

    return "Try a different search term.";
  }

  const status = getStatus();
  const emptyMessage = getEmptyMessage();

  return (
    <Field className={props.classNames?.field}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <Combobox
        items={items}
        multiple
        filter={null}
        itemToStringValue={(item) => (item as (typeof items)[number]).value}
        onInputValueChange={setSearchValue}
        onValueChange={(next) => {
          const arr = (Array.isArray(next) ? next : []) as Array<{
            value: string;
            label: string;
            description: string | null;
            homepage: string | null;
          }>;
          field.handleChange(
            arr.map((item) => {
              return {
                npmPackage: item.value,
                description: item.description,
                homepage: item.homepage
              };
            })
          );
          setSearchValue("");
        }}
        value={selected.map((d) => {
          return {
            value: d.npmPackage,
            label: d.npmPackage,
            description: d.description,
            homepage: d.homepage
          };
        })}
      >
        <ComboboxChips startAddon={<SearchIcon />}>
          <ComboboxValue>
            {(value: { value: string; label: string }[]) => (
              <>
                {value?.map((item) => (
                  <ComboboxChip aria-label={item.label} key={item.value}>
                    {item.label}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  aria-label={props.label ?? "Search packages"}
                  placeholder={
                    value.length > 0 ? undefined : (props.placeholder ?? "Search npm packages...")
                  }
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        {searchValue.length >= 2 && (
          <ComboboxPopup>
            <ComboboxStatus>
              {status ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">{status}</div>
              ) : null}
            </ComboboxStatus>
            <ComboboxEmpty>
              {emptyMessage ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">{emptyMessage}</div>
              ) : null}
            </ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof items)[number]) => (
                <ComboboxItem key={item.value} value={item}>
                  <span className="flex w-full min-w-0 flex-col">
                    <span className="truncate font-medium">{item.label}</span>
                    {item.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        )}
      </Combobox>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { NpmPackageField };
export type { NpmPackage };
