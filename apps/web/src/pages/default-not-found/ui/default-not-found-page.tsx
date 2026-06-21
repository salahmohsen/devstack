import { Link } from "@tanstack/react-router";
import { House } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";

import { ErrorLayout } from "@/shared/ui/error-layout";

export function DefaultNotFoundPage() {
  return (
    <ErrorLayout>
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="mask-b-from-20% mask-b-to-80% text-9xl font-extrabold">
            404
          </EmptyTitle>
          <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
            The page you're looking for might have been <br />
            moved or doesn't exist.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button size="lg" render={<Link to="/" />}>
              <House data-icon="inline-start" />
              Go Home
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </ErrorLayout>
  );
}
