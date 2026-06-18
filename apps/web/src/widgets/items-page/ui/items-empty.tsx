import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

type ItemsEmptyProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function ItemsEmpty({ title, description, action }: ItemsEmptyProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action}
    </Empty>
  );
}
