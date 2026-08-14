import { type ContactOutput } from "@tsu-stack/core";

import { ContactIcon } from "@/shared/lib/contact-icon";

export const ContactButton = ({
  contact,
  className
}: {
  contact: ContactOutput;
  className?: string;
}) => (
  <a
    href={contact.value}
    target="_blank"
    rel="noopener noreferrer"
    className="relative flex aspect-square h-9 w-9 items-center justify-center rounded-md bg-transparent text-foreground/70 outline-1 outline-border/50 transition-colors duration-200 ease-in-out hover:bg-accent/50"
    aria-label={contact.type}
  >
    <ContactIcon type={contact.type} className={className} />
  </a>
);
