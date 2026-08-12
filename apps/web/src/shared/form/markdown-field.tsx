"use client";

import { useState } from "react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Markdown } from "@/shared/ui/markdown";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

/** Shared write/preview panel height so switching tabs doesn’t jump the sheet. */
const PANEL_HEIGHT_CLASS = "h-72 max-h-72";

type MarkdownFieldProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    textarea?: string;
    preview?: string;
  };
};

function defaultTabForValue(value: string): "write" | "preview" {
  // Edit forms with existing notes open on preview; empty/create stays on write.
  return value.trim() ? "preview" : "write";
}

function MarkdownField({ label, placeholder, description, classNames }: MarkdownFieldProps) {
  const field = useFieldContext<string | null>();
  const value = field.state.value ?? "";
  const [tab, setTab] = useState<"write" | "preview">(() => defaultTabForValue(value));
  const [seedValue, setSeedValue] = useState(value);

  // When the form loads/resets clean data (edit open, create reset), re-pick default tab.
  if (!field.state.meta.isDirty && value !== seedValue) {
    setSeedValue(value);
    setTab(defaultTabForValue(value));
  }

  return (
    <Field className={cn("max-w-full min-w-0", classNames?.field)}>
      <FieldLabelWithTooltip
        label={label}
        description={description}
        htmlFor={field.name}
        classNames={{
          label: classNames?.label,
          description: classNames?.description
        }}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "write" | "preview")}
        className="max-w-full min-w-0"
      >
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="max-w-full min-w-0">
          <Textarea
            id={field.name}
            name={field.name}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value || null)}
            value={value}
            placeholder={placeholder}
            rows={12}
            cols={20}
            className={cn(
              PANEL_HEIGHT_CLASS,
              "w-full max-w-full min-w-0 resize-none overflow-y-auto wrap-break-word",
              classNames?.textarea
            )}
          />
        </TabsContent>
        <TabsContent value="preview" className="max-w-full min-w-0">
          <div
            className={cn(
              PANEL_HEIGHT_CLASS,
              "max-w-full min-w-0 overflow-hidden rounded-lg border border-input bg-background text-sm",
              classNames?.preview
            )}
          >
            <ScrollArea className="h-full" scrollFade>
              <div className="px-3 py-2.5">
                {value.trim() ? (
                  <Markdown className="max-w-full min-w-0">{value}</Markdown>
                ) : (
                  <p className="text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
      <FieldError errors={field.state.meta.errors} className={classNames?.error} />
    </Field>
  );
}

export { MarkdownField };
