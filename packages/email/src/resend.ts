import { type ReactNode } from "react";
import { render } from "react-email";
import { Resend } from "resend";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

const DEFAULT_FROM = "contact@salahmohsen.com";

export async function sendEmail({
  subject,
  template,
  to
}: {
  subject: string;
  // Accept `ReactNode` rather than `ReactElement` so the Hono JSX
  // `Element` type (which apps/server uses via `jsxImportSource: "hono/jsx"`)
  // is assignable here. `react-email`'s `render()` accepts `ReactNode`.
  template: ReactNode;
  to: string;
}) {
  const from = ENV_SERVER.EMAIL_FROM ?? DEFAULT_FROM;

  if (!ENV_SERVER.RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is not configured; skipping email delivery", {
      subject,
      to
    });
    return;
  }

  const resend = new Resend(ENV_SERVER.RESEND_API_KEY);

  const html = await render(template);

  const { data, error } = await resend.emails.send({
    from,
    html,
    subject,
    to
  });

  if (error) {
    console.error("[email] Failed to send email", { subject, to, error });
    throw error;
  }

  console.info("[email] sent", {
    subject,
    to,
    from,
    id: data?.id ?? null
  });

  return data;
}
