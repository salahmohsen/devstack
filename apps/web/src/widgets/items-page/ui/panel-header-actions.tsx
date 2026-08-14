import { PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

export function PanelCancelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      Cancel
    </Button>
  );
}

export function PanelEditButton({
  onClick,
  label = "Edit"
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <PencilIcon aria-hidden />
      {label}
    </Button>
  );
}

export function PanelDeleteButton({
  onClick,
  label = "Delete",
  loading = false,
  disabled = false
}: {
  onClick: () => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="destructive-outline"
      loading={loading}
      disabled={disabled}
      onClick={onClick}
    >
      <Trash2Icon aria-hidden />
      {label}
    </Button>
  );
}
