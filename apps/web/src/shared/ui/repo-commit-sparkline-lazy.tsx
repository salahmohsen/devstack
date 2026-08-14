import { lazy, Suspense, useEffect, useRef, useState } from "react";

const RepoCommitSparkline = lazy(() =>
  import("@/shared/ui/repo-commit-sparkline").then((m) => {
    return { default: m.RepoCommitSparkline };
  })
);

const DEFAULT_PLACEHOLDER_CLASSES = "h-13 w-42 shrink-0 rounded-sm bg-muted/15";

export function LazyRepoCommitSparkline({
  username,
  repo,
  placeholderClassName
}: {
  username: string;
  repo: string;
  placeholderClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowChart(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px", threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const placeholder = (
    <div className={placeholderClassName ?? DEFAULT_PLACEHOLDER_CLASSES} aria-hidden />
  );

  return (
    <div ref={containerRef} className="flex items-start justify-end">
      {showChart ? (
        <Suspense fallback={placeholder}>
          <RepoCommitSparkline username={username} repo={repo} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
