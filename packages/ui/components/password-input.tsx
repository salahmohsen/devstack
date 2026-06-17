"use client";

import * as React from "react";

import { EyeIcon, EyeOffIcon } from "@tsu-stack/icons";
import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";

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
          className="absolute top-0 right-0 h-full px-2.5 hover:bg-transparent"
          onClick={() => setVisible(!visible)}
          size="icon"
          tabIndex={-1}
          type="button"
          variant="ghost"
        >
          {visible ? (
            <EyeOffIcon className="size-4 text-muted-foreground" />
          ) : (
            <EyeIcon className="size-4 text-muted-foreground" />
          )}
          <span className="sr-only">{visible ? "Hide" : "Show"} password</span>
        </Button>
      )}
    </div>
  );
}

export { PasswordInput };
