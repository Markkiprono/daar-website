"use client";

import { useActionState, useState } from "react";
import { sendMessage, type MessageState } from "@/app/actions/messages";

const MAX_BODY = 2000;

export function MessageForm({ email }: { email?: string | null }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(sendMessage, undefined);
  const [count, setCount] = useState(0);
  // Stamped at render, checked server-side — bots submit far too fast.
  const [startedAt] = useState(() => Date.now());

  if (state?.ok) {
    return (
      <div className="rounded-[3px] border border-daar-tan bg-white p-8 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl">Thank you — message sent</p>
        <p className="mt-3 text-sm text-daar-muted">
          We read everything and will get back to you shortly.
        </p>
        {email && (
          <p className="mt-4 text-xs text-daar-muted">
            In a hurry? Email us directly at{" "}
            <a href={`mailto:${email}`} className="underline">
              {email}
            </a>
            .
          </p>
        )}
      </div>
    );
  }

  const field =
    "mt-1.5 h-12 w-full rounded-[3px] border border-daar-rule bg-white px-4 text-[16px] text-daar-ink outline-none transition focus:border-daar-tan focus:ring-2 focus:ring-daar-tan/30";
  const labelCls =
    "font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-daar-muted";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="startedAt" value={startedAt} />

      {/* Honeypot — hidden from people, tempting to bots. Not display:none,
          which some bots detect; pushed off-screen and out of the tab order. */}
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="m-name" className={labelCls}>
            Name <span aria-hidden className="text-daar-red">*</span>
          </label>
          <input id="m-name" name="name" required maxLength={80} autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="m-email" className={labelCls}>
            Email <span aria-hidden className="text-daar-red">*</span>
          </label>
          <input
            id="m-email"
            name="email"
            type="email"
            required
            maxLength={120}
            inputMode="email"
            autoComplete="email"
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="m-phone" className={labelCls}>
            Phone <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="m-phone"
            name="phone"
            type="tel"
            maxLength={30}
            inputMode="tel"
            autoComplete="tel"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="m-subject" className={labelCls}>
            Subject <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="m-subject"
            name="subject"
            maxLength={120}
            placeholder="Bulk order, celebration cake…"
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="m-body" className={labelCls}>
          Message <span aria-hidden className="text-daar-red">*</span>
        </label>
        <textarea
          id="m-body"
          name="body"
          required
          rows={6}
          minLength={10}
          maxLength={MAX_BODY}
          onChange={(e) => setCount(e.target.value.length)}
          placeholder="Tell us what you need and when you need it."
          className="mt-1.5 w-full rounded-[3px] border border-daar-rule bg-white px-4 py-3 text-[16px] text-daar-ink outline-none transition focus:border-daar-tan focus:ring-2 focus:ring-daar-tan/30"
        />
        <p className="mt-1 text-right text-xs text-daar-muted">
          {count}/{MAX_BODY}
        </p>
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-[3px] bg-daar-red/10 px-4 py-3 text-sm text-daar-red">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-full bg-daar-oxblood font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:bg-daar-ink disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
