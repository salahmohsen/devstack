import { Button } from "@tsu-stack/ui/components/button";
import { CalendarDropdown, type CalendarProps } from "@tsu-stack/ui/components/calendar-dropdown";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "@/shared/form/field-label-with-tooltip";
import { useFieldContext } from "@/shared/form/form-contexts";

type CalendarFieldProps = Omit<CalendarProps, "mode"> & {
  label?: string;
  description?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
  };
};

/** Parse a stored value into a local Date (handles YYYY-MM-DD as local midnight, not UTC). */
function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const CalendarField = (props: CalendarFieldProps) => {
  const field = useFieldContext<string | undefined>();

  const { label, description, classNames, ...calendarProps } = props;

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
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !field.state.value && "text-muted-foreground"
              )}
            />
          }
        >
          {toDateOrNull(field.state.value)?.toDateString() ?? "Select Date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarDropdown
            captionLayout="dropdown"
            onDayBlur={field.handleBlur}
            endMonth={new Date(2030, 11)}
            startMonth={new Date(1995, 0)}
            onSelect={(value) => field.handleChange(value ? toYMD(value) : undefined)}
            selected={toDateOrNull(field.state.value) ?? undefined}
            mode={"single"}
            {...calendarProps}
          />
        </PopoverContent>
      </Popover>
      <FieldError errors={field.state.meta.errors} className={classNames?.error} />
    </Field>
  );
};
