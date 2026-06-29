import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

export function StackItemAddButton() {
  return (
    <Button nativeButton={false} render={<Link to="/dashboard/stacks/new" />}>
      <Plus />
      Add Stack
    </Button>
  );
}
