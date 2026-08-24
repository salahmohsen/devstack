import { Link } from "@tanstack/react-router";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger
} from "@tsu-stack/ui/components/accordion";
import { cn } from "@tsu-stack/ui/lib/utils";

type FaqItem = {
  id: string;
  title: string;
  content: string;
};

/**
 * Split FAQ — structure from @efferd/faqs-2, AccordionPanel for Base UI/coss.
 */
export function FaqsSection({ className }: { className?: string }) {
  return (
    <section className={cn("min-w-0 border", className)}>
      <div className="grid min-w-0 grid-cols-1 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3 border-b px-4 py-8 sm:px-5 md:border-r md:border-b-0 md:py-10">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Questions
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            Straight answers about invites, keys, adapters, and what shows on your public profile.
          </p>
        </div>
        <div className="min-w-0 place-content-center">
          <Accordion className="w-full rounded-none border-0 border-y" defaultValue={["item-1"]}>
            {questions.map((item) => (
              <AccordionItem className="px-4 sm:px-5" key={item.id} value={item.id}>
                <AccordionTrigger className="py-4 text-left hover:no-underline focus-visible:underline focus-visible:ring-0">
                  {item.title}
                </AccordionTrigger>
                <AccordionPanel className="pb-4 text-muted-foreground">
                  {item.content}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      <div className="flex min-h-12 items-center justify-center border-t px-4 py-3">
        <p className="text-center text-sm text-muted-foreground">
          Ready to try this install?{" "}
          <Link className="text-primary hover:underline" to="/sign-up">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}

const questions: FaqItem[] = [
  {
    id: "item-1",
    title: "What is DEVSTACK?",
    content:
      "A self-hostable job-apply assistant. Discover roles from public boards, track applications, draft packages with a hub agent on your API keys, and publish evidence on /{username}."
  },
  {
    id: "item-2",
    title: "Do I need an invite?",
    content:
      "The first user on an empty database becomes the operator without an invite. After that, signup follows the install's mode: invite-only (default) or open. Super admin manages named invites."
  },
  {
    id: "item-3",
    title: "What are BYO AI keys?",
    content:
      "LLM features use per-tenant provider keys sealed in Settings → AI. There is no platform-funded model budget. Missing keys degrade model steps; CRUD and the rest of the dashboard still work."
  },
  {
    id: "item-4",
    title: "Where do New jobs come from?",
    content:
      "Adapters pull public listings (Freehire, Himalayas, Arbeitnow, Remotive, RemoteOK). Rank against your prefs, then optional BYO AI scoring. Mail harvest is an opt-in channel, not the only source."
  },
  {
    id: "item-5",
    title: "Is Career Inbox required?",
    content:
      "No. You can track jobs and build apply packages without mail. Gmail OAuth (and optional BYO Resend) adds classification and stage moves when you connect it."
  },
  {
    id: "item-6",
    title: "What shows on /{username}?",
    content:
      "Experiences, projects, skills, and resumes you opt in to publish. Path portfolios live on the app host; a verified custom domain can map Host to the same public site."
  },
  {
    id: "item-7",
    title: "Can I run my own install?",
    content:
      "Yes. MIT monorepo on Docker Compose or Dokploy. You terminate TLS for custom domains; the app routes by Host. Seal BYO AI and optional BYO Resend per tenant."
  }
];
