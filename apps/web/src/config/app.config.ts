import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

const emailSupport = `contact@${new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).host}`;

// We load it in vite.config.ts because they are originally from ENV_WEB_SERVER variables
declare const __BUILD_SOURCE_COMMIT__: string;

export const appConfig = Object.freeze({
  site: {
    author: "Salah Mohsen",
    basePath: new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname,
    baseUrl: new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).origin,
    description:
      "Self-hostable job-apply assistant: discover roles, track applications, draft packages with a hub agent on your keys, and publish evidence on /{username}.",
    emailSupport,
    jurisdictionCountry: "Egypt",
    longName: "DEVSTACK",
    serverLocation: "Japan",
    shortName: "DEVSTACK",
    url: ENV_WEB_ISOMORPHIC.VITE_WEB_URL,
    version: __BUILD_SOURCE_COMMIT__
  }
});
