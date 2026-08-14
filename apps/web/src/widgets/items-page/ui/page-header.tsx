import {
  CardDescription,
  CardFrame,
  CardFrameAction,
  CardFrameHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <CardFrame>
      <div className="me-5 flex items-center justify-between gap-4">
        <CardFrameHeader className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardFrameHeader>
        {actions ? <CardFrameAction className="shrink-0">{actions}</CardFrameAction> : null}
      </div>
    </CardFrame>
  );
}
