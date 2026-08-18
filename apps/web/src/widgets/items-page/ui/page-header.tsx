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
      <CardFrameHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {actions ? (
          <CardFrameAction
            className={
              // Mobile: full-width row under title. md+: restore side column
              // (col-start-2, span both title+description rows, end-aligned).
              "col-span-full col-start-1 mt-5 w-full flex-col gap-4 self-start justify-self-start nth-3:row-span-1 nth-3:row-start-auto md:col-span-1 md:col-start-2 md:mt-0 md:w-auto md:flex-row md:gap-2 md:self-center md:justify-self-end md:nth-3:row-span-2 md:nth-3:row-start-1"
            }
          >
            {actions}
          </CardFrameAction>
        ) : null}
      </CardFrameHeader>
    </CardFrame>
  );
}
