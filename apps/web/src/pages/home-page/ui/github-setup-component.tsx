import { Link } from "@tanstack/react-router";

import { Button } from "@tsu-stack/ui/components/button";
import { Container } from "@tsu-stack/ui/components/container";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";

export function GithubProfileUnavailableState() {
  return (
    <Container className="py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>GitHub profile is temporarily unavailable</EmptyTitle>
          <EmptyDescription>
            The public GitHub data for the homepage could not be loaded. Verify the configured
            GitHub username and token in the dashboard, then try again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/dashboard/settings/github" />}>Open GitHub config</Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}
