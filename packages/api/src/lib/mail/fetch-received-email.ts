/**
 * Fetch full inbound email body from Resend Received emails API (BYO key).
 * Webhooks only carry metadata — body requires a follow-up GET.
 *
 * @see https://resend.com/docs/dashboard/receiving/get-email-content
 */
export type ReceivedEmailContent = {
  html: string | null;
  text: string | null;
  headers: Record<string, string> | null;
};

export async function fetchReceivedEmailContent(input: {
  apiKey: string;
  emailId: string;
}): Promise<ReceivedEmailContent | null> {
  const response = await fetch(`https://api.resend.com/emails/receiving/${input.emailId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    html?: string | null;
    text?: string | null;
    headers?: Record<string, string> | null;
    data?: {
      html?: string | null;
      text?: string | null;
      headers?: Record<string, string> | null;
    };
  };

  // SDK shapes sometimes nest under `data`; tolerate both.
  const body = json.data ?? json;
  return {
    html: body.html ?? null,
    text: body.text ?? null,
    headers: body.headers ?? null
  };
}
