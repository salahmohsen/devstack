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
      <div className="me-5 flex items-center justify-between">
        <CardFrameHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardFrameHeader>
        {actions ? <CardFrameAction>{actions}</CardFrameAction> : null}
      </div>
    </CardFrame>
  );
}
