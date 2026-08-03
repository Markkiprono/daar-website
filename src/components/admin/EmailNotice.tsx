import { emailConfigured } from "@/lib/email";

/**
 * Says out loud that nobody is being emailed.
 *
 * notifyOwner() is a deliberate no-op without RESEND_API_KEY so a missing key
 * can never fail a guest's booking — but that silence is indistinguishable
 * from working, and a request that arrives while nobody is looking at the
 * dashboard is a table lost. Renders nothing once email is configured.
 */
export function EmailNotice({ what }: { what: "bookings" | "messages" }) {
  if (emailConfigured()) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Email alerts are off — check this page regularly.</p>
      <p className="mt-1.5 text-amber-800">
        New {what} are saved here and counted in the tab above, but nobody is notified. Until
        email is set up, this page is the only place a new {what === "bookings" ? "booking" : "message"} appears.
      </p>
      <p className="mt-2 text-xs text-amber-800">
        To turn alerts on, set <code className="font-mono">RESEND_API_KEY</code> and{" "}
        <code className="font-mono">EMAIL_FROM</code> in the server&apos;s{" "}
        <code className="font-mono">.env</code>, then redeploy. Alerts go to{" "}
        <code className="font-mono">EMAIL_TO</code>, or to the contact email in Settings.
      </p>
    </div>
  );
}
