import { ProgressProvider as RawProgressProvider, useProgress } from "@bprogress/react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

function ProgressBarSubscriber() {
  const router = useRouter();
  const { start, stop } = useProgress();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const clearAndStop = () => {
      isNavigatingRef.current = false;
      stop();
    };

    // No delayed setTimeout: nested timers are hard for effect-cleanup analysis,
    // and bprogress is cheap when navigation is already fast.
    const unsubBeforeLoad = router.subscribe("onBeforeLoad", ({ pathChanged }) => {
      if (!pathChanged) return;
      isNavigatingRef.current = true;
      if (router.state.isLoading) {
        start();
      }
    });

    const unsubResolved = router.subscribe("onResolved", clearAndStop);

    return () => {
      unsubBeforeLoad();
      unsubResolved();
      stop();
    };
  }, [router, start, stop]);

  return null;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <RawProgressProvider color="var(--color-primary)" options={{ showSpinner: false }}>
      <ProgressBarSubscriber />
      {children}
    </RawProgressProvider>
  );
}
