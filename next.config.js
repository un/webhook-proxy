await import("./src/env.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => [
    { source: "/github", destination: "https://github.com/un/webhook-proxy", permanent: true },
  ],
};

export default nextConfig;
