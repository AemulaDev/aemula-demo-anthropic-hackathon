"use client";

import { useEffect } from "react";

export default function ArticleModal({ article, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!article) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto rounded-xl bg-zinc-800 border border-zinc-700 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors text-xl leading-none"
        >
          &times;
        </button>

        {/* Title */}
        <h2 className="font-serif text-2xl text-stone-100 leading-tight pr-8">
          {article.title || "Untitled"}
        </h2>

        {/* Author */}
        {article.authorId && (
          <p className="mt-2 text-xs text-stone-500 font-mono truncate">
            {article.authorId}
          </p>
        )}

        {/* Scores */}
        <div className="mt-3 flex gap-3">
          {article.contextualScore != null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
              Relevance {(1 - article.contextualScore).toFixed(2)}
            </span>
          )}
          {article.ideologicalScore != null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-400">
              Alignment {article.ideologicalScore.toFixed(2)}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="mt-6 font-serif text-stone-300 text-[15px] leading-relaxed whitespace-pre-wrap">
          {article.body || article.preview || "No content available."}
        </div>
      </div>
    </div>
  );
}
