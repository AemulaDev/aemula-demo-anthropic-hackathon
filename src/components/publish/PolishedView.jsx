"use client";

import { useState, useRef, useCallback } from "react";
import MilkdownEditor from "./MilkdownEditor";

export default function PolishedView({
  initialTitle,
  initialSubtitle,
  polishedMarkdown,
  onBackToBlocks,
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [subtitle, setSubtitle] = useState(initialSubtitle || "");
  const crepeRef = useRef(null);

  const handleReady = useCallback((crepe) => {
    crepeRef.current = crepe;
  }, []);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handlePublish = () => {
    alert("Published! (Demo)");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-8 py-4 flex-shrink-0">
        <span className="inline-block font-sans text-xs uppercase tracking-wider text-cyan-500 mb-4">
          Polished Article
        </span>
      </div>

      {/* Title */}
      <div className="px-8 max-w-3xl mx-auto w-full flex-shrink-0">
        <textarea
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            autoResize(e.target);
          }}
          placeholder="Article title"
          rows={1}
          className="w-full font-serif text-4xl font-bold text-stone-100 bg-transparent border-none outline-none resize-none placeholder:text-stone-600 overflow-hidden"
        />
        <textarea
          value={subtitle}
          onChange={(e) => {
            setSubtitle(e.target.value);
            autoResize(e.target);
          }}
          placeholder="Subtitle"
          rows={1}
          className="w-full font-serif text-xl text-stone-400 bg-transparent border-none outline-none resize-none placeholder:text-stone-600 mt-2 overflow-hidden"
        />
      </div>

      {/* Divider */}
      <div className="px-8 max-w-3xl mx-auto w-full flex-shrink-0">
        <div className="border-b border-stone-700 my-4" />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8">
        <div className="max-w-3xl mx-auto w-full">
          <MilkdownEditor
            defaultValue={polishedMarkdown}
            onReady={handleReady}
            className="min-h-[400px]"
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <button
          onClick={onBackToBlocks}
          className="font-sans text-sm px-4 py-2.5 text-stone-400 hover:text-stone-200 border border-stone-600 rounded-md hover:border-stone-500 transition-colors"
        >
          Back to Blocks
        </button>
        <button
          onClick={handlePublish}
          className="font-sans text-sm font-medium px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md shadow-lg transition-colors"
        >
          Publish
        </button>
      </div>
    </div>
  );
}
