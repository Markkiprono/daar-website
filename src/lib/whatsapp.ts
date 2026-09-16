import "server-only";

/**
 * WhatsApp alerts to the café when a booking lands.
 *
 * The email in src/lib/email.ts reaches an inbox nobody watches during
 * service, which is how requests went unanswered. This puts the same
 * information on the phone in someone's apron pocket.
 *
 * Meta's Cloud API, called over HTTP for the same reason email.ts skips the
 * Resend SDK: it is one POST, and a dependency for one POST is a liability at
 * upgrade time. Swapping to Twilio means changing this one function.
 *
 * Deliberately a NO-OP when unconfigured — identical to notifyOwner. A café
 * with no WhatsApp credentials must still take bookings, and a guest must
 * never see a booking fail because Meta was down or a token expired.
 *
 * Required to enable:
 *   WHATSAPP_TOKEN            EAA…   permanent System User token, NOT the
 *                                    24-hour temporary one from the console
 *   WHATSAPP_PHONE_NUMBER_ID  15-ish digits, from Meta → WhatsApp → API Setup.
 *                             This is the SENDER. It is an internal id, not a
 *                             phone number, and not the number staff receive on.
 *   WHATSAPP_ALERT_TO         who gets alerted. Comma-separated, country code
 *                             first, no plus: "254727117355,254712345678"
 *   WHATSAPP_TEMPLATE_NAME    the approved template, default "daar_booking"
 *   WHATSAPP_TEMPLATE_LANG    its language code, default "en"
 *
 * The template must be approved by Meta before anything sends — see
 * DEPLOY.md. Business-initiated messages cannot be free text.
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/**
 * How long one send may take before it is abandoned.
 *
 * Generous enough for a slow mobile route to Meta, short enough that a guest
 * pressing "Request a table" is never left waiting on somebody else's outage.
 * The booking is already committed by the time this runs, so an abandoned
 * alert costs a notification, never a reservation.
 */
const SEND_TIMEOUT_MS = 8000;

/** The six values the template expects, in order. */
export type BookingAlert = {
  /** "REQUEST" or "CHANGED" — the first line, so it reads at a glance. */
  kind: string;
  name: string;
  party: string;
  when: string;
  phone: string;
  reference: string;
};

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Meta rejects a template parameter containing a newline, a tab, or a run of
 * more than four spaces — the whole send fails with a 132000-series error and
 * no message reaches anyone.
 *
 * Guest-supplied text reaches here (a name, and one day a note), so this is
 * not a theoretical case: someone typing their name across two lines would
 * silently kill the alert for that booking, which is exactly the booking most
 * worth seeing. Collapsed rather than rejected — a squashed name still tells
 * the café who is coming.
 *
 * An empty parameter is also rejected by Meta, hence the dash.
 */
function param(value: string): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > 0 ? flat.slice(0, 900) : "—";
}

/**
 * Country code first, no plus, no spaces — the only shape Cloud API accepts.
 *
 * A Kenyan number written the way people actually write it, "0727 117 355",
 * would go out as 727117355 and silently never arrive: Meta returns success
 * for a well-formed number that has no WhatsApp account. So a leading zero is
 * swapped for the country code rather than stripped, and anything still too
 * short to be a real number is dropped before sending.
 */
export function normaliseNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const withCode = digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
  // An upper bound as well as a lower one: without it, two numbers typed with
  // only a space between them fuse into one 24-digit string that looks valid,
  // saves happily, and reaches nobody.
  return withCode.length >= 10 && withCode.length <= 15 ? withCode : null;
}

/**
 * Split a field of numbers into entries.
 *
 * Commas, semicolons and newlines separate. Spaces deliberately do NOT.
 *
 * Splitting on whitespace as well seems obvious and is wrong: a space inside a
 * number is how people actually write one down. "+254 727 117 355" tore into
 * four fragments, every fragment was too short to be a number, all four were
 * dropped — and the café was left with a field that looked perfectly correct
 * above alerts that silently went nowhere. Which is the exact failure this
 * whole feature exists to prevent, so it is worth the extra function.
 */
export function splitNumbers(raw: string): string[] {
  return raw
    .split(/[,;\r\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** True when every entry in the field is a number we could actually send to. */
export function numbersAreUsable(raw: string): boolean {
  return splitNumbers(raw).every((n) => normaliseNumber(n) !== null);
}

/** Recipients from the dashboard, falling back to the environment. */
export function alertRecipients(fromSettings?: string | null): string[] {
  const raw = fromSettings?.trim() || process.env.WHATSAPP_ALERT_TO || "";
  const seen = new Set<string>();
  for (const part of splitNumbers(raw)) {
    const n = normaliseNumber(part);
    if (n) seen.add(n);
  }
  return [...seen];
}

/**
 * Send one alert to every recipient.
 *
 * Recipients are independent: a number that has left the company, or never
 * had WhatsApp, must not stop the alert reaching the people who did. So every
 * send is its own request and its own failure, logged rather than thrown.
 *
 * Sent in parallel, and each one bounded by a timeout, because the guest is
 * still watching a spinner while this runs. Sequentially, four staff numbers
 * against a slow Meta would have held the booking form open for the sum of
 * all four; a hung connection with no timeout would have held it until the
 * platform gave up. Neither is a thing to do to somebody booking a table.
 *
 * Never throws. The caller has already saved the booking.
 */
export type SendResult = {
  sent: number;
  failed: number;
  /** Set when nothing was attempted at all. */
  reason?: string;
  /**
   * Meta's own error text, one per failed recipient.
   *
   * Kept rather than only logged, so the dashboard's test button can say
   * "your template is not approved yet" instead of "failed" — the log is on
   * the server and the person setting this up is not.
   */
  errors: string[];
};

export async function notifyOwnerWhatsApp(
  alert: BookingAlert,
  to?: string | null,
): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE_NAME || "daar_booking";
  const language = process.env.WHATSAPP_TEMPLATE_LANG || "en";

  if (!token || !phoneNumberId)
    return { sent: 0, failed: 0, reason: "not configured", errors: [] };

  const recipients = alertRecipients(to);
  if (recipients.length === 0)
    return { sent: 0, failed: 0, reason: "no recipients", errors: [] };

  const parameters = [
    alert.kind,
    alert.name,
    alert.party,
    alert.when,
    alert.phone,
    alert.reference,
  ].map((text) => ({ type: "text" as const, text: param(text) }));

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;

  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template: {
            name: template,
            language: { code: language },
            components: [{ type: "body", parameters }],
          },
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });

      if (!res.ok) {
        // The body carries Meta's error code, which is the only thing that
        // tells "template not approved" apart from "token expired" and from
        // "that number has no WhatsApp". Logged whole rather than summarised,
        // because the café will be reading this at 8pm on a Friday.
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${body}`);
      }
      return recipient;
    }),
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sent += 1;
    } else {
      failed += 1;
      const detail = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push(detail);
      console.error("[whatsapp] send failed", recipients[i], detail);
    }
  });

  return { sent, failed, errors };
}

/**
 * Meta's failures, in the words of the person reading them.
 *
 * The raw error is a JSON blob with a numeric code, and every one of these
 * means "check a specific box you have not checked yet". Left as a number it
 * sends whoever set this up to a search engine; named, it sends them to the
 * one screen that fixes it. Ordered by how often each actually happens.
 */
export function explainError(raw: string): string {
  const has = (...codes: string[]) => codes.some((c) => raw.includes(c));

  if (has("132001", "132000", "133010") && /template/i.test(raw))
    return "The template isn't approved yet, or its name/language doesn't match WHATSAPP_TEMPLATE_NAME.";
  if (has("132001"))
    return "Meta can't find that template. Check the name and language match exactly.";
  if (has("132000"))
    return "The template expects a different number of {{n}} values than the code sends. If you edited the template, src/lib/whatsapp.ts needs the same change.";
  if (has('"code":190', "190,") || /access token/i.test(raw))
    return "The access token is invalid or expired — most likely the 24-hour one. Generate a permanent System User token.";
  if (has("131030"))
    return "That number isn't on the app's allowed recipient list. While the app is in test mode, add it under API Setup.";
  if (has("131026", "131047"))
    return "Undeliverable. That number either has no WhatsApp account, or has never sent a message to your business number — it must do that once first.";
  if (has("133010", "133005"))
    return "The sending number isn't registered on the Cloud API yet.";
  if (has("368", "131031"))
    return "The account is restricted or blocked by Meta. Check WhatsApp Manager for a policy notice.";
  if (/abort|timeout/i.test(raw))
    return "Timed out reaching Meta. The network or Meta is slow — try again.";
  return raw.slice(0, 300);
}

/**
 * Send a real alert, on demand, to prove the setup works.
 *
 * Deliberately goes through the same template and the same code path as a
 * genuine booking — a test that takes a shortcut proves only that the
 * shortcut works. Marked TEST in the first line so nobody chases a table that
 * does not exist.
 */
export async function sendTestAlert(to?: string | null, when?: string): Promise<SendResult> {
  return notifyOwnerWhatsApp(
    {
      kind: "TEST",
      name: "Test alert — no action needed",
      party: "2 guests",
      when: when || "just now",
      phone: "n/a",
      reference: "DAAR-TEST",
    },
    to,
  );
}
