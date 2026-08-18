import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { buttonVariants } from "@tsu-stack/ui/components/button";
import { sonnerToastClassName, ToastStateGlyph } from "@tsu-stack/ui/components/toast-chrome";
import { cn } from "@tsu-stack/ui/lib/utils";

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="group"
      position="bottom-right"
      icons={{
        error: <ToastStateGlyph tone="error" />,
        info: <ToastStateGlyph tone="info" />,
        loading: <ToastStateGlyph tone="loading" />,
        success: <ToastStateGlyph tone="success" />,
        warning: <ToastStateGlyph tone="warning" />
      }}
      style={
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "color-mix(in srgb, var(--background) 90%, transparent)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--foreground)"
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: sonnerToastClassName,
          title: "font-medium",
          description: "!text-muted-foreground",
          icon: "relative flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5",
          actionButton: cn(
            buttonVariants({ size: "xs", variant: "outline" }),
            "h-6! max-h-6! min-h-6! shrink-0 self-center bg-background/90! text-foreground!"
          ),
          cancelButton: cn(buttonVariants({ size: "xs", variant: "ghost" }), "text-foreground!"),
          closeButton: buttonVariants({ size: "icon-xs", variant: "ghost" })
        }
      }}
      {...props}
    />
  );
}

export { Toaster };
