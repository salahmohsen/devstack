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
            Public GitHub data could not be loaded. The portfolio owner should sign in with GitHub
            so the server can use a valid OAuth token (tokens stay on the server and never reach
            visitors).
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/sign-in" />}>Sign in with GitHub</Button>
        </EmptyContent>
      </Empty>
    </Container>
  );
}
