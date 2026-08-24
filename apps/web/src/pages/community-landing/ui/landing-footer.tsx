import { Link } from "@tanstack/react-router";
import { SiGithub } from "react-icons/si";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

const GITHUB_REPO = "https://github.com/salahmohsen/devstack";

/**
 * Marketing footer — structure from @efferd/footer-2.
 * Only real routes and the public GitHub remote; no invented social proof.
 */
export function LandingFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("relative mx-auto w-full max-w-5xl min-w-0 border-t", className)}>
      <div className="grid min-w-0 grid-cols-6 gap-6 px-0 py-8 sm:py-10">
        <div className="col-span-6 flex min-w-0 flex-col gap-3 md:col-span-4">
          <Link className="w-max text-sm font-semibold tracking-tight text-foreground" to="/">
            DEVSTACK
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-balance text-muted-foreground">
            Self-hostable job-apply assistant. Your keys, your data, your Host.
          </p>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              className="text-foreground [&_svg]:fill-current [&_svg]:opacity-100!"
              render={
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub repository"
                />
              }
            >
              <SiGithub className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="col-span-3 min-w-0 md:col-span-1">
          <span className="text-xs text-muted-foreground">Product</span>
          <div className="mt-2 flex flex-col gap-2">
            {productLinks.map(({ to, title }) => (
              <Link className="w-max text-sm hover:underline" key={title} to={to}>
                {title}
              </Link>
            ))}
          </div>
        </div>

        <div className="col-span-3 min-w-0 md:col-span-1">
          <span className="text-xs text-muted-foreground">Legal</span>
          <div className="mt-2 flex flex-col gap-2">
            <Link className="w-max text-sm hover:underline" to="/privacy-policy">
              Privacy policy
            </Link>
            <Link className="w-max text-sm hover:underline" to="/terms-of-service">
              Terms of service
            </Link>
            <a
              className="w-max text-sm hover:underline"
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center border-t py-4">
        <p className="text-center text-sm font-light text-muted-foreground">
          &copy; {new Date().getFullYear()} DEVSTACK
        </p>
      </div>
    </footer>
  );
}

const productLinks = [
  { title: "Create account", to: "/sign-in/create-an-account" as const },
  { title: "Sign in", to: "/sign-in" as const }
];
