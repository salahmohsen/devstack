import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

export function ProjectItemAddButton() {
  return (
    <Button render={<Link to="/dashboard/projects/new" />}>
      <Plus />
      Add Project
    </Button>
  );
}
