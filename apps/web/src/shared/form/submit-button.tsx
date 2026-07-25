"use client";

import { Check, Send } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";

import { useFormContext } from "./form-contexts";

type SubmitButtonProps = {
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  light?: "none" | "skeuomorphic";
};

function SubmitButton({ children, isLoading, ...props }: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.isSubmitting]}>
      {([isSubmitting]) => {
        const busy = Boolean(isLoading ?? isSubmitting);
        return (
          <Button type="submit" disabled={busy} loading={busy} {...props}>
            {!busy ? (
              <IconMorph
                mode="hover"
                iconA={<Send className="size-4" aria-hidden />}
                iconB={<Check className="size-4" aria-hidden />}
              />
            ) : null}
            {children}
          </Button>
        );
      }}
    </form.Subscribe>
  );
}

export { SubmitButton };
