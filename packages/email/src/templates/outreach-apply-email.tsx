import {
  render,
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text
} from "react-email";

type MailContactLine = { text: string; href: string | null };

export type OutboundApplyEmailProps = {
  /** Applicant's name for the <Preview> preheader. */
  previewName?: string;
  mail: {
    subject: string;
    paragraphs: string[];
    senderName: string;
    contactLines: MailContactLine[];
  };
};

/**
 * Generic Matte text-only letter for first-apply outreach (spec: belongs to
 * the applicant — no product logo, no marketing footer, no unsubscribe).
 * Structure must mirror apps/web `OutboundMailPreview` (shared
 * `outreachMailModel` in core is the parity source).
 */
export const OutboundApplyEmail = ({ previewName, mail }: OutboundApplyEmailProps) => {
  const previewSender = previewName ?? mail.senderName;
  return (
    <Tailwind
      config={{
        plugins: [
          {
            handler: (api) => {
              api.addUtilities({
                ".font-11": { fontSize: "11px", lineHeight: "1.5", fontWeight: "300" },
                ".font-13": { fontSize: "13px", lineHeight: "1.6", fontWeight: "400" },
                ".font-30": { fontSize: "30px", lineHeight: "1.1", letterSpacing: "-0.02em" }
              });
            }
          }
        ],
        theme: {
          extend: {
            colors: {
              canvas: "#f6f6f5",
              card: "#ffffff",
              fg: "#1a1a1a",
              "fg-2": "#525252",
              "fg-3": "#8a8a8a",
              stroke: "#e4e4e4"
            },
            fontFamily: {
              sans: ["Inter", "Arial", "Helvetica", "sans-serif"]
            }
          }
        }
      }}
    >
      <Html>
        <Head />
        <Body className="bg-canvas m-0 p-0 font-sans">
          <Preview>
            {mail.subject} — {previewSender ? previewSender : "job application"}
          </Preview>
          <Container className="mx-auto max-w-150 px-4 py-10">
            <Section className="border-stroke rounded-[10px] border bg-card px-9 py-8">
              <Text className="font-30 text-fg m-0">{mail.subject}</Text>
              <Section className="mt-4">
                {mail.paragraphs.map((paragraph, index) => (
                  <Text key={index} className="font-13 text-fg-2 m-0 mt-4 whitespace-pre-wrap">
                    {paragraph}
                  </Text>
                ))}
              </Section>
              <Text className="font-13 text-fg-2 m-0 mt-4">
                Warmly,
                <br />
                <span className="text-fg">{mail.senderName}</span>
              </Text>
            </Section>
            {mail.contactLines.length > 0 ? (
              <Section className="mt-3 px-2">
                <Text className="font-11 text-fg-3 m-0">
                  {mail.contactLines.map((line, index) => (
                    <span key={line.text}>
                      {index > 0 ? " · " : ""}
                      {line.href ? (
                        <Link href={line.href} className="text-fg-3 no-underline">
                          {line.text}
                        </Link>
                      ) : (
                        line.text
                      )}
                    </span>
                  ))}
                </Text>
              </Section>
            ) : null}
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

OutboundApplyEmail.PreviewProps = {
  mail: {
    subject: "Senior Frontend Engineer — Maya Okafor",
    paragraphs: ["Dear Nadia,", "I'm applying for the role."],
    senderName: "Maya Okafor",
    contactLines: [{ text: "mayokafor.dev", href: "https://mayokafor.dev" }]
  }
} satisfies OutboundApplyEmailProps;

export default OutboundApplyEmail;

/** Node-safe HTML render of the outbound apply mail (API consumes this — never react-email directly). */
export async function renderOutreachApplyEmailHtml(
  mail: OutboundApplyEmailProps["mail"],
  previewName?: string
): Promise<string> {
  return render(<OutboundApplyEmail mail={mail} previewName={previewName} />);
}
