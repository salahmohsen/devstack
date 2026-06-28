import { contactData, ContactButton } from "@/shared/ui/contact-button";

export const Contact = () => (
  <div className="absolute bottom-0 flex w-full justify-center gap-2">
    {contactData.map((item) => (
      <ContactButton key={item.id} contact={item.name} username={item.username} />
    ))}
  </div>
);
