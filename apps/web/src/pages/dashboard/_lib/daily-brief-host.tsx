"use client";

import { NewspaperIcon } from "lucide-react";

import { Markdown } from "@/shared/ui/markdown";

import {
  clearDailyBriefRequest,
  useDailyBriefHostSelector,
  useEntityFormHostActive,
  useEntityInspectHostActive,
  type DailyBriefHostRequest
} from "@/features/agent-hub";

import { ItemInfoPanel } from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";

export function DailyBriefHost() {
  const request = useDailyBriefHostSelector((state) => state.request);
  const formOpen = useEntityFormHostActive();
  const inspectOpen = useEntityInspectHostActive();
  if (!request || formOpen || inspectOpen) return null;
  return <DailyBriefHostSession key={request.requestId} request={request} />;
}

function DailyBriefHostSession({ request }: { request: DailyBriefHostRequest }) {
  const item = { id: request.requestId };
  const empty = request.inboxCount === 0 && request.mailCount === 0 && request.trackedCount === 0;
  const summary = empty
    ? "Nothing new"
    : [
        request.inboxCount === 1 ? "1 new job" : `${request.inboxCount} new jobs`,
        request.mailCount === 1 ? "1 mail" : `${request.mailCount} mail`,
        request.trackedCount === 1 ? "1 tracked" : `${request.trackedCount} tracked`
      ].join(" · ");

  return (
    <ItemsInspectHost
      open
      item={item}
      title="Today"
      onOpenChange={(open) => {
        if (!open) clearDailyBriefRequest(request.requestId);
      }}
    >
      {() => (
        <ItemInfoPanel
          eyebrow={<NewspaperIcon strokeWidth={1.75} />}
          title="Today"
          description={summary}
        >
          <Markdown allowRawHtml={false} className="prose prose-sm max-w-none dark:prose-invert">
            {request.markdown}
          </Markdown>
        </ItemInfoPanel>
      )}
    </ItemsInspectHost>
  );
}
