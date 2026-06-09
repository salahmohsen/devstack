import { Outlet, createFileRoute } from "@tanstack/react-router";

import { cn } from "@tsu-stack/ui/lib/utils";

import { Navbar } from "@/features/navbar";

function CenteredLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-screen flex-col")}>
      <Navbar />
      <main className="relative -top-(--navbar-height) grid flex-1 place-items-center pt-(--navbar-height)">
        {children}
      </main>
    </div>
  );
}

export const Route = createFileRoute("/{-$locale}/(centered-layout)")({
  component: () => (
    <CenteredLayout>
      <Outlet />
    </CenteredLayout>
  )
});
