import { type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export function ErrorLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn("flex min-h-screen flex-col")}>
      <main className="relative -top-(--navbar-height) grid flex-1 place-items-center pt-(--navbar-height)">
        {children}
      </main>
    </div>
  );
}
