import Link from "next/link";
import { getLogo } from "@/lib/logo";
import { BrandMark } from "@/components/site/BrandMark";
import { isResetTokenValid } from "@/app/actions/password-reset";
import { ResetForm } from "@/components/admin/ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [logo, valid] = await Promise.all([
    getLogo("mark"),
    isResetTokenValid(token ?? ""),
  ]);

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark logo={logo} id="reset" className="mx-auto h-12 w-auto text-[#481819]" />
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl">
            {valid ? "Set a new password" : "Link expired"}
          </h1>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          {valid && token ? (
            <ResetForm token={token} />
          ) : (
            <div className="text-center">
              <p className="text-sm text-neutral-600">
                This reset link has expired or has already been used.
              </p>
              <Link
                href="/admin/forgot"
                className="mt-5 inline-block rounded-full bg-[#481819] px-6 py-3 text-xs uppercase tracking-[0.18em] text-[#f2e4d4]"
              >
                Request a new link
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/admin/login" className="text-neutral-500 underline hover:text-[#481819]">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
