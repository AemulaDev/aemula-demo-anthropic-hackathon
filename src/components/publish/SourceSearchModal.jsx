"use client";

import { useEffect, useState } from "react";
import { AiOutlineClose, AiOutlineLink, AiOutlineCheck } from "react-icons/ai";

export default function SourceSearchModal({
  isOpen,
  claimText,
  articleContext,
  onAccept,
  onClose,
}) {
  // null = loading, { sources } | { error } = done
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen || !claimText) return;

    let cancelled = false;

    fetch("/api/editorial/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimText, articleContext }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setResult({ error: data.error });
        } else {
          setResult({ sources: data.sources || [] });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({ error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, claimText, articleContext]);

  if (!isOpen) return null;

  const isLoading = result === null;
  const errorMsg = result?.error;
  const sources = result?.sources;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-stone-700 rounded-lg w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <h2 className="font-sans text-sm font-medium text-stone-200">
            Source Search
          </h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300 transition-colors"
          >
            <AiOutlineClose />
          </button>
        </div>

        {/* Claim */}
        <div className="px-5 pt-4">
          <p className="font-sans text-xs text-stone-500 uppercase tracking-wider mb-2">
            Claim
          </p>
          <p className="font-serif text-sm text-stone-300 italic border-l-2 border-cyan-600 pl-3">
            &ldquo;{claimText}&rdquo;
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 min-h-[160px] flex flex-col gap-3">
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-stone-500">
              <div className="w-5 h-5 border-2 border-stone-600 border-t-cyan-500 rounded-full animate-spin" />
              <p className="font-sans text-sm">Searching for sources…</p>
            </div>
          )}

          {errorMsg && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-sans text-sm text-red-400">
                {errorMsg || "Something went wrong."}
              </p>
            </div>
          )}

          {sources &&
            sources.map((source, i) => (
              <div
                key={i}
                className="bg-zinc-800 border border-stone-700 rounded-lg p-4"
              >
                <p className="font-sans text-sm font-medium text-stone-100 mb-1 leading-snug">
                  {source.title}
                </p>
                <p className="font-sans text-xs text-stone-400 leading-relaxed mb-2">
                  {source.description}
                </p>
                <p className="font-sans text-xs text-stone-600 truncate mb-3">
                  {source.url}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-sans text-xs text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    <AiOutlineLink className="text-sm" />
                    Open
                  </a>
                  <button
                    onClick={() => {
                      onAccept(source);
                      onClose();
                    }}
                    className="flex items-center gap-1 font-sans text-xs text-cyan-400 hover:text-cyan-300 transition-colors ml-auto"
                  >
                    <AiOutlineCheck className="text-sm" />
                    Use as source
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
