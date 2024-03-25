// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    "@nuxt/devtools",
    "@vueuse/nuxt",
    "@vueuse/nuxt",
    "nuxt-security",
    "@nuxt/ui",
    "nuxt-shiki",
  ],

  runtimeConfig: {
    primaryDomain: process.env.NUXT_PRIMARY_DOMAIN,
    dbConnectionString: process.env.NUXT_POSTGRES_CONNECTION_STRING,
    githubClientId: process.env.NUXT_GITHUB_CLIENT_ID,
    githubClientSecret: process.env.NUXT_GITHUB_CLIENT_SECRET,
    public: {
      baseUrl: process.env.NUXT_PRIMARY_DOMAIN,
    },
  },

  shiki: {
    bundledThemes: ["tokyo-night"],
    defaultLang: "json",
    defaultTheme: "tokyo-night",
  },

  css: ["@/assets/css/main.css"],
  app: {
    pageTransition: { name: "page", mode: "out-in", duration: 100 },
    layoutTransition: { name: "layout", mode: "out-in", duration: 100 },
  },
  ui: {
    global: true,
    icons: ["ph", "simple-icons"],
  },
  colorMode: {
    // classSuffix: '',
    preference: "light", // default value of $colorMode.preference
    fallback: "light", // fallback value if not system preference found
    storageKey: "un-color-mode",
  },
  build: {
    transpile: ["trpc-nuxt"],
  },
  typescript: {
    shim: false,
  },
  security: {
    headers: {
      crossOriginEmbedderPolicy:
        process.env.NODE_ENV === "development" ? "unsafe-none" : "require-corp",
      contentSecurityPolicy: {
        "img-src": ["'self'", "data:", process.env.WEBAPP_STORAGE_URL || ""],
        "script-src":
          "'self' https: 'unsafe-eval' 'unsafe-inline' 'strict-dynamic' 'nonce-{{nonce}}'",
      },
    },
  },
  routeRules: {
    "/endpoint/**": {
      security: {
        xssValidator: false,
      },
    },
  },
});
