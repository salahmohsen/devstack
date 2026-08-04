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

export const CalendarField = (props: CalendarFieldProps) => {
  const field = useFieldContext<Date | undefined>();

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
          {field.state.value ? new Date(field.state.value).toDateString() : "Select Date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarDropdown
            captionLayout="dropdown"
            onDayBlur={field.handleBlur}
            endMonth={new Date(2030, 11)}
            startMonth={new Date(1995, 0)}
            onSelect={(value) => field.handleChange(value)}
            selected={field.state.value}
            mode={"single"}
            {...calendarProps}
          />
        </PopoverContent>
      </Popover>
      <FieldError errors={field.state.meta.errors} className={classNames?.error} />
    </Field>
  );
};
