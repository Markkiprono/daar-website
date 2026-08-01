import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daar Admin",
  // The dashboard must never be indexed, even if the host leaks.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-neutral-50 text-neutral-900">{children}</div>;
}
