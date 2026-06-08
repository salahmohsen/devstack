import { type RouterClient } from "@orpc/server";

import { appSettingsRouter } from "#@/routers/app-settings/index";
import { healthRouter } from "#@/routers/health/index";
import { privateRouter } from "#@/routers/private/index";
import { publicRouter } from "#@/routers/public/index";

export const appRouter = {
  appSettings: appSettingsRouter,
  health: healthRouter,
  private: privateRouter,
  public: publicRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
