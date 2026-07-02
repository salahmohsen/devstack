import { Plus } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

type ProjectItemAddButtonProps = {
  onAdd?: () => void;
};

export function ProjectItemAddButton({ onAdd }: ProjectItemAddButtonProps) {
  return (
    <Button onClick={onAdd}>
      <Plus />
      Add Project
    </Button>
  );
}
