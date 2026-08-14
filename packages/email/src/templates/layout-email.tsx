import { type ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text
} from "react-email";

export const EMAIL_CTA_CLASS =
  "rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline";

type EmailLayoutProps = {
  preview: string;
  children: ReactNode;
  /** Small logo at the top of the card (Vercel-invite layout). */
  logoUrl?: string | null;
  logoAlt?: string;
};

/**
 * Shared transactional shell — Vercel invite-user card
 * (https://demo.react.email/preview/Community/notifications/vercel-invite-user).
 * Notification, digest, invite, and auth templates compose this.
 */
export const EmailLayout = ({
  preview,
  children,
  logoUrl,
  logoAlt = "DevHub"
}: EmailLayoutProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind>
      <Body className="mx-auto my-auto bg-white px-2 font-sans">
        <Container className="mx-auto my-10 max-w-116.25 rounded border border-solid border-[#eaeaea] p-5">
          {logoUrl ? (
            <Section className="mt-8">
              <Img
                src={logoUrl}
                width="40"
                height="40"
                alt={logoAlt}
                className="mx-auto my-0 rounded-md"
              />
            </Section>
          ) : null}
          {children}
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

/** Primary black CTA + fallback copy-paste URL. */
export function EmailCta({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Section className="mt-8 mb-8 text-center">
        <Button className={EMAIL_CTA_CLASS} href={href}>
          {label}
        </Button>
      </Section>
      <Text className="text-[14px] leading-6 text-black">
        or copy and paste this URL into your browser:{" "}
        <Link href={href} className="text-blue-600 no-underline">
          {href}
        </Link>
      </Text>
    </>
  );
}

export function EmailFooterNote({ children }: { children: ReactNode }) {
  return (
    <>
      <Hr className="mx-0 my-6.5 w-full border border-solid border-[#eaeaea]" />
      <Text className="text-[12px] leading-6 text-[#666666]">{children}</Text>
    </>
  );
}
