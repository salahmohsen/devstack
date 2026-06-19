import { type ReactElement } from "react";
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
  template: ReactElement;
  to: string;
}) {
  const from = ENV_SERVER.EMAIL_FROM ?? DEFAULT_FROM;

  if (!ENV_SERVER.RESEND_API_KEY) {
    console.debug("RESEND_API_KEY is not configured; skipping email delivery", {
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
    console.debug("Failed to send email", { subject, to, error });
    throw error;
  }

  return data;
}
