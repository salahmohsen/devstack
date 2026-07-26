import { Link } from "@tanstack/react-router";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import {
  closeGitHubAccessPrompt,
  useGitHubAccessPrompt
} from "@/shared/lib/github-access-modal-store";
import { useRefreshOnReturn } from "@/shared/lib/use-refresh-on-return";

export function GitHubAccessDialog() {
  const prompt = useGitHubAccessPrompt();

  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const showOrgSetup = searchParams?.get("show-org-setup") === "true";

  const isOpen = showOrgSetup || prompt !== null;
  useRefreshOnReturn({ enabled: isOpen });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (showOrgSetup) {
        const url = new URL(window.location.href);
        url.searchParams.delete("show-org-setup");
        window.history.replaceState({}, "", url.toString());
      }
      closeGitHubAccessPrompt();
    }
  }

  const title = prompt?.repo ? `Configure access for ${prompt.repo}` : "GitHub access";
  const description = prompt?.repo
    ? "The portfolio needs access to this repository. Sign in with GitHub so the server can use your OAuth token."
    : "GitHub access uses your signed-in OAuth token (not a classic PAT).";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[14%] translate-y-0 gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="gap-1.5 px-5 pt-5 pb-4">
          <DialogTitle className="text-[0.9375rem]">{title}</DialogTitle>
          <DialogDescription className="text-[0.8125rem]">{description}</DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5">
          <div className="rounded-xl border border-white/10 px-4 py-8">
            <p className="text-center text-sm text-muted-foreground">
              Sign out and sign back in with GitHub if private repos fail with 401, or open{" "}
              <Link
                to="/dashboard/settings/account"
                className="text-accent-foreground hover:underline"
                onClick={() => handleOpenChange(false)}
              >
                Account settings
              </Link>
              .
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 px-5 py-3.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button
            size="sm"
            render={
              <Link to="/dashboard/settings/account" onClick={() => handleOpenChange(false)} />
            }
          >
            Account settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
