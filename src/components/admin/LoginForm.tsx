"use client";

import { useActionState, useEffect, useRef } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./PasswordInput";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);
  const codeRef = useRef<HTMLInputElement>(null);

  const needsCode = state?.needsCode === true;

  // Jump straight to the code box when the second step appears.
  useEffect(() => {
    if (needsCode) codeRef.current?.focus();
  }, [needsCode]);

  if (needsCode) {
    return (
      <form action={formAction} className="space-y-5">
        <div className="text-center">
          <p className="text-sm font-medium">Two-factor authentication</p>
          <p className="mt-1 text-xs text-neutral-500">
            Enter the 6-digit code from your authenticator app for{" "}
            <span className="font-medium text-neutral-700">{state.email}</span>.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            ref={codeRef}
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={14}
            required
            className="h-14 text-center text-2xl tracking-[0.4em]"
          />
          <p className="text-center text-xs text-neutral-500">
            Lost your phone? Enter one of your recovery codes instead.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="h-12 w-full text-base">
          {pending ? "Checking…" : "Verify"}
        </Button>

        <p className="text-center text-xs text-neutral-400">
          <a href="/admin/login" className="underline">
            Start over
          </a>
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          inputMode="email"
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password">Password</Label>
          <a href="/admin/forgot" className="text-xs text-neutral-500 underline hover:text-[#481819]">
            Forgot password?
          </a>
        </div>
        <PasswordInput id="password" name="password" className="h-12" />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
