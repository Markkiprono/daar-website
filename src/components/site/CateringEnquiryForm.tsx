"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { sendCateringEnquiry, type EnquiryState } from "@/app/actions/catering";

/**
 * Every field is asked for, because a proposal written from half the facts
 * means a second round of emails. The tone stays gentle: a short note says
 * why, and anything left out is pointed to kindly rather than flagged red.
 */

const REQUIRED = ["interest", "name", "company", "email", "phone", "when", "details"] as const;
type Field = (typeof REQUIRED)[number];

/** What we say under a field someone skipped. */
const KINDLY: Record<Field, string> = {
  interest: "Kindly choose the option closest to what you need.",
  name: "Kindly let us know your name.",
  company: "Kindly add your company or organisation.",
  email: "Kindly add an email address we can reply to.",
  phone: "Kindly add a phone number, in case a quick call is easier.",
  when: "Kindly add a date and rough numbers. An estimate is perfectly fine.",
  details: "Kindly share a sentence or two about what you have in mind.",
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3">
      <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CateringEnquiryForm({
  question,
  note,
  interests,
  buttonLabel,
}: {
  question: string;
  note: string;
  interests: { title: string; hint: string }[];
  buttonLabel: string;
}) {
  const [state, formAction, pending] = useActionState<EnquiryState, FormData>(
    sendCateringEnquiry,
    undefined,
  );
  const [startedAt] = useState(() => Date.now());
  const [missing, setMissing] = useState<Set<Field>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  const needed = REQUIRED.filter((f) => f !== "interest" || interests.length > 0);

  const check = (e: FormEvent<HTMLFormElement>) => {
    const data = new FormData(e.currentTarget);
    const gaps = new Set<Field>();
    for (const f of needed) {
      const v = String(data.get(f) ?? "").trim();
      if (!v) gaps.add(f);
      else if (f === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) gaps.add(f);
    }
    setMissing(gaps);
    if (gaps.size > 0) {
      e.preventDefault();
      // Take them to the first thing still needed.
      const first = needed.find((f) => gaps.has(f));
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus({ preventScroll: true });
      el?.closest("[data-field]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  /** Once something is filled in, its note goes away. */
  const clear = (f: Field) => {
    if (!missing.has(f)) return;
    setMissing((prev) => {
      const next = new Set(prev);
      next.delete(f);
      return next;
    });
  };

  const field = (f: Field) =>
    [
      "mt-2 h-12 w-full rounded-[4px] border bg-white/[0.04] px-4 text-[16px] text-daar-cream outline-none transition duration-300 placeholder:text-daar-cream/35 focus:bg-white/[0.06] focus:ring-2 focus:ring-daar-tan/25",
      missing.has(f) ? "border-daar-tan/70" : "border-white/10 hover:border-white/20 focus:border-daar-tan",
    ].join(" ");
  const labelCls = "text-[0.8rem] font-light text-daar-cream/75";

  const hint = (f: Field) =>
    missing.has(f) ? (
      <p className="mt-1.5 text-[0.78rem] font-light text-daar-tan">{KINDLY[f]}</p>
    ) : null;

  if (state?.ok) {
    return (
      <div className="animate-in fade-in zoom-in-95 py-10 text-center duration-700">
        <span
          aria-hidden
          className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-daar-tan/60 text-daar-tan [&_svg]:h-6 [&_svg]:w-6"
        >
          <CheckIcon />
        </span>
        <p className="mt-5 font-[family-name:var(--font-display)] text-3xl text-daar-bone">
          Thank you for reaching out
        </p>
        <p className="mx-auto mt-3 max-w-[380px] text-sm font-light leading-relaxed text-daar-cream/75">
          We&apos;ve received your enquiry and will be in touch within one working day.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={check} noValidate className="space-y-5">
      <input type="hidden" name="startedAt" value={startedAt} />
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Leave this field empty</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {interests.length > 0 && (
        <fieldset data-field>
          <legend className="font-[family-name:var(--font-display)] text-[1.35rem] leading-tight text-daar-bone">
            {question || "What can we help you with?"}
          </legend>
          {note && (
            <p className="mt-2 text-[0.82rem] font-light leading-relaxed text-daar-cream/65">{note}</p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {interests.map((choice) => (
              <label
                key={choice.title}
                className={[
                  "group flex cursor-pointer items-start gap-3.5 rounded-[6px] border bg-white/[0.02] p-4 transition duration-300 hover:border-daar-tan/50 hover:bg-white/[0.04] has-[:checked]:border-daar-tan has-[:checked]:bg-daar-tan/[0.09] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-daar-tan/40",
                  missing.has("interest") ? "border-daar-tan/40" : "border-white/10",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="interest"
                  value={choice.title}
                  className="sr-only"
                  onChange={() => clear("interest")}
                />
                <span
                  aria-hidden
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/30 text-transparent transition duration-300 group-hover:border-daar-tan/70 group-has-[:checked]:border-daar-tan group-has-[:checked]:bg-daar-tan group-has-[:checked]:text-daar-ink"
                >
                  <CheckIcon />
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
          {hint("interest")}
        </fieldset>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div data-field>
          <label htmlFor="c-name" className={labelCls}>Your name</label>
          <input id="c-name" name="name" maxLength={80} autoComplete="name" aria-required className={field("name")} onInput={() => clear("name")} />
          {hint("name")}
        </div>
        <div data-field>
          <label htmlFor="c-company" className={labelCls}>Company or organisation</label>
          <input id="c-company" name="company" maxLength={120} autoComplete="organization" aria-required className={field("company")} onInput={() => clear("company")} />
          {hint("company")}
        </div>
        <div data-field>
          <label htmlFor="c-email" className={labelCls}>Email</label>
          <input id="c-email" name="email" type="email" maxLength={120} inputMode="email" autoComplete="email" aria-required className={field("email")} onInput={() => clear("email")} />
          {hint("email")}
        </div>
        <div data-field>
          <label htmlFor="c-phone" className={labelCls}>Phone</label>
          <input id="c-phone" name="phone" type="tel" maxLength={30} inputMode="tel" autoComplete="tel" aria-required className={field("phone")} onInput={() => clear("phone")} />
          {hint("phone")}
        </div>
      </div>

      <div data-field>
        <label htmlFor="c-when" className={labelCls}>Date and number of guests</label>
        <input
          id="c-when"
          name="when"
          maxLength={120}
          placeholder="e.g. 12 Dec, 60 guests, or loaves a week"
          aria-required
          className={field("when")}
          onInput={() => clear("when")}
        />
        {hint("when")}
      </div>

      <div data-field>
        <label htmlFor="c-details" className={labelCls}>Tell us more</label>
        <textarea
          id="c-details"
          name="details"
          rows={4}
          maxLength={2000}
          aria-required
          placeholder="The occasion, any dietary needs, the kind of menu you have in mind…"
          onInput={() => clear("details")}
          className={`${field("details")} h-auto py-3`}
        />
        {hint("details")}
      </div>

      {missing.size > 0 && (
        <p role="status" className="text-[0.85rem] font-light text-daar-cream/80">
          Just a few details still to add, marked above. Thank you for your patience.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-[4px] border border-daar-tan/40 bg-daar-tan/[0.07] px-4 py-3 text-sm font-light text-daar-cream">
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
