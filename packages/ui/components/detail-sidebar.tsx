import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";

type DetailRowIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

export function DetailSidebar({ children }: { children: React.ReactNode }) {
  return <aside className="flex h-fit flex-col gap-6 xl:sticky xl:top-10">{children}</aside>;
}

export function DetailSidebarSection({
  title,
  titleRight,
  children
}: {
  title: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
        {titleRight != null ? (
          <span className="shrink-0 text-xs font-normal tracking-normal text-muted-foreground tabular-nums">
            {titleRight}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function DetailSidebarRow({
  icon: Icon,
  label,
  children
}: {
  icon?: DetailRowIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon size={13} strokeWidth={2} /> : null}
        {label}
      </span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

export function DetailParticipantAvatars({
  actors
}: {
  actors: Array<{
    login: string;
    avatarUrl: string;
  }>;
}) {
  return (
    <div className="group/participants flex flex-wrap items-center">
      {actors.map((actor, index) => (
        <Tooltip key={actor.login}>
          <TooltipTrigger
            render={
              <a
                href={`https://github.com/${actor.login}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={actor.login}
                style={index > 0 ? { marginLeft: -6 } : undefined}
                className="relative block transition-[margin] duration-200 group-hover/participants:ml-0"
              />
            }
          >
            <img
              src={actor.avatarUrl}
              alt={actor.login}
              className="size-6 rounded-full border-2 border-card"
            />
          </TooltipTrigger>
          <TooltipContent>{actor.login}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
