import { Link } from "@tanstack/react-router";
import { House, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { log } from "@tsu-stack/logger/client";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import { IconRotate } from "@tsu-stack/ui/components/icon-motion";

import { ErrorLayout } from "@/shared/ui/error-layout";

const loggedErrorKeys = new Set<string>();

export function DefaultErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    const errorKey = `${error.name}:${error.message}:${error.stack ?? ""}`;

    if (loggedErrorKeys.has(errorKey)) {
      return;
    }

    loggedErrorKeys.add(errorKey);

    log.error({
      action: "global_error_boundary",
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      }
    });
  }, [error]);

  const handleRefresh = () => {
    reset();
  };

  // Could also send to external service
  // sendErrorToService(error)

  return (
    <ErrorLayout>
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="mask-b-from-20% mask-b-to-80% text-9xl font-extrabold">
            500
          </EmptyTitle>
          <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
            An unexpected error has occurred. <br />
            Please try refreshing the page, or go back home.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button
              render={
                <Link to="/">
                  <House data-icon="inline-start" />
                  Go Home
                </Link>
              }
            />

            <Button onClick={handleRefresh} variant="outline">
              <IconRotate mode="hover">
                <RefreshCw data-icon="inline-start" />
              </IconRotate>
              Try Again
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </ErrorLayout>
  );
}
