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
