import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import {
  AlertTriangleIcon,
  CheckCircleIcon,
  DangerIcon,
  InfoIcon,
  LoaderCircleIcon
} from "@tsu-stack/icons";

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="group"
      icons={{
        error: <DangerIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <LoaderCircleIcon className="size-4 animate-spin" />,
        success: <CheckCircleIcon className="size-4" />,
        warning: <AlertTriangleIcon className="size-4" />
      }}
      style={
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)"
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast"
        }
      }}
      {...props}
    />
  );
}

export { Toaster };
