"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Password field with a show/hide toggle.
 *
 * Long passwords are hard to type correctly on a phone keyboard, and the
 * owner will be signing in from one. The toggle is a button with a live
 * aria-label so screen readers announce the current state.
 */
export function PasswordInput({
  id,
  name,
  autoComplete = "current-password",
  required = true,
  minLength,
  className = "",
  placeholder,
}: {
  id?: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const generated = useId();
  const inputId = id ?? `pw-${generated}`;

  return (
    <div className="relative">
      <Input
        id={inputId}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className={`pr-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        // Never submits the form it sits inside.
        tabIndex={-1}
        className="absolute right-1 top-1/2 grid h-9 w-10 -translate-y-1/2 place-items-center rounded-md text-neutral-400 transition hover:text-neutral-700"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a12 12 0 01-2.4 3.4M6.2 6.7A12.4 12.4 0 003 12c0 2.5 4 7 9 7 1.2 0 2.3-.2 3.3-.6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
            <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        )}
      </button>
    </div>
  );
}
