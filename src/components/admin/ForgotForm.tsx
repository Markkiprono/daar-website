"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ResetRequestState } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    undefined,
  );

  if (state?.ok) {
    return (
      <div className="text-center">
        <p className="text-sm text-neutral-700">{state.message}</p>
        <p className="mt-3 text-xs text-neutral-500">
          Check your spam folder if it doesn&apos;t arrive.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          autoFocus
          className="h-12"
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
