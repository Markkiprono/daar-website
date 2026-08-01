import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { setMessageStatus, deleteMessage } from "@/app/actions/messages";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Messages must never be served stale. */
export const dynamic = "force-dynamic";

function when(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminMessagesPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const [unread, read, archived] = await Promise.all([
    db.message.findMany({ where: { status: "UNREAD" }, orderBy: { createdAt: "desc" } }),
    db.message.findMany({ where: { status: "READ" }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.message.count({ where: { status: "ARCHIVED" } }),
  ]);

  const Row = ({ m }: { m: (typeof unread)[number] }) => (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{m.name}</p>
            {m.status === "UNREAD" && <Badge className="bg-[#481819]">New</Badge>}
            {m.subject && <Badge variant="secondary">{m.subject}</Badge>}
          </div>

          <p className="mt-1 text-sm">
            <a href={`mailto:${m.email}`} className="text-[#481819] hover:underline">
              {m.email}
            </a>
            {m.phone && (
              <>
                <span className="px-2 text-neutral-300">·</span>
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {m.phone}
                </a>
              </>
            )}
          </p>

          {/* whitespace-pre-line keeps the sender's line breaks */}
          <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">{m.body}</p>

          <p className="mt-2 text-xs text-neutral-400">{when(m.createdAt)}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          {/* This Button is Base UI, not Radix — no asChild. Style the link. */}
          <a
            href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? "your message"}`)}`}
            className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full text-xs"}
          >
            Reply
          </a>

          {m.status !== "READ" && (
            <form action={setMessageStatus}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="READ" />
              <Button type="submit" size="sm" className="w-full text-xs">
                Mark read
              </Button>
            </form>
          )}
          {m.status !== "UNREAD" && (
            <form action={setMessageStatus}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="UNREAD" />
              <Button type="submit" size="sm" variant="ghost" className="w-full text-xs">
                Mark unread
              </Button>
            </form>
          )}
          <form action={setMessageStatus}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value="ARCHIVED" />
            <Button type="submit" size="sm" variant="ghost" className="w-full text-xs">
              Archive
            </Button>
          </form>
          <form action={deleteMessage}>
            <input type="hidden" name="id" value={m.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Messages</h1>
        <p className="text-sm text-neutral-500">
          {unread.length > 0 ? `${unread.length} unread` : "Nothing unread"}
          {archived > 0 ? ` · ${archived} archived` : ""}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          Unread ({unread.length})
        </h2>
        {unread.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            No new messages.
          </p>
        ) : (
          <ul className="space-y-2">
            {unread.map((m) => (
              <Row key={m.id} m={m} />
            ))}
          </ul>
        )}
      </section>

      {read.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Read ({read.length})
          </h2>
          <ul className="space-y-2 opacity-75">
            {read.map((m) => (
              <Row key={m.id} m={m} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
