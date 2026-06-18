import { type ComponentType } from "react";

import { type LinkProps, Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { ChevronRightIcon } from "@tsu-stack/icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "@tsu-stack/ui/components/sidebar";

type RouteTo = Exclude<LinkProps["to"], undefined>;

type NavLeafItem = {
  title: string;
  url: RouteTo;
  icon?: ComponentType<{ className?: string }>;
};

type NavGroupItem = {
  icon?: ComponentType<{ className?: string }>;
  items: ReadonlyArray<NavLeafItem>;
  title: string;
};

type NavSection = {
  items: ReadonlyArray<NavGroupItem | NavLeafItem>;
  label: string;
};

export function NavMain({
  currentPath,
  sections
}: {
  currentPath: string;
  sections: readonly NavSection[];
}) {
  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.label}>
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map((item) => {
              if ("items" in item) {
                const isActive = item.items.some(
                  (subItem) =>
                    currentPath === subItem.url || currentPath.startsWith(`${subItem.url}/`)
                );

                return (
                  <Collapsible
                    className="group/collapsible"
                    defaultOpen={isActive}
                    key={item.title}
                    render={<SidebarMenuItem />}
                  >
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.title}
                          className="rounded-xs"
                        />
                      }
                    >
                      {item.icon ? <item.icon /> : null}
                      <span>{item.title}</span>
                      <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              isActive={currentPath === subItem.url}
                              render={<Link to={subItem.url} />}
                              className="rounded-xs"
                            >
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              const isActive = currentPath === item.url || currentPath.startsWith(`${item.url}/`);

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    className="rounded-xs"
                    render={<Link to={item.url} />}
                    tooltip={item.title}
                  >
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
