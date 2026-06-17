"use client";

import { Button } from "@tsu-stack/ui/components/button";

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
      {([isSubmitting]) => (
        <Button type="submit" disabled={isLoading || isSubmitting} {...props}>
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}

export { SubmitButton };
