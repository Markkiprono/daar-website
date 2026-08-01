import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { otpauthUrl, formatSecret } from "@/lib/totp";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TwoFactorSetup,
  StartTwoFactorButton,
  DisableTwoFactor,
  RegenerateCodes,
  ChangePassword,
} from "@/components/admin/SecurityPanels";

export const dynamic = "force-dynamic";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  );
}

export default async function SecurityPage() {
  // Must precede every query — see the note in menu/page.tsx.
  const session = await requireAdmin();

  const admin = await db.adminUser.findUniqueOrThrow({
    where: { id: session.adminId },
    include: { backupCodes: { where: { usedAt: null } } },
  });

  const enabled = Boolean(admin.totpEnabledAt);
  const midSetup = Boolean(admin.totpSecret) && !enabled;

  // Only generated while setup is actually in progress.
  const qrDataUrl =
    midSetup && admin.totpSecret
      ? await QRCode.toDataURL(otpauthUrl(admin.totpSecret, admin.email), {
          width: 320,
          margin: 1,
          color: { dark: "#481819", light: "#ffffff" },
        })
      : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Security</h1>
        <p className="mt-1 text-sm text-neutral-500">
          This dashboard is reachable from the public internet. Two-factor is the single
          biggest thing you can do to protect it.
        </p>
      </div>

      <Section
        title="Two-factor authentication"
        description="A 6-digit code from your phone, on top of your password."
      >
        <div className="mb-5 flex items-center gap-3">
          {enabled ? (
            <>
              <Badge className="bg-green-700">On</Badge>
              <span className="text-sm text-neutral-600">
                Enabled {admin.totpEnabledAt!.toLocaleDateString("en-GB")} ·{" "}
                {admin.backupCodes.length} recovery code
                {admin.backupCodes.length === 1 ? "" : "s"} left
              </span>
            </>
          ) : (
            <>
              <Badge variant="destructive">Off</Badge>
              <span className="text-sm text-neutral-600">
                Your password is the only thing protecting this dashboard.
              </span>
            </>
          )}
        </div>

        {enabled ? (
          <div className="space-y-8">
            <DisableTwoFactor />
            <div className="border-t border-neutral-100 pt-6">
              <h3 className="text-sm font-medium">Recovery codes</h3>
              <p className="mb-4 mt-1 text-sm text-neutral-500">
                {admin.backupCodes.length} unused.
                {admin.backupCodes.length <= 2 &&
                  " You're running low — generate a fresh set."}
              </p>
              <RegenerateCodes />
            </div>
          </div>
        ) : midSetup && qrDataUrl && admin.totpSecret ? (
          <TwoFactorSetup qrDataUrl={qrDataUrl} secret={formatSecret(admin.totpSecret)} />
        ) : (
          <StartTwoFactorButton />
        )}
      </Section>

      <Section title="Password" description={`Signed in as ${admin.email}`}>
        <ChangePassword />
      </Section>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-medium">Account</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Email</dt>
              <dd>{admin.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Last signed in</dt>
              <dd>
                {admin.lastLoginAt
                  ? admin.lastLoginAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
