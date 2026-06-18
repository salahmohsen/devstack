import { createFileRoute } from "@tanstack/react-router";

import { ExperiencesPage } from "@/pages/dashboard/experiences";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/experiences/")({
  component: ExperiencesPage
});
