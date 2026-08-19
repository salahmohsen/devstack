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
        {/*
          Keep title+description in one column. CardFrameHeader becomes a
          2-col grid when an action is present; unwrapped description would
          auto-place into column 2 beside the title.
        */}
        <div className="col-start-1 row-span-2 row-start-1 flex min-w-0 flex-col gap-1 self-center">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? (
          <CardFrameAction
            className={
              // Mobile: full-width row under title. md+: side column, end-aligned.
              "col-span-full col-start-1 mt-5 w-full flex-col gap-4 self-start justify-self-start nth-2:row-span-1 nth-2:row-start-auto md:col-span-1 md:col-start-2 md:mt-0 md:w-auto md:flex-row md:gap-2 md:self-center md:justify-self-end md:nth-2:row-span-2 md:nth-2:row-start-1"
            }
          >
            {actions}
          </CardFrameAction>
        ) : null}
      </CardFrameHeader>
    </CardFrame>
  );
}
