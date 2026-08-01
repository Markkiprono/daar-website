import Link from "next/link";
import { getLogo } from "@/lib/logo";
import { BrandMark } from "@/components/site/BrandMark";
import { ForgotForm } from "@/components/admin/ForgotForm";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const logo = await getLogo("mark");

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark logo={logo} id="forgot" className="mx-auto h-12 w-auto text-[#481819]" />
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl">Forgot password</h1>
          <p className="mt-1 text-sm text-neutral-500">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <ForgotForm />
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
