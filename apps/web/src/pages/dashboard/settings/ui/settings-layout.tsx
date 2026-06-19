import { Outlet, useLocation } from "@tanstack/react-router";

import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Tabs, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";

import { PageHeader, PageLayout } from "@/widgets/items-page";

export const SettingsLayout = () => {
  const activeTab = useLocation({
    select: (location) =>
      location.pathname.split("/").at(-1) === "settings"
        ? "profile"
        : location.pathname.split("/").at(-1)
  });

  return (
    <PageLayout>
      <PageHeader
        title="Settings"
        description="Manage your account settings and set e-mail preferences."
      />

      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger
            nativeButton={false}
            value="profile"
            render={<Link to={"/dashboard/settings/profile"} />}
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="account"
            nativeButton={false}
            render={<Link to={"/dashboard/settings/account"} />}
          >
            Account
          </TabsTrigger>
          <TabsTrigger
            value="github"
            nativeButton={false}
            render={<Link to={"/dashboard/settings/github"} />}
          >
            Github
          </TabsTrigger>
        </TabsList>
        <Outlet />
      </Tabs>
    </PageLayout>
  );
};
