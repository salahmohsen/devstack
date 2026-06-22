import { FaWhatsapp } from "react-icons/fa";
import {
  RiFacebookLine,
  RiGithubLine,
  RiInstagramLine,
  RiLinkedinLine,
  RiMailLine,
  RiTwitterLine
} from "react-icons/ri";

type ContactName = keyof typeof socialIcons;

type ContactItem = {
  id: number;
  name: ContactName;
  username: string;
};

const socialIcons = {
  facebook: RiFacebookLine,
  github: RiGithubLine,
  instagram: RiInstagramLine,
  linkedin: RiLinkedinLine,
  mail: RiMailLine,
  twitter: RiTwitterLine,
  whatsapp: FaWhatsapp
} as const;

function contactUrl(name: ContactName, username: string): string {
  const urls: Record<ContactName, string> = {
    facebook: `https://www.facebook.com/${username}`,
    github: `https://www.github.com/${username}`,
    instagram: `https://www.instagram.com/${username}`,
    linkedin: `https://www.linkedin.com/in/${username}`,
    mail: `mailto:${username}`,
    twitter: `https://www.twitter.com/${username}`,
    whatsapp: `https://wa.me/2${username}`
  };
  return urls[name];
}

export const contactData: ContactItem[] = [
  { id: 1, name: "github", username: "salahmohsen" },
  { id: 2, name: "linkedin", username: "salahmohsen" },
  { id: 3, name: "whatsapp", username: "01025295958" },
  { id: 4, name: "mail", username: "contact@salahmohsen.com" }
];

export const Contact = () => (
  <div className="absolute bottom-0 flex w-full justify-center gap-2">
    {contactData.map((item) => (
      <ContactButton key={item.id} contact={item.name} username={item.username} />
    ))}
  </div>
);

export const ContactButton = ({
  contact,
  username
}: {
  contact: ContactName;
  username: string;
}) => {
  const Icon = socialIcons[contact];
  const url = contactUrl(contact, username);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative flex aspect-square h-9 w-9 items-center justify-center rounded-md bg-transparent text-foreground/70 outline outline-1 outline-border/50 transition-all duration-200 ease-in-out hover:bg-accent/50"
      aria-label={contact}
    >
      <Icon />
    </a>
  );
};
