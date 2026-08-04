"use client";

import { useState } from "react";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Markdown } from "@/shared/ui/markdown";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

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

function MarkdownField({ label, placeholder, description, classNames }: MarkdownFieldProps) {
  const field = useFieldContext<string | null>();
  const value = field.state.value ?? "";
  const [tab, setTab] = useState<"write" | "preview">(value ? "write" : "write");

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
      <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="w-full">
          <Textarea
            id={field.name}
            name={field.name}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value || null)}
            value={value}
            placeholder={placeholder}
            rows={10}
            cols={20}
            className={cn("w-full", classNames?.textarea)}
          />
        </TabsContent>
        <TabsContent value="preview">
          <div
            className={
              "min-h-40 rounded-lg border border-input bg-background px-3 py-2.5 text-sm " +
              (classNames?.preview ?? "")
            }
          >
            {value.trim() ? (
              <Markdown>{value}</Markdown>
            ) : (
              <p className="text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <FieldError errors={field.state.meta.errors} className={classNames?.error} />
    </Field>
  );
}

export { MarkdownField };
