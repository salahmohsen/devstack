import { type IconBaseProps } from "react-icons";

import { type ContactOutput } from "@tsu-stack/core";

import { Icon } from "@/shared/ui/icon";

export const ContactButton = ({
  contact,
  propsIcon
}: {
  contact: ContactOutput;
  propsIcon?: IconBaseProps;
}) => (
  <a
    href={contact.value}
    target="_blank"
    rel="noopener noreferrer"
    className="relative flex aspect-square h-9 w-9 items-center justify-center rounded-md bg-transparent text-foreground/70 outline-1 outline-border/50 transition-all duration-200 ease-in-out hover:bg-accent/50"
    aria-label={contact.type}
  >
    <Icon nameIcon={contact.icon} propsIcon={propsIcon} />
  </a>
);
