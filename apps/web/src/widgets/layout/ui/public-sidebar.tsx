import {
  Sidebar001,
  Sidebar001Content,
  Sidebar001Footer,
  Sidebar001Item,
  Sidebar001Section
} from "@tsu-stack/ui/components/unlumen-ui/sidebar-001";

import { useIntersection } from "@/shared/providers/intersection.provider";
import { ContactButton, contactData } from "@/shared/ui/contact-button";

const navItems = [
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Experience" },
  { href: "#certificates", label: "Certificates" },
  {
    href: "/salahmohsen_frontend_resume.pdf",
    label: "Full Résumé",
    isExternal: true
  }
] as const;

export function PublicSidebar() {
  const { sectionIntersectedName, isIntersecting } = useIntersection();

  return (
    <Sidebar001 defaultWidth={190}>
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
          {contactData.map((item) => (
            <ContactButton key={item.id} contact={item.name} username={item.username} />
          ))}
        </div>
      </Sidebar001Footer>
    </Sidebar001>
  );
}
