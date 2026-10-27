"use client";

import { useActionState, useState } from "react";
import { sendCateringEnquiry, type EnquiryState } from "@/app/actions/catering";

const field =
  "mt-2 h-12 w-full rounded-[4px] border border-white/10 bg-white/[0.04] px-4 text-[16px] text-daar-cream outline-none transition duration-300 placeholder:text-daar-cream/35 hover:border-white/20 focus:border-daar-tan focus:bg-white/[0.06] focus:ring-2 focus:ring-daar-tan/25";
const labelCls = "text-[0.8rem] font-light text-daar-cream/75";

export function CateringEnquiryForm({
  question,
  interests,
  buttonLabel,
}: {
  question: string;
  interests: { title: string; hint: string }[];
  buttonLabel: string;
}) {
  const [state, formAction, pending] = useActionState<EnquiryState, FormData>(
    sendCateringEnquiry,
    undefined,
  );
  const [startedAt] = useState(() => Date.now());

  if (state?.ok) {
    return (
      <div className="animate-in fade-in zoom-in-95 py-10 text-center duration-700">
        <span
          aria-hidden
          className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-daar-tan/60 text-2xl text-daar-tan"
        >
          ✓
        </span>
        <p className="mt-5 font-[family-name:var(--font-display)] text-3xl text-daar-bone">
          Thank you — enquiry sent
        </p>
        <p className="mt-3 text-sm font-light text-daar-cream/75">
          Our team will be in touch within one working day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="startedAt" value={startedAt} />
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Leave this field empty</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* What the enquiry is about: a plain question and a card per answer,
          each with a line explaining it, so nobody has to guess. */}
      {interests.length > 0 && (
        <fieldset>
          <legend className="font-[family-name:var(--font-display)] text-[1.35rem] leading-tight text-daar-bone">
            {question || "What can we help you with?"}
          </legend>
          <p className="mt-1.5 text-[0.8rem] font-light text-daar-cream/60">Choose one.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {interests.map((choice) => (
              <label
                key={choice.title}
                className="group flex cursor-pointer items-start gap-3.5 rounded-[6px] border border-white/10 bg-white/[0.02] p-4 transition duration-300 hover:border-daar-tan/50 hover:bg-white/[0.04] has-[:checked]:border-daar-tan has-[:checked]:bg-daar-tan/[0.09] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-daar-tan/40"
              >
                <input type="radio" name="interest" value={choice.title} className="sr-only" />
                {/* The tick circle: empty until chosen, then filled gold. */}
                <span
                  aria-hidden
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/30 text-[0.7rem] leading-none text-transparent transition duration-300 group-hover:border-daar-tan/70 group-has-[:checked]:border-daar-tan group-has-[:checked]:bg-daar-tan group-has-[:checked]:text-daar-ink"
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.95rem] font-medium text-daar-bone transition-colors group-has-[:checked]:text-daar-tan">
                    {choice.title}
                  </span>
                  {choice.hint && (
                    <span className="mt-1 block text-[0.8rem] font-light leading-snug text-daar-cream/65">
                      {choice.hint}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className={labelCls}>Your name</label>
          <input id="c-name" name="name" required maxLength={80} autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="c-company" className={labelCls}>Company or organisation</label>
          <input
            id="c-company"
            name="company"
            maxLength={120}
            autoComplete="organization"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="c-email" className={labelCls}>Email</label>
          <input
            id="c-email"
            name="email"
            type="email"
            required
            maxLength={120}
            inputMode="email"
            autoComplete="email"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="c-phone" className={labelCls}>Phone</label>
          <input
            id="c-phone"
            name="phone"
            type="tel"
            maxLength={30}
            inputMode="tel"
            autoComplete="tel"
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="c-when" className={labelCls}>Date and number of guests</label>
        <input
          id="c-when"
          name="when"
          maxLength={120}
          placeholder="e.g. 12 Dec, 60 guests"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="c-details" className={labelCls}>Tell us more</label>
        <textarea
          id="c-details"
          name="details"
          rows={4}
          maxLength={2000}
          className="mt-2 w-full rounded-[4px] border border-white/10 bg-white/[0.04] px-4 py-3 text-[16px] text-daar-cream outline-none transition duration-300 hover:border-white/20 focus:border-daar-tan focus:bg-white/[0.06] focus:ring-2 focus:ring-daar-tan/25"
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-[4px] bg-daar-red/15 px-4 py-3 text-sm text-daar-cream">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="biz-btn inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-ink hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : buttonLabel || "Send enquiry"}
      </button>
    </form>
  );
}
