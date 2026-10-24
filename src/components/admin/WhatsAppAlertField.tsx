"use client";

import { useState } from "react";
import { testWhatsAppAlert } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Who gets a WhatsApp alert when a table is requested, and a way to prove it.
 *
 * The test button is the reason this is its own component rather than two
 * more lines in SettingsForm. Getting WhatsApp working means a token, an
 * approved template and a one-time opt-in all being right at the same moment,
 * and every one of them fails silently — Meta accepts the send and simply
 * never delivers. Without a button, the only way to find out is to notice a
 * booking nobody was told about, which is the failure this whole feature
 * exists to prevent.
 *
 * It tests the number as TYPED, not as saved. Saving first would mean
 * committing a number you have not yet confirmed reaches anybody.
 */
export function WhatsAppAlertField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function test() {
    setPending(true);
    setResult(null);
    try {
      const r = await testWhatsAppAlert(value);
      setResult(r ?? { ok: false, message: "No answer from the server." });
    } catch {
      // A thrown action is a network drop or a lapsed session, and neither is
      // worth a blank screen when the rest of the settings page still works.
      setResult({ ok: false, message: "Couldn't reach the server — try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="reservationsWhatsApp">WhatsApp alerts for bookings</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="reservationsWhatsApp"
          name="reservationsWhatsApp"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            // A result describes the numbers that were in the box when it was
            // sent. Leaving a green tick under an edited number reads as though
            // the new one is confirmed.
            setResult(null);
          }}
          placeholder="254727117355, 254712345678"
          maxLength={200}
          className="sm:flex-1"
        />
        {/* Inside the settings <form>, so this must never submit it: pressing
            "Send test" is not the same as saving, and a page reload here would
            throw away every other unsaved edit on a long page. */}
        <Button
          type="button"
          variant="outline"
          onClick={test}
          disabled={pending}
          className="sm:w-36"
        >
          {pending ? "Sending…" : "Send test alert"}
        </Button>
      </div>

      {result && (
        <p
          role={result.ok ? undefined : "alert"}
          className={
            result.ok
              ? "rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
              : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {result.message}
        </p>
      )}

      <p className="text-xs text-neutral-500">
        Who gets a WhatsApp message the moment a table is requested. Country code first and
        no plus sign — <span className="font-mono">254727117355</span>. Separate several with
        commas, and put more than one person on it so a missed booking is somebody
        else&apos;s problem too.
      </p>
      <p className="text-xs text-neutral-500">
        Not shown on the site, and not the same as the WhatsApp number above — that one is
        where guests message you, this is where you get told. The test sends a real message
        marked <span className="font-mono">TEST</span>, through the same template a booking
        uses, and tests the number in the box even if you have not saved yet.
      </p>
    </div>
  );
}
