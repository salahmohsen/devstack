import { Plus } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

type StackItemAddButtonProps = {
  onAdd: () => void;
};

export function StackItemAddButton({ onAdd }: StackItemAddButtonProps) {
  return (
    <Button onClick={onAdd}>
      <Plus />
      Add Stack
    </Button>
  );
}
