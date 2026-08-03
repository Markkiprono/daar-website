"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Catch-all for any error thrown while rendering an admin page.
 *
 * The dashboard is used by non-technical staff, so a raw stack trace or the
 * browser's default error screen is the wrong thing to show. This keeps them
 * inside the dashboard with a plain explanation and a way to recover, and
 * their data is never at risk — a render error changes nothing in the
 * database.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Goes to the server logs for whoever maintains the site.
    console.error("[admin] page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mb-5 inline-grid h-14 w-14 place-items-center rounded-full bg-red-50 text-2xl">
        ⚠️
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-neutral-600">
        That didn&apos;t work, but nothing has been lost — your menu and settings are safe. Try
        again, and if it keeps happening, let your developer know.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
          Back to dashboard
        </Button>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-neutral-400">Reference: {error.digest}</p>
      )}
    </div>
  );
}
