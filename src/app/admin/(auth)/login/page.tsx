import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getLogo } from "@/lib/logo";
import { BrandMark } from "@/components/site/BrandMark";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage() {
  // Already signed in? Don't show the form again.
  if (await verifySession()) redirect("/admin");

  const logo = await getLogo("mark");

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* Oxblood on the light login card — only possible because the
              SVG is inlined and inherits `color`. */}
          <BrandMark logo={logo} id="login" className="mx-auto h-14 w-auto text-[#481819]" />
          <h1 className="mt-5 text-2xl font-medium tracking-wide">DAAR</h1>
          <p className="mt-1 text-sm text-neutral-500">Admin dashboard</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
