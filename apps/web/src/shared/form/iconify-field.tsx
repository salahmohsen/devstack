"use client";

import { Search, X } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";

import { fetchIconSvg, searchIcon } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { renderSvg } from "@/shared/ui/icon";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type IconifyFieldProps = {
  label?: string;
  description?: string;
  searchPlaceholder?: string;
  triggerPlaceholder?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
  };
};

function IconifyField({
  label,
  description,
  searchPlaceholder = "Search Iconify icons...",
  triggerPlaceholder = "Select an icon",
  classNames
}: IconifyFieldProps) {
  const field = useFieldContext<string>();
  const currentValue = field.state.value ?? "";

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [searchCount, setSearchCount] = useState(0);

  const hasQuery = debouncedQuery.length >= 2;
  const displayResults = hasQuery ? results : [];
  // Search is "in progress" when we have a query but haven't received results for it yet
  const displayIsSearching = hasQuery && searchCount === 0;

  useEffect(() => {
    let cancelled = false;

    if (!hasQuery) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setResults([]);
          setSearchCount(0);
        }
      });
      return;
    }

    void searchIcon(debouncedQuery, 20).then((res) => {
      if (!cancelled) {
        setResults(res);
        setSearchCount((n) => n + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, hasQuery]);

  const handleSelect = useCallback(
    async (iconId: string) => {
      setIsResolving(true);
      setIsOpen(false);
      setQuery("");

      const svg = await fetchIconSvg(iconId);
      if (svg) {
        field.handleChange(svg);
      }
      setIsResolving(false);
    },
    [field]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      field.handleChange("");
      setQuery("");
      setResults([]);
    },
    [field]
  );

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) setQuery("");
  }, []);

  return (
    <Field className={classNames?.field}>
      <FieldLabelWithTooltip
        label={label}
        description={description}
        htmlFor={field.name}
        classNames={{
          label: classNames?.label,
          description: classNames?.description
        }}
      />
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
          {currentValue ? (
            renderSvg(currentValue, "size-8")
          ) : (
            <span className="text-xs text-muted-foreground">?</span>
          )}
        </div>
        <div className="relative flex-1">
          <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger
              className={cn(
                "w-full justify-start text-left",
                !currentValue && "text-muted-foreground"
              )}
              render={
                <Button variant="outline" type="button">
                  {currentValue ? (
                    <span className="flex items-center gap-2">
                      {renderSvg(currentValue, "size-5")}
                      <span className="truncate text-sm">Custom icon</span>
                    </span>
                  ) : (
                    triggerPlaceholder
                  )}
                </Button>
              }
            />
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              </div>
              <div className="h-60 overflow-y-auto px-2 pb-2">
                {displayIsSearching && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-md" />
                    ))}
                  </div>
                )}
                {!displayIsSearching &&
                  displayResults.length === 0 &&
                  debouncedQuery.length >= 2 && (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No icons found
                    </div>
                  )}
                {!displayIsSearching && displayResults.length > 0 && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {displayResults.map((iconId) => (
                      <TooltipProvider key={iconId}>
                        <Tooltip>
                          <TooltipTrigger
                            className={cn(
                              "aspect-square rounded-md border p-2 transition hover:bg-foreground/10",
                              "flex items-center justify-center"
                            )}
                            onClick={() => void handleSelect(iconId)}
                            disabled={isResolving}
                          >
                            <IconPreview iconId={iconId} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{iconId}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {currentValue && (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {isResolving && <span className="text-xs text-muted-foreground">Loading...</span>}
      </div>
      <FieldError errors={field.state.meta.errors} className={classNames?.error} />
    </Field>
  );
}

const IconPreview = React.memo(({ iconId }: { iconId: string }) => {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchIconSvg(iconId).then((s) => {
      if (!cancelled) setSvg(s);
    });
    return () => {
      cancelled = true;
    };
  }, [iconId]);

  if (!svg) return <Skeleton className="size-full rounded-sm" />;
  return (
    <span className="block size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
  );
});
IconPreview.displayName = "IconPreview";

export { IconifyField };
