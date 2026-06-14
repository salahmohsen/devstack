import { Outlet, createFileRoute } from "@tanstack/react-router";

import { cn } from "@tsu-stack/ui/lib/utils";

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-screen flex-col")}>
      <main className="flex-1">{children}</main>
    </div>
  );
}

export const Route = createFileRoute("/{-$locale}/(root-layout)")({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
});
