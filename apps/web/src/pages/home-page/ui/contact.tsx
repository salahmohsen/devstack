import { type ContactOutput } from "@tsu-stack/core";

import { ContactButton } from "@/shared/ui/contact-button";

export const Contact = ({ contacts }: { contacts: ContactOutput[] }) => (
  <div className="absolute bottom-0 flex w-full justify-center gap-2">
    {contacts.map((contact) => (
      <ContactButton key={contact.type} contact={contact} />
    ))}
  </div>
);
