import { type ComponentType } from "react";

type IconComponent = ComponentType<{ className?: string }>;

function createIcon(path: string, viewBox = "0 0 24 24"): IconComponent {
  return function Icon({ className }: { className?: string }) {
    return (
      <svg
        className={className}
        width="16"
        height="16"
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    );
  };
}

export const DashboardIcon = createIcon("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");

export const ArchiveIcon = createIcon("M21 8v13H3V8M1 3h22v5H1zM10 12h4");

export const GitPullRequestIcon = createIcon(
  "M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-8-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 21V6"
);

export const IssuesIcon = createIcon("M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zM12 8v4M12 16h.01");

export const ReviewsIcon = createIcon(
  "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
);

export const SettingsIcon = createIcon(
  "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
);

export const ExternalLinkIcon = createIcon(
  "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
);

export const CodeIcon = createIcon("M16 18l6-6-6-6M8 6l-6 6 6 6");

export const GitMergeIcon = createIcon(
  "M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-6-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 21V6"
);

export const GitPullRequestClosedIcon = createIcon(
  "M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-8-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 21V6M3 3l6 6M9 3l-6 6"
);

export const GitPullRequestDraftIcon = createIcon(
  "M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-8-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 21V6M18 2v4M18 10v.01"
);

export const RefreshCwIcon = createIcon(
  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
);

export const UserCircleIcon = createIcon(
  "M5.52 19.36a7.5 7.5 0 0 1 12.96 0M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm0 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
);
