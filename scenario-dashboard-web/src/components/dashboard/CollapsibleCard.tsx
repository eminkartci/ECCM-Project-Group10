"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { CARD_STORAGE_KEY } from "@/lib/constants";

type Props = {
  cardId: string;
  title: string;
  tools?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

/** `true` = expanded (matches legacy sessionStorage value). */
function readStoredExpanded(cardId: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(CARD_STORAGE_KEY) || "{}") as Record<string, boolean>;
    if (Object.prototype.hasOwnProperty.call(stored, cardId)) {
      return stored[cardId];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function CollapsibleCard({ cardId, title, tools, children, defaultOpen = true }: Props) {
  const reactId = useId();
  const bodyId = `${reactId}-body`;
  const [expanded, setExpanded] = useState(defaultOpen);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = readStoredExpanded(cardId);
      if (s === true) setExpanded(true);
      else if (s === false) setExpanded(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [cardId]);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        const raw = sessionStorage.getItem(CARD_STORAGE_KEY) || "{}";
        const o = JSON.parse(raw) as Record<string, boolean>;
        o[cardId] = next;
        sessionStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(o));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [cardId]);

  return (
    <section
      className="rounded-xl border border-slate-700/80 bg-slate-900/50 shadow-lg shadow-black/20 backdrop-blur-sm"
      data-collapsed={expanded ? "false" : "true"}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-100 hover:text-white"
        >
          <span
            className="inline-block shrink-0 text-slate-400 transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            aria-hidden
          >
            ▸
          </span>
          {title}
        </button>
        {tools ? <div className="flex shrink-0 flex-wrap items-center gap-2">{tools}</div> : null}
      </div>
      {expanded ? (
        <div id={bodyId} className="px-4 py-4 text-sm text-slate-300">
          {children}
        </div>
      ) : null}
    </section>
  );
}
