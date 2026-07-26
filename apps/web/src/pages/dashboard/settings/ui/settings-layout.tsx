import { Link, Outlet, useLocation } from "@tanstack/react-router";

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

      <Tabs value={activeTab} className="space-y-5">
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
        </TabsList>
        <Outlet />
      </Tabs>
    </PageLayout>
  );
};
