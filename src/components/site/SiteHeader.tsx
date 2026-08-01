import { SiteNav } from "./SiteNav";
import { getLogo } from "@/lib/logo";

/**
 * Server wrapper around the navbar. Its only job is to resolve the logo —
 * a database read plus a filesystem read, neither of which can happen inside
 * the client component that owns the scroll and drawer state.
 */
export async function SiteHeader({ solid = false }: { solid?: boolean }) {
  // Header shows the lettering alone. Prefer the "DAAR by izzi" lockup, fall
  // back to the plain DAAR wordmark — either beats a substitute typeface.
  const [full, word] = await Promise.all([getLogo("full"), getLogo("wordmark")]);
  return <SiteNav solid={solid} wordmark={full ?? word} />;
}
