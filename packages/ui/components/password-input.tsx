"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";

import { cn } from "#@/lib/utils";

function PasswordInput({
  className,
  showToggle = true,
  ...props
}: React.ComponentProps<"input"> & { showToggle?: boolean }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input className="pr-9" type={visible ? "text" : "password"} {...props} />
      {showToggle && (
        <Button
          className={cn('hover:bg-transparent" absolute top-0 right-0 h-full px-2.5', className)}
          onClick={() => setVisible(!visible)}
          size="icon"
          tabIndex={-1}
          type="button"
          variant="ghost"
        >
          {visible ? (
            <EyeOff className="size-4 text-muted-foreground" />
          ) : (
            <Eye className="size-4 text-muted-foreground" />
          )}
          <span className="sr-only">{visible ? "Hide" : "Show"} password</span>
        </Button>
      )}
    </div>
  );
}

export { PasswordInput };
