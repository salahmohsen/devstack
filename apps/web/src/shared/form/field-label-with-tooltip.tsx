"use client";

import { InfoIcon } from "lucide-react";

import { FieldDescription, FieldLabel } from "@tsu-stack/ui/components/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip.js";
import { cn } from "@tsu-stack/ui/lib/utils";

type FieldLabelWithTooltipProps = {
  label?: string;
  description?: string;
  htmlFor?: string;
  classNames?: {
    label?: string;
    description?: string;
  };
};

/**
 * Label row with optional description shown as an info-icon tooltip.
 * Prefer this over inline FieldDescription under form controls.
 */
function FieldLabelWithTooltip(props: FieldLabelWithTooltipProps) {
  if (!props.label && !props.description) {
    return null;
  }

  return (
    <div className="flex gap-1">
      {props.label ? (
        <FieldLabel htmlFor={props.htmlFor} className={props.classNames?.label}>
          {props.label}
        </FieldLabel>
      ) : null}
      {props.description ? (
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon size={16} className="text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="w-72 max-w-[min(18rem,var(--available-width))] text-pretty">
            <FieldDescription className={cn("whitespace-normal", props.classNames?.description)}>
              {props.description}
            </FieldDescription>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export { FieldLabelWithTooltip };
