import {
  generateTanStackStartSeo,
  type GenerateTanStackStartSeoParams,
  type TanStackStartSeoSite
} from "@tsu-stack/seo";

import { appConfig } from "@/config/app.config";

const site = {
  applicationName: appConfig.site.shortName,
  baseUrl: appConfig.site.baseUrl,
  defaultDescription: appConfig.site.description,
  defaultImages: [
    {
      alt: appConfig.site.shortName,
      height: 630,
      type: "image/png",
      url: `${appConfig.site.baseUrl}/og/index.png`,
      width: 1200
    }
  ],
  defaultTitle: appConfig.site.shortName,
  siteName: appConfig.site.shortName,
  titleTemplate: `%s | ${appConfig.site.shortName}`
} satisfies TanStackStartSeoSite;

type AppSeoOptions = Omit<GenerateTanStackStartSeoParams, "site">;

export function generateAppSeo(options: AppSeoOptions) {
  return generateTanStackStartSeo({
    ...options,
    site
  });
}
