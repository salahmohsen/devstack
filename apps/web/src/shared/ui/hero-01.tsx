import { Link } from "@tanstack/react-router";
import { type ComponentType, type SVGProps } from "react";
import { SiBetterauth, SiDrizzle, SiHono, SiTanstack } from "react-icons/si";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { MastraIcon } from "@/shared/ui/mastra-icon";

/**
 * Chanhdai hero-01 block adapted for DEVSTACK.
 * @see https://chanhdai.com/blocks/marketing/hero-01
 */
export function Hero01() {
  return (
    <div className="relative w-full min-w-0 overflow-hidden py-8">
      <div className="mx-auto w-full max-w-5xl min-w-0 max-sm:px-2 sm:px-6">
        <div className="screen-line-top border-x border-line md:hidden">
          <div className="screen-line-bottom">
            <MobileSpiralSvg />
            <div className="relative grid aspect-[1/1.618] grid-cols-[1.618fr_minmax(0,1fr)] grid-rows-[1.618fr_1fr]">
              <MainContent className="col-[1/span_2] row-1" />
              <div className="col-2 row-2" />
              <div className="col-1 row-2 flex flex-col items-center justify-center overflow-hidden p-2 sm:p-4" />
            </div>
          </div>
        </div>

        <div className="screen-line-top hidden border-x border-line md:block">
          <div className="screen-line-bottom">
            <DesktopSpiralSvg />
            <div className="relative grid aspect-[1.618/1] grid-cols-[1.618fr_minmax(0,1fr)] grid-rows-[1fr_1.618fr]">
              <MainContent className="col-1 row-[1/span_2]" />
              <div className="col-2 row-1" />
              <div className="col-2 row-2 flex items-center justify-center overflow-hidden p-4 lg:p-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainContent({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-w-0 flex-col justify-center overflow-hidden p-4 lg:p-8", className)}
    >
      <h1 className="mb-4 font-heading text-[2.5rem] leading-none font-medium tracking-tight text-foreground sm:mb-6 sm:text-6xl md:text-5xl lg:text-6xl xl:text-7xl">
        Find. Track. Apply.
      </h1>

      <p className="mb-6 max-w-xl text-base leading-normal! text-pretty text-muted-foreground sm:mb-8 sm:text-lg sm:text-balance lg:text-xl">
        Self-hostable job-apply assistant. Discover roles, track the pipeline, draft packages with a
        hub agent on <strong className="font-normal text-foreground">your own API keys</strong>,
        then publish on{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-all text-foreground">
          /{"{username}"}
        </code>
        .
      </p>

      <div className="mb-6 grid grid-cols-2 items-center gap-4 sm:mb-8 sm:flex">
        <Button className="px-4 sm:px-8" size="lg" render={<Link to="/sign-up" />}>
          Create an account
        </Button>
        <Button
          className="px-4 sm:px-8"
          variant="outline"
          size="lg"
          render={<Link to="/sign-in" />}
        >
          Sign in
        </Button>
      </div>

      <div className="relative -ml-4 min-w-0 lg:ml-0">
        <div className="absolute -top-2 right-0 z-1 block h-10 w-20 bg-background mask-[linear-gradient(to_left,white,transparent)] lg:hidden" />
        <div className="no-scrollbar flex items-center gap-4 overflow-x-auto px-4 lg:px-0">
          {TECH_STACK.map((item) => (
            <TechItem key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

type TechStackItem = {
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/** Feature-shipping core: react-icons where available; Mastra logomark from mastra.ai brand. */
const TECH_STACK: TechStackItem[] = [
  { title: "TanStack Start", Icon: SiTanstack },
  { title: "Mastra", Icon: MastraIcon },
  { title: "Hono", Icon: SiHono },
  { title: "Drizzle", Icon: SiDrizzle },
  { title: "Better Auth", Icon: SiBetterauth }
];

function TechItem({ title, Icon }: TechStackItem) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground select-none [&_svg]:size-6 [&_svg]:shrink-0">
      <Icon aria-hidden className="size-6" />
      <span className="text-sm font-medium whitespace-nowrap">{title}</span>
    </div>
  );
}

function MobileSpiralSvg() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible text-line"
      viewBox="0 0 210 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g className="text-line">
        <path
          d="M380.853 105.099L-201.625 464.632"
          stroke="currentColor"
          strokeDasharray="4 2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-165.247 -267.831L369.777 600.141"
          stroke="currentColor"
          strokeDasharray="4 2"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <g>
        <path d="M209.5 260L130 260" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        <path d="M129.5 339.5L129.5 210" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        <path d="M159.5 260L159.5 210" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        <path
          d="M3.09944e-06 210L209.5 210"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        <path d="M160 240L130.133 240" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        <path d="M149.5 240L149.5 260" stroke="currentColor" vectorEffect="non-scaling-stroke" />
      </g>
      <g>
        <rect
          x="159.5"
          y="210"
          width="30"
          height="30"
          transform="rotate(90 159.5 210)"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x="149.5"
          y="240"
          width="20"
          height="20"
          transform="rotate(90 149.5 240)"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x="159.5"
          y="240"
          width="20"
          height="10"
          transform="rotate(90 159.5 240)"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <path
        className="text-border"
        d="M149.643 239.897C155.106 239.897 159.619 244.414 159.619 249.882C159.619 255.35 155.106 259.868 149.643 259.868C138.717 259.868 129.69 250.833 129.69 239.897C129.69 223.493 143.23 209.941 159.619 209.941C186.935 209.941 209.5 232.527 209.5 259.868C209.5 303.613 173.396 339.75 129.69 339.75C58.6695 339.75 -1.22732e-05 281.027 -9.16589e-06 209.941C-4.14648e-06 95.1103 94.7738 0.24998 209.5 0.249985C395.69 0.250001 549.5 154.06 549.5 340.25"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function DesktopSpiralSvg() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible text-line"
      viewBox="0 0 340 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g className="text-line">
        <path
          d="M105.1 -170.853L464.633 411.625"
          stroke="currentColor"
          strokeDasharray="4 2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-267.831 375.247L600.141 -159.777"
          stroke="currentColor"
          strokeDasharray="4 2"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <g>
        <path d="M260 0.5V80" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        <path d="M339.5 80.5H210" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        <path d="M210 210V0.5" stroke="currentColor" vectorEffect="non-scaling-stroke" />
      </g>
      <g>
        <rect
          x="210"
          y="50.5"
          width="30"
          height="30"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x="240"
          y="60.5"
          width="20"
          height="20"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x="240"
          y="50.5"
          width="20"
          height="10"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <path
        className="text-border"
        d="M239.897 60.3571C239.897 54.894 244.414 50.381 249.882 50.381C255.35 50.381 259.868 54.894 259.868 60.3571C259.868 71.2835 250.833 80.3095 239.897 80.3095C223.493 80.3095 209.941 66.7704 209.941 50.381C209.941 23.0652 232.527 0.499999 259.868 0.5C303.613 0.499995 339.75 36.6043 339.75 80.3095C339.75 151.33 281.027 210 209.941 210C95.1103 210 0.25 115.226 0.25 0.5C0.250008 -185.69 154.06 -339.5 340.25 -339.5"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
