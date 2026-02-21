"use client";

import { useEffect } from "react";
import ReactMarkdown from "react-markdown";

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
        className="relative max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto rounded-md bg-zinc-800 border border-zinc-700 p-8 shadow-2xl"
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
        <div className="mt-6">
          {article.body || article.preview ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="font-serif text-stone-300 text-[15px] leading-relaxed mb-4">{children}</p>
                ),
                h1: ({ children }) => (
                  <h1 className="font-serif text-stone-100 text-2xl font-bold mt-6 mb-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-serif text-stone-100 text-xl font-bold mt-5 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-serif text-stone-100 text-lg font-semibold mt-4 mb-2">{children}</h3>
                ),
                strong: ({ children }) => (
                  <strong className="text-stone-200 font-semibold">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-stone-300">{children}</em>
                ),
                a: ({ href, children }) => (
                  <a href={href} className="text-amber-400 underline hover:text-amber-300" target="_blank" rel="noopener noreferrer">{children}</a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-amber-600 pl-4 my-4 text-stone-400 italic">{children}</blockquote>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-4 space-y-1 text-stone-300 text-[15px]">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-1 text-stone-300 text-[15px]">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="font-serif leading-relaxed">{children}</li>
                ),
                code: ({ children }) => (
                  <code className="font-mono text-xs bg-zinc-700 text-cyan-400 px-1.5 py-0.5 rounded">{children}</code>
                ),
                hr: () => <hr className="border-zinc-700 my-6" />,
              }}
            >
              {article.body || article.preview}
            </ReactMarkdown>
          ) : (
            <p className="font-serif text-stone-500 text-[15px]">No content available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
