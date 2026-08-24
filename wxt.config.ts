import { defineConfig } from "wxt";
import "dotenv/config";

import { author, version, homepage } from "./package.json";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  srcDir: "src",
  entrypointsDir: "contexts",
  modules: ["@wxt-dev/module-react"],
  imports: {
    imports: [
      { name: "logger", from: "@/common/logger" },
      { name: "default", as: "clsx", from: "clsx" },
      { name: "default", as: "React", from: "react" },
      { name: "default", as: "$", from: "jquery" },
    ],
  },
  vite: ({ mode }) => ({
    css: {
      modules: {
        localsConvention: "camelCase",
      },
    },
    esbuild: {
      target: "es2020",
    },
    build: {
      minify: mode === "production" ? "terser" : false,
    },
    define:
      mode === "production"
        ? {}
        : {
            "import.meta.env.MG_EMAIL": JSON.stringify(process.env.MG_EMAIL),
            "import.meta.env.MG_PASSWORD": JSON.stringify(
              process.env.MG_PASSWORD
            ),
          },
  }),
  define: {
    "import.meta.env.PKG_VERSION": JSON.stringify(version),
    "import.meta.env.PKG_HOMEPAGE": JSON.stringify(homepage),
    "import.meta.env.PKG_AUTHOR": JSON.stringify(author),
    "import.meta.env.SERVICE_TIMEOUT": JSON.stringify(
      process.env.FMG_SERVICE_TIMEOUT ?? 60000
    ),
    "import.meta.env.FIREBASE_API_KEY": JSON.stringify(
      process.env.FIREBASE_API_KEY ?? ""
    ),
    "import.meta.env.FIREBASE_AUTH_DOMAIN": JSON.stringify(
      process.env.FIREBASE_AUTH_DOMAIN ?? ""
    ),
    "import.meta.env.FIREBASE_PROJECT_ID": JSON.stringify(
      process.env.FIREBASE_PROJECT_ID ?? ""
    ),
    "import.meta.env.FIREBASE_STORAGE_BUCKET": JSON.stringify(
      process.env.FIREBASE_STORAGE_BUCKET ?? ""
    ),
    "import.meta.env.FIREBASE_MESSAGING_SENDER_ID": JSON.stringify(
      process.env.FIREBASE_MESSAGING_SENDER_ID ?? ""
    ),
    "import.meta.env.FIREBASE_APP_ID": JSON.stringify(
      process.env.FIREBASE_APP_ID ?? ""
    ),
  },
  fantasticon: {
    name: "fmg-icons",
    fontTypes: ["ttf", "woff", "woff2"],
    assetTypes: ["ts", "css"],
    pathOptions: {
      ts: "src/common/icons.ts",
    },
    prefix: "fmg-icon",
    normalize: true,
    inputDir: "icons",
  },
  manifest: ({ browser, manifestVersion }) => ({
    host_permissions: [
      "*://mapgenie.io/*",
      "*://www.mapgenie.io/*",
      "*://cdn.mapgenie.io/*",
      "https://*.googleapis.com/*",
      "https://*.google.com/*",
    ],
    web_accessible_resources: [
      {
        matches: ["<mapgenie_domains>"],
        resources: [
          "page.js",
          "popup.html",
          "logo.svg",
          "content-scripts/*.css",
          "assets/*",
        ],
      },
    ],
    permissions:
      browser === "chrome"
        ? ["declarativeNetRequest", "offscreen", "storage"]
        : manifestVersion === 2
          ? ["webRequest", "webRequestBlocking", "storage"]
          : ["declarativeNetRequest", "storage"],
    background_page: "background/page.html",
    browser_specific_settings:
      browser === "chrome"
        ? undefined
        : {
            gecko: {
              id: "free-map-genie-nr2bj@nr2bj.github.io",
              data_collection_permissions: {
                required: ["none"],
              },
            },
          },
  }),
});
