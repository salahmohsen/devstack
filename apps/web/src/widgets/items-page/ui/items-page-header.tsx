import { Card, CardDescription, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";

type ItemsPageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function ItemsPageHeader({ title, description, actions }: ItemsPageHeaderProps) {
  return (
    <Card className="flex-row justify-between bg-transparent ring-0">
      <CardHeader className="flex-1 gap-0 px-0">
        <CardTitle className="text-2xl font-medium tracking-tight">{title}</CardTitle>
        {description ? (
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </Card>
  );
}
