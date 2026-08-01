"use client";

import { useActionState, useState } from "react";
import {
  startTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
  changePassword,
  type SecurityState,
} from "@/app/actions/security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./PasswordInput";

function Notice({ state }: { state: SecurityState }) {
  if (!state) return null;
  return state.ok ? (
    <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.message}</p>
  ) : (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  );
}

/** Shown once. Only hashes are stored, so there is no way to see them again. */
function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        Save these recovery codes now — they will not be shown again.
      </p>
      <p className="mt-1 text-xs text-amber-800">
        Each works once, and gets you in if you lose your phone.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-amber-950">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-4"
        onClick={() => {
          void navigator.clipboard.writeText(codes.join("\n"));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy all"}
      </Button>
    </div>
  );
}

export function TwoFactorSetup({ qrDataUrl, secret }: { qrDataUrl: string; secret: string }) {
  const [state, action, pending] = useActionState<SecurityState, FormData>(confirmTwoFactor, undefined);

  if (state?.ok && state.backupCodes) {
    return (
      <div>
        <Notice state={state} />
        <BackupCodes codes={state.backupCodes} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-2 text-sm text-neutral-600">
        <li>
          <span className="font-medium text-neutral-900">1.</span> Install an authenticator app —
          Google Authenticator, Authy or 1Password all work.
        </li>
        <li>
          <span className="font-medium text-neutral-900">2.</span> Scan this code with it.
        </li>
        <li>
          <span className="font-medium text-neutral-900">3.</span> Enter the 6-digit code it shows.
        </li>
      </ol>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="Two-factor setup QR code"
          className="h-44 w-44 rounded-lg border border-neutral-200 bg-white p-2"
        />
        <div className="min-w-0">
          <p className="text-xs text-neutral-500">Can&apos;t scan? Type this in instead:</p>
          <code className="mt-1 block break-all rounded bg-neutral-100 px-2 py-1.5 font-mono text-xs">
            {secret}
          </code>
        </div>
      </div>

      <form action={action} className="space-y-3">
        <Label htmlFor="confirm-code">Code from your app</Label>
        <Input
          id="confirm-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          required
          className="h-12 max-w-[200px] text-center text-xl tracking-[0.3em]"
        />
        <Notice state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Turn on two-factor"}
        </Button>
      </form>
    </div>
  );
}

export function StartTwoFactorButton() {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async () => {
        setPending(true);
        await startTwoFactor();
        setPending(false);
      }}
    >
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Preparing…" : "Set up two-factor"}
      </Button>
    </form>
  );
}

export function DisableTwoFactor() {
  const [state, action, pending] = useActionState<SecurityState, FormData>(disableTwoFactor, undefined);
  return (
    <form action={action} className="space-y-3">
      <Label htmlFor="disable-pw">Confirm your password to turn it off</Label>
      <PasswordInput id="disable-pw" name="password" className="h-11 max-w-sm" />
      <Notice state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Working…" : "Turn off two-factor"}
      </Button>
    </form>
  );
}

export function RegenerateCodes() {
  const [state, action, pending] = useActionState<SecurityState, FormData>(
    regenerateBackupCodes,
    undefined,
  );
  return (
    <div>
      <form action={action} className="space-y-3">
        <Label htmlFor="regen-pw">Confirm your password</Label>
        <PasswordInput id="regen-pw" name="password" className="h-11 max-w-sm" />
        {(!state || !state.ok) && <Notice state={state} />}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Working…" : "Generate new recovery codes"}
        </Button>
      </form>
      {state?.ok && state.backupCodes && <BackupCodes codes={state.backupCodes} />}
    </div>
  );
}

export function ChangePassword() {
  const [state, action, pending] = useActionState<SecurityState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current">Current password</Label>
        <PasswordInput id="current" name="current" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">New password</Label>
        <PasswordInput id="next" name="next" autoComplete="new-password" minLength={10} className="h-11" />
        <p className="text-xs text-neutral-500">At least 10 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Repeat new password</Label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" className="h-11" />
      </div>
      <Notice state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
