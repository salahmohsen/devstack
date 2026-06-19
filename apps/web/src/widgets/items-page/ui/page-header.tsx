import { Card, CardDescription, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { Separator } from "@tsu-stack/ui/components/separator";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <>
      <Card className="flex-row justify-between rounded-none bg-transparent pt-0 ring-0">
        <CardHeader className="flex-1 gap-0 px-0">
          <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
          {description ? (
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </Card>
      <Separator />
    </>
  );
}
