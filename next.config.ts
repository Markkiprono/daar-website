import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emits .next/standalone — a self-contained server with only the modules it
   * actually uses. Required for the Docker image: it takes the runtime layer
   * from ~1.2 GB of node_modules down to tens of megabytes.
   */
  output: "standalone",

  /**
   * The dev server binds to localhost, and Next blocks cross-origin requests to
   * dev-only assets. The admin dashboard runs on its own host, so without this
   * every admin page loads as plain HTML and never hydrates — forms render but
   * no handler ever fires, leaving buttons dead and validation silent.
   * Development only; production is unaffected.
   */
  allowedDevOrigins: ["localtest.me", "*.localtest.me"],

  /**
   * src/lib/storage/local.ts resolves the uploads directory from
   * process.cwd(). The build tracer can't evaluate that statically, so it
   * assumes the whole project is needed and copies these folders into
   * .next/standalone — which defeats the point of output:"standalone" above.
   *
   * None of them are read at runtime: TypeScript sources are compiled into
   * .next, design/ and scripts/ are development material, and storage/ is the
   * uploads volume (mounted at /data in the container, never baked in).
   */
  outputFileTracingExcludes: {
    "/**": ["design/**", "scripts/**", "storage/**", "src/**"],
  },

  /**
   * sharp's native addon is traced, but the libvips shared library it links
   * against is not — the tracer follows JS imports, not a .node file's dynamic
   * library dependencies. The runner image copies ONLY .next/standalone, so
   * without this every upload dies at runtime with ERR_DLOPEN_FAILED while the
   * rest of the site looks perfectly healthy.
   *
   * Platform-agnostic on purpose: @img resolves to sharp-linux-x64 (libvips
   * .so) in the container and sharp-win32-x64 (libvips .dll) locally.
   */
  outputFileTracingIncludes: {
    "/**": ["node_modules/@img/**"],
  },

  images: {
    /**
     * Next's default ladder ends 2048, 3840. Uploads are capped at 2000px wide
     * by processMenuImage, so those two produce files byte-identical to the
     * 1920 one — measured: 1920, 2048 and 3840 all return 124 KB for the same
     * hero. Dropping them removes variants that cost CPU and cache space to
     * generate and can never look different, and keeps a future large upload
     * from quietly shipping a 4K image over Kenyan mobile data.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  experimental: {
    /**
     * The admin dashboard is served on its own host and reaches the app
     * through a rewrite in src/proxy.ts. Proxy buffers the request body, and
     * its default cap is 10 MB — so a photo upload larger than that is
     * truncated mid-stream and the Server Action fails with "Unexpected end
     * of form". Raised to match the 13 MB Server Action limit below.
     */
    proxyClientMaxBodySize: "52mb",

    serverActions: {
      /**
       * The owner uploads photos straight from a phone — 2–8 MB is normal,
       * and src/lib/images.ts accepts up to 12 MB. Next's default cap is
       * 1 MB, which rejects the request before the action ever runs and
       * surfaces as a bare "server error" with no useful message.
       *
       * Raised again for the hero video, which src/lib/image-rules.ts caps at
       * 50 MB. The limit has to clear the largest thing any action accepts or
       * that upload dies mid-stream, and the failure looks like a broken
       * dashboard rather than a file that is too big.
       *
       * Extra headroom covers multipart boundary/header overhead.
       */
      bodySizeLimit: "52mb",

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
