"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  const handleReady = useCallback((crepe) => {
    crepeRef.current = crepe;
  }, []);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => {
    autoResize(titleRef.current);
    autoResize(subtitleRef.current);
  }, [title, subtitle]);

  const handlePublish = () => {
    alert("Published! (Demo)");
  };

  return (
    <div className="flex flex-col pb-20">
      {/* Header */}
      <div className="px-8 py-4">
        <span className="inline-block font-sans text-xs uppercase tracking-wider text-cyan-500 mb-4">
          Polished Article
        </span>
      </div>

      {/* Title */}
      <div className="px-8 max-w-5xl mx-auto w-full">
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            autoResize(e.target);
          }}
          placeholder="Article title"
          rows={1}
          className="w-full font-serif text-4xl font-light text-stone-100 bg-transparent border-none outline-none resize-none placeholder:text-stone-100/50 overflow-hidden"
        />
        <textarea
          ref={subtitleRef}
          value={subtitle}
          onChange={(e) => {
            setSubtitle(e.target.value);
            autoResize(e.target);
          }}
          placeholder="Subtitle"
          rows={1}
          className="w-full font-serif font-light text-2xl text-stone-100/70 bg-transparent border-none outline-none resize-none placeholder:text-stone-100/50 mt-2 overflow-hidden"
        />
      </div>

      {/* Divider */}
      <div className="px-8 max-w-5xl mx-auto w-full">
        <div className="border-b border-stone-700 my-4" />
      </div>

      {/* Editor */}
      <div className="px-8">
        <div className="max-w-5xl mx-auto w-full">
          <div className="mx-8">
            <MilkdownEditor
              defaultValue={polishedMarkdown}
              onReady={handleReady}
              className="min-h-[400px]"
            />
          </div>
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
