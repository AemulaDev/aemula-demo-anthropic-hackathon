"use client";

import { AiOutlineCheck, AiOutlineClose, AiOutlineSearch } from "react-icons/ai";

const FLAG_COLORS = {
  grammar: { bg: "bg-amber-900/30", border: "border-amber-700", text: "text-amber-400", label: "Grammar" },
  needs_source: { bg: "bg-cyan-900/30", border: "border-cyan-700", text: "text-cyan-400", label: "Needs Source" },
  counter_argument: { bg: "bg-violet-900/30", border: "border-violet-700", text: "text-violet-400", label: "Counter-Argument" },
  redundant: { bg: "bg-stone-800", border: "border-stone-600", text: "text-stone-400", label: "Redundant" },
  reorder: { bg: "bg-teal-900/30", border: "border-teal-700", text: "text-teal-400", label: "Reorder" },
};

export default function ReviewFlags({ flags = [], onAcceptCorrection, onDismissFlag, onSearchSources }) {
  if (flags.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-stone-500 font-sans text-sm">
        No flags for this block
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {flags.map((flag, i) => {
        const colors = FLAG_COLORS[flag.type] || FLAG_COLORS.grammar;

        return (
          <div
            key={i}
            className={`${colors.bg} border ${colors.border} rounded-lg p-4`}
          >
            {/* Type badge */}
            <span className={`inline-block font-sans text-xs font-medium ${colors.text} uppercase tracking-wider mb-2`}>
              {colors.label}
            </span>

            {/* Detail */}
            <p className="font-sans text-sm text-stone-300 leading-relaxed mb-3">
              {flag.detail}
            </p>

            {/* Type-specific content */}
            {flag.type === "grammar" && flag.correction && (
              <div className="mb-3 p-2 bg-zinc-900 rounded font-mono text-xs text-stone-300 border border-stone-700">
                {flag.correction}
              </div>
            )}

            {flag.type === "needs_source" && flag.claim_text && (
              <div className="mb-3 p-2 bg-zinc-900 rounded text-xs text-stone-400 font-serif italic border border-stone-700">
                &ldquo;{flag.claim_text}&rdquo;
              </div>
            )}

            {flag.type === "counter_argument" && flag.topic && (
              <div className="mb-3 p-2 bg-zinc-900 rounded text-xs text-stone-400 font-sans border border-stone-700">
                Opposing viewpoint: {flag.topic}
              </div>
            )}

            {flag.type === "redundant" && flag.overlaps_with && (
              <div className="mb-3 text-xs text-stone-500 font-sans">
                Overlaps with: <span className="text-stone-400">{flag.overlaps_with}</span>
              </div>
            )}

            {flag.type === "reorder" && flag.suggested_position != null && (
              <div className="mb-3 text-xs text-stone-500 font-sans">
                Suggested position: <span className="text-stone-400">#{flag.suggested_position}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {flag.type === "grammar" && flag.correction && (
                <button
                  onClick={() => onAcceptCorrection?.(i)}
                  className="flex items-center gap-1 font-sans text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <AiOutlineCheck className="text-sm" />
                  Accept
                </button>
              )}
              {flag.type === "needs_source" && (
                <button
                  onClick={() => onSearchSources?.(i)}
                  className="flex items-center gap-1 font-sans text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <AiOutlineSearch className="text-sm" />
                  Search Sources
                </button>
              )}
              <button
                onClick={() => onDismissFlag?.(i)}
                className="flex items-center gap-1 font-sans text-xs text-stone-500 hover:text-stone-300 transition-colors ml-auto"
              >
                <AiOutlineClose className="text-sm" />
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
