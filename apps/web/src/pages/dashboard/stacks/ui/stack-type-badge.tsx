import { formatStackTypeLabel } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";

const TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "info" | "success" | "warning" | "error"
> = {
  framework: "default",
  language: "info",
  database: "success",
  ui: "secondary",
  auth: "warning",
  deployment: "outline",
  testing: "error",
  ai: "info",
  tooling: "secondary",
  storage: "success",
  other: "outline"
};

export function StackTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant={TYPE_VARIANTS[type] ?? "outline"} size="sm">
      {formatStackTypeLabel(type)}
    </Badge>
  );
}

export function StackIdentityBadges({
  type,
  isFeatured,
  projectCount
}: {
  type?: string | null;
  isFeatured?: boolean;
  projectCount?: number;
}) {
  const usage = projectCount ?? 0;
  if (!type && !isFeatured && usage <= 0) return null;
  return (
    <>
      {type ? <StackTypeBadge type={type} /> : null}
      {isFeatured ? (
        <Badge variant="brand" size="sm">
          Featured
        </Badge>
      ) : null}
      {usage > 0 ? (
        <Badge variant="outline" size="sm">
          {usage} {usage === 1 ? "project" : "projects"}
        </Badge>
      ) : null}
    </>
  );
}
