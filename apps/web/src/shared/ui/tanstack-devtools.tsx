import { a11yDevtoolsPlugin } from "@tanstack/devtools-a11y/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

/** Dev-only overlay. Lazy-imported from the root so it stays off the critical path. */
export function AppTanStackDevtools() {
  return (
    <TanStackDevtools
      plugins={[
        {
          name: "TanStack Query",
          render: <ReactQueryDevtoolsPanel />
        },
        {
          name: "TanStack Router",
          render: <TanStackRouterDevtoolsPanel />
        },
        {
          name: "TanStack Form",
          render: <FormDevtoolsPanel />
        },
        a11yDevtoolsPlugin()
      ]}
    />
  );
}
