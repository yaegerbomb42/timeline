"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Clock3 } from "lucide-react";

import type { Chat } from "@/lib/chats";

export function ChatFeed({
  chats,
  loading,
  error,
}: {
  chats: Chat[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-white/50 backdrop-blur-sm shadow-[0_14px_50px_var(--shadow)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-2 text-[color:var(--ink)]">
          <Bookmark className="h-4 w-4 text-[color:var(--brass-2)]" />
          <div className="font-sans text-sm">Entries</div>
        </div>
        <div className="mt-1 text-xs text-[color:var(--muted)]">
          Newest at the top, always.
        </div>
      </div>

      <div className="px-3 py-3">
        {error ? (
          <div className="mx-3 my-3 rounded-2xl border border-[rgba(140,60,40,0.25)] bg-[rgba(140,60,40,0.06)] px-4 py-3 text-sm text-[color:var(--ink)]">
            {error}
          </div>
        ) : null}

        {loading && chats.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[color:var(--muted)]">Loading…</div>
        ) : null}

        {!loading && chats.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[color:var(--muted)]">
            No entries yet. Write one above and watch the line remember you.
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {chats.map((c) => (
            <motion.article
              key={c.id}
              id={`chat-${c.id}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="group rounded-2xl border border-transparent hover:border-[var(--line)] hover:bg-white/60 transition-colors px-4 py-3 mx-3 my-2"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)] font-mono">
                  <Clock3 className="h-3.5 w-3.5 opacity-70" />
                  <span>{format(c.createdAt, "PPP p")}</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)] font-sans opacity-0 group-hover:opacity-100 transition-opacity">
                  badge added
                </div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[color:var(--ink)]">
                {c.text}
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}


