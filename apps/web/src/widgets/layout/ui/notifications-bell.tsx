"use client";

import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { BellIcon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation
} from "@/features/notifications";

export function NotificationsBell() {
  const listQuery = useListNotificationsQuery({ limit: 20 }, { refetchInterval: 60_000 });
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  const items = listQuery.data?.items ?? [];
  const unreadCount = listQuery.data?.unreadCount ?? 0;

  return (
    <Menu>
      <span className="relative inline-flex size-8 shrink-0">
        <MenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative size-8 overflow-visible"
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
              }
            />
          }
        >
          <BellIcon className="size-4" aria-hidden />
        </MenuTrigger>
        <span className="t-badge" data-open={unreadCount > 0 ? "true" : "false"}>
          <span className="t-badge-dot size-4 min-w-4 rounded-full border-0 bg-brand p-0 font-semibold text-zinc-950 shadow-none ring-1 ring-background before:hidden after:hidden">
            <span className="flex size-full items-center justify-center text-[9px] leading-none font-semibold tabular-nums">
              {unreadCount > 9 ? "9+" : unreadCount || 0}
            </span>
          </span>
        </span>
      </span>
      <MenuPopup align="end" className="w-80 p-0">
        <MenuGroup>
          <MenuGroupLabel className="flex items-center justify-between gap-2 py-2">
            <span>Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  markAll.mutate({});
                }}
              >
                Mark all read
              </button>
            ) : null}
          </MenuGroupLabel>
        </MenuGroup>
        <MenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {listQuery.isLoading ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : listQuery.isError ? (
            <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">Couldn’t load notifications.</p>
              <button
                type="button"
                className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => void listQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul>
              {items.map((item) => {
                const unread = item.readAt == null;
                const content = (
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "line-clamp-1 text-sm",
                        unread ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {unread ? <span className="sr-only">Unread. </span> : null}
                      {item.title}
                    </span>
                    {item.body ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {item.body}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                );

                return (
                  <li key={item.id} className="border-b border-border/50 last:border-0">
                    {item.href ? (
                      <MenuItem
                        className="items-start gap-2 py-2.5"
                        render={<Link to={item.href} />}
                        onClick={() => {
                          if (unread) markRead.mutate({ id: item.id });
                        }}
                      >
                        {unread ? (
                          <span
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-1.5 size-1.5 shrink-0" aria-hidden />
                        )}
                        {content}
                      </MenuItem>
                    ) : (
                      <MenuItem
                        className="items-start gap-2 py-2.5"
                        onClick={() => {
                          if (unread) markRead.mutate({ id: item.id });
                        }}
                      >
                        {unread ? (
                          <span
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-1.5 size-1.5 shrink-0" aria-hidden />
                        )}
                        {content}
                      </MenuItem>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </MenuPopup>
    </Menu>
  );
}
