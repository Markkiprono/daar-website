import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emits .next/standalone — a self-contained server with only the modules it
   * actually uses. Required for the Docker image: it takes the runtime layer
   * from ~1.2 GB of node_modules down to tens of megabytes.
   */
  output: "standalone",

  experimental: {
    /**
     * The admin dashboard is served on its own host and reaches the app
     * through a rewrite in src/proxy.ts. Proxy buffers the request body, and
     * its default cap is 10 MB — so a photo upload larger than that is
     * truncated mid-stream and the Server Action fails with "Unexpected end
     * of form". Raised to match the 13 MB Server Action limit below.
     */
    proxyClientMaxBodySize: "13mb",

    serverActions: {
      /**
       * The owner uploads photos straight from a phone — 2–8 MB is normal,
       * and src/lib/images.ts accepts up to 12 MB. Next's default cap is
       * 1 MB, which rejects the request before the action ever runs and
       * surfaces as a bare "server error" with no useful message.
       * Extra headroom covers multipart boundary/header overhead.
       */
      bodySizeLimit: "13mb",

      /**
       * Server Actions compare Origin against Host and abort on a mismatch.
       * The admin dashboard is served on its own host and reaches the app
       * through a rewrite in src/proxy.ts, so those origins must be trusted
       * explicitly or every admin mutation fails CSRF validation.
       */
      allowedOrigins: [
        "localhost:3000",
        "localtest.me:3000",
        "admin.localtest.me:3000",
        "daarbyizzi.com",
        "admin.daarbyizzi.com",
      ],
    },
  },
};

export default nextConfig;
