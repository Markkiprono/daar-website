import "server-only";

/**
 * Owner notifications for new bookings and messages.
 *
 * Uses Resend's HTTP API directly rather than an SDK — it's one POST, and a
 * dependency is not worth it. Swapping to Postmark or SES means changing this
 * one function.
 *
 * Deliberately a NO-OP when RESEND_API_KEY is unset: the site must work
 * perfectly without email configured, and a missing key should never cause a
 * guest's booking to fail. Nothing here is ever awaited by the visitor's
 * request path in a way that can break it.
 *
 * Required to enable:
 *   RESEND_API_KEY    re_...
 *   EMAIL_FROM        Daar <hello@daarbyizzi.com>   (domain must be verified)
 *   EMAIL_TO          where notifications land; defaults to SiteSettings email
 */

type SendArgs = { subject: string; lines: string[]; replyTo?: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function notifyOwner({ subject, lines, replyTo }: SendArgs, to?: string | null) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  /**
   * The caller's address wins; EMAIL_TO is only the fallback.
   *
   * This was the other way round, and that quietly misdirected the one email
   * where the recipient is not a preference but the whole point. Every caller
   * already passes the right person — bookings and messages pass the café's
   * contact address, and a password reset passes the address of the admin who
   * asked for it — but EMAIL_TO overrode all of them, so setting it sent
   * somebody's reset link to a shared inbox instead of to them.
   *
   * EMAIL_TO still earns its place: it catches the case where the café has not
   * filled in a contact address yet, so notifications go somewhere rather than
   * nowhere.
   */
  const recipient = to || process.env.EMAIL_TO;

  if (!key || !from || !recipient) return { sent: false, reason: "not configured" as const };

  const text = lines.join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#12100f">
${lines.map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`).join("\n")}
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        text,
        html,
        // Lets the owner hit reply and reach the guest directly.
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text().catch(() => ""));
      return { sent: false, reason: "provider error" as const };
    }
    return { sent: true as const };
  } catch (e) {
    console.error("[email] send threw", e);
    return { sent: false, reason: "network error" as const };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
