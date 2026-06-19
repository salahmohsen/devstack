import { type ReactNode } from "react";
import { Body, Container, Head, Html, Preview, Section, Tailwind } from "react-email";

type EmailLayoutProps = {
  preview: string;
  children: ReactNode;
};

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto max-w-xl px-4 py-8">
          <Section className="border-gray-200 rounded-lg border bg-white p-6 shadow-sm">
            {children}
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
