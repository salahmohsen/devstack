import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import { useHasMounted } from "@/shared/lib/use-has-mounted";

import { appConfig } from "@/config/app.config";

const STORAGE_KEY = "portfolio-v2:alpha-notice-dismissed";

const issuesUrl = "https://github.com/salah-mo/portfolio-v2/issues";

export function AlphaNoticeDialog() {
  const hasMounted = useHasMounted();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasMounted) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // Storage blocked — skip modal
    }
  }, [hasMounted]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="top-[14%] translate-y-0 gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="gap-1.5 px-5 pt-5 pb-4">
          <DialogTitle className="text-[0.9375rem]">
            Welcome to {appConfig.site.shortName}
          </DialogTitle>
          <DialogDescription className="text-[0.8125rem]">
            Thanks for visiting — here is what you should know before you dive in.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5">
          <Alert className="border-amber-500/40 bg-amber-500/[0.12] dark:bg-amber-500/15 text-foreground">
            <AlertTitle className="text-amber-950 dark:text-amber-50">Beta software</AlertTitle>
            <AlertDescription className="text-amber-950/90 dark:text-amber-50/85">
              This portfolio is a work in progress. Expect bugs, rough edges, and unfinished flows.
              If something breaks, please report it on GitHub issues — it helps me ship a stable
              product.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="border-t border-white/10 px-5 py-3.5">
          <Button type="button" variant="ghost" size="sm" asChild>
            <a href={issuesUrl} target="_blank" rel="noopener noreferrer">
              Report an issue
            </a>
          </Button>
          <Button type="button" size="sm" onClick={dismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
