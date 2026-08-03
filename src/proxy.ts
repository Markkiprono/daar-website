import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Next 16 renamed Middleware to Proxy. Same functionality, new filename.
 *
 * Two jobs:
 *   1. Host-based routing — admin.daarbyizzi.com serves /admin/* from the
 *      same codebase, and the admin tree is unreachable from the public host.
 *   2. An *optimistic* auth check. Per Next's guidance this only reads the
 *      cookie's presence; it never touches the database, because Proxy runs
 *      on every request including prefetches. Real authorization lives in
 *      the Data Access Layer (src/lib/dal.ts).
 */

function isAdminHost(host: string | null): boolean {
  if (!host) return false;
  const adminHost = process.env.ADMIN_HOST;
  if (adminHost && host === adminHost) return true;
  // Fall back to a subdomain check so previews and staging hosts work too.
  return host.startsWith("admin.");
}

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host");
  const onAdminHost = isAdminHost(host);

  // --- public host must not expose the admin tree ---
  if (!onAdminHost && pathname.startsWith("/admin")) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  if (onAdminHost) {
    // The admin host is discoverable (TLS certificates are public record), so
    // tell search engines not to list it. Every admin response carries this.
    const noindex = (res: NextResponse) => {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    };

    // Static assets and API routes pass through untouched.
    if (pathname.startsWith("/api")) return noindex(NextResponse.next());

    // Map the admin host's root onto the /admin route group.
    const internal = pathname.startsWith("/admin") ? pathname : `/admin${pathname === "/" ? "" : pathname}`;

    const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

    // Pages that must stay reachable while signed out, or the password reset
    // flow becomes a loop back to a login you cannot get past.
    const PUBLIC_ADMIN = ["/admin/login", "/admin/forgot", "/admin/reset"];
    const isPublicAdmin = PUBLIC_ADMIN.some((p) => internal === p || internal.startsWith(`${p}/`));

    // Optimistic redirects only — a forged cookie gets rejected by the DAL.
    if (!hasCookie && !isPublicAdmin) {
      const url = new URL("/admin/login", request.url);
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return noindex(NextResponse.rewrite(url));
    }
    // Already signed in? Skip login, but allow /reset so a link still works.
    if (hasCookie && internal === "/admin/login") {
      return noindex(NextResponse.rewrite(new URL("/admin", request.url)));
    }

    return noindex(NextResponse.rewrite(new URL(`${internal}${search}`, request.url)));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, static files and anything with a file extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.[\\w]+$).*)"],
};
