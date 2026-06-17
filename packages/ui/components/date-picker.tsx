"use client";

import { format as dateFnsFormat } from "date-fns";
import { useState } from "react";

import { CalendarIcon } from "@tsu-stack/icons";
import { Button } from "@tsu-stack/ui/components/button";
import { Calendar } from "@tsu-stack/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { cn } from "@tsu-stack/ui/lib/utils";

type DatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  displayFormat?: string;
  valueFormat?: string;
  className?: string;
  disabled?: boolean;
};

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  displayFormat = "PPP",
  valueFormat,
  className,
  disabled
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const date = value ? new Date(value) : undefined;

  function handleSelect(selected: Date | undefined) {
    if (selected && onChange) {
      onChange(valueFormat ? dateFnsFormat(selected, valueFormat) : selected.toISOString());
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!value}
          className={cn(
            "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          {date ? dateFnsFormat(date, displayFormat) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
