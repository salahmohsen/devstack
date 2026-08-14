import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Button } from "@tsu-stack/ui/components/button";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";

import { useLogger } from "@/shared/providers/logger.provider";
import { Container } from "@/shared/ui/container";
import { Image } from "@/shared/ui/image";

export function PlaygroundPage() {
  const healthCheck = useQuery(orpcQueryClient.health.live.queryOptions());
  const isClient = useIsClient();
  const logger = useLogger();

  return (
    <Container>
      <section className="mb-8">
        <h2 className="mb-8 text-4xl">Image Optimization</h2>
        <div className="mb-4 h-64 overflow-hidden rounded-lg">
          <Image
            width={736}
            height={736}
            quality={20}
            priority
            className="size-full object-cover"
            src="/img/bg.jpg"
            alt="Background"
            placeholder="blur"
          />
        </div>
        <a
          href="https://www.freepik.com/free-photo/natural-background-with-bright-orange-flowers-foliage_29320322.htm#fromView=search&page=2&position=2&uuid=9d458c3a-fcfb-4920-9494-09b6b6ad3d5a&query=orange+flowers+landscape"
          className="text-sm text-muted-foreground hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Image by pvproductions on Freepik
        </a>
      </section>
      <section className="mb-8">
        <h2 className="mb-8 text-4xl">Test RPC</h2>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium">API Status</h3>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isClient && healthCheck.data && !healthCheck.isLoading ? `bg-success` : `bg-destructive`}`}
            />
            <span className="text-sm text-muted-foreground">
              {!isClient || healthCheck.isLoading
                ? "Checking..."
                : healthCheck.data
                  ? "Connected"
                  : "Disconnected"}
            </span>
          </div>
        </div>
      </section>
      <section className="mb-8">
        <h2 className="mb-8 text-4xl">Test Error Handling</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              logger.debug("playground", "Throwing test error from playground page...");
              throw new Error("Test error");
              // oxlint-disable-next-line no-unreachable
              logger.debug("playground", "Error thrown!");
            }}
          >
            Throw Error
          </Button>
          <Button variant="secondary" onClick={() => toast("Default toast")}>
            Default
          </Button>
          <Button
            variant="success"
            onClick={() => toast.success("Saved", { description: "Changes are live." })}
          >
            Success
          </Button>
          <Button
            variant="error"
            onClick={() => toast.error("Failed", { description: "Please try again." })}
          >
            Error
          </Button>
          <Button
            variant="info"
            onClick={() => toast.info("Heads up", { description: "This is informational." })}
          >
            Info
          </Button>
          <Button
            variant="warning"
            onClick={() => toast.warning("Careful", { description: "This needs a look." })}
          >
            Warning
          </Button>
          <Button
            variant="warning"
            onClick={() => {
              const id = toast.loading("Working…", { description: "This may take a moment." });
              window.setTimeout(() => {
                toast.success("Done", { id, description: "Finished the job." });
              }, 1800);
            }}
          >
            Loading
          </Button>
          <Button variant="outline" render={<Link to="/privacy-policy" />}>
            Visit Privacy Policy
          </Button>
        </div>
      </section>
    </Container>
  );
}
