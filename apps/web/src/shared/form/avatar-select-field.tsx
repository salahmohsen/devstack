"use client";

import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

export type AvatarSelectOption = {
  value: string;
  label: string;
  description?: string;
  emoji?: string;
  avatar?: string;
  initials?: string;
  /** When set, render a SmoothUI Agent Avatar instead of emoji/photo. */
  seed?: string;
};

type AvatarSelectFieldProps = {
  label?: string;
  description?: string;
  ariaLabel?: string;
  options: AvatarSelectOption[];
  onValueChange?: (value: string) => void;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    trigger?: string;
    item?: string;
  };
};

function AvatarSelectRow({ item }: { item: AvatarSelectOption }) {
  const initials = item.initials ?? item.label.slice(0, 2).toUpperCase();

  return (
    <span className="flex min-w-0 items-center gap-2">
      {item.seed ? (
        <AgentAvatar seed={item.seed} size={32} className="size-8 shrink-0" aria-hidden />
      ) : (
        <Avatar className="size-8">
          {item.avatar ? <AvatarImage alt={item.label} src={item.avatar} /> : null}
          <AvatarFallback className="text-base leading-none">
            {item.emoji ?? initials}
          </AvatarFallback>
        </Avatar>
      )}
      <span className="flex min-w-0 flex-col text-left">
        <span className="truncate font-medium">{item.label}</span>
        {item.description ? (
          <span className="truncate text-xs text-muted-foreground">{item.description}</span>
        ) : null}
      </span>
    </span>
  );
}

function AvatarSelectField(props: AvatarSelectFieldProps) {
  const field = useFieldContext<string>();
  const selected = props.options.find((option) => option.value === field.state.value) ?? null;

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
      <Select
        aria-label={props.ariaLabel ?? props.label}
        value={selected}
        onValueChange={(next) => {
          const id = next?.value ?? "";
          field.handleChange(id);
          props.onValueChange?.(id);
        }}
        itemToStringValue={(item) => item.value}
      >
        <SelectTrigger className={props.classNames?.trigger ?? "h-auto py-1.5"}>
          <SelectValue className="min-w-0 flex-1">
            {(item: AvatarSelectOption | null) => (item ? <AvatarSelectRow item={item} /> : null)}
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          {props.options.map((item) => (
            <SelectItem
              className={props.classNames?.item ?? "py-1.5"}
              key={item.value}
              value={item}
            >
              <AvatarSelectRow item={item} />
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { AvatarSelectField };
