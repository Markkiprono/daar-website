"use client";

import { useActionState } from "react";
import { completePasswordReset, type ResetState } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./PasswordInput";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    completePasswordReset,
    undefined,
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <Label htmlFor="next">New password</Label>
        <PasswordInput
          id="next"
          name="next"
          autoComplete="new-password"
          minLength={10}
          className="h-12"
        />
        <p className="text-xs text-neutral-500">At least 10 characters.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Repeat new password</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          minLength={10}
          className="h-12"
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? "Saving…" : "Set new password"}
      </Button>

      <p className="text-center text-xs text-neutral-500">
        If two-factor is on, you&apos;ll still need your code to sign in.
      </p>
    </form>
  );
}
