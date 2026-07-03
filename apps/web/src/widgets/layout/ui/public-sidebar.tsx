import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  Sidebar001,
  Sidebar001Content,
  Sidebar001Footer,
  Sidebar001Item,
  Sidebar001Section
} from "@tsu-stack/ui/components/unlumen-ui/sidebar-001";

import { useIntersection } from "@/shared/providers/intersection.provider";
import { ContactButton } from "@/shared/ui/contact-button";

const navItems = [
  { href: "/", label: "Portfolio" },
  { href: "/repos", label: "Repositories" }
] as const;

export function PublicSidebar() {
  const { sectionIntersectedName, isIntersecting } = useIntersection();
  const contacts = useQuery(orpcQueryClient.profile.getContacts.queryOptions());

  return (
    <Sidebar001>
      <Sidebar001Content>
        <Sidebar001Section>
          {navItems.map((item) => (
            <Sidebar001Item
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={
                "isExternal" in item
                  ? false
                  : sectionIntersectedName === item.href && isIntersecting
              }
            />
          ))}
        </Sidebar001Section>
      </Sidebar001Content>
      <Sidebar001Footer>
        <div className="flex justify-center gap-2">
          {contacts.data?.map((contact) => (
            <ContactButton key={contact.createdAt.toISOString()} contact={contact} />
          ))}
        </div>
      </Sidebar001Footer>
    </Sidebar001>
  );
}
