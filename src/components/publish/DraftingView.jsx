"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import MilkdownEditor from "./MilkdownEditor";

export default function DraftingView({ onBeginReview }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [defaultBody, setDefaultBody] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const crepeRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  useEffect(() => {
    fetch("/api/articles/drafts")
      .then((r) => r.json())
      .then((data) => setDrafts(data.drafts || []))
      .catch(() => {});
  }, []);

  const handleReady = useCallback((crepe) => {
    crepeRef.current = crepe;
  }, []);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const loadDraft = async (filename) => {
    setShowDrafts(false);
    try {
      const res = await fetch(`/api/articles/drafts/${filename}`);
      const data = await res.json();
      setTitle(data.title || "");
      setSubtitle(data.subtitle || "");
      setDefaultBody(data.body || "");
      setEditorKey((k) => k + 1);
      // Trigger auto-resize after state update
      setTimeout(() => {
        autoResize(titleRef.current);
        autoResize(subtitleRef.current);
      }, 0);
    } catch (err) {
      console.error("Failed to load draft:", err);
    }
  };

  const handleBeginReview = () => {
    const body = crepeRef.current?.getMarkdown?.() || "";
    if (!body.trim()) return;
    onBeginReview({ title, subtitle, body });
  };

  return (
    <div className="flex flex-col pb-20">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4">
        <div />
        <div className="relative">
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="font-sans text-sm text-stone-400 hover:text-stone-200 px-3 py-1.5 border border-stone-600 rounded-md hover:border-stone-500 transition-colors"
          >
            Load Draft
          </button>
          {showDrafts && drafts.length > 0 && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-zinc-800 border border-stone-600 rounded-md shadow-lg z-50 overflow-hidden">
              {drafts.map((d) => (
                <button
                  key={d.filename}
                  onClick={() => loadDraft(d.filename)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-700 transition-colors border-b border-stone-700 last:border-0"
                >
                  <div className="font-sans text-sm text-stone-200 truncate">
                    {d.title}
                  </div>
                  <div className="font-sans text-xs text-stone-500 truncate mt-0.5">
                    {d.preview}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
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
      <div className="px-8 mt-2 max-w-5xl mx-auto w-full">
        <div className="border-b border-stone-700 my-4" />
      </div>

      {/* Editor */}
      <div className="px-8 mt-2">
        <div className="max-w-5xl mx-auto w-full">
          <div className="mx-8">
            <MilkdownEditor
              key={editorKey}
              defaultValue={defaultBody}
              onReady={handleReady}
              className="min-h-100"
          />
          </div>
        </div>
      </div>

      {/* Begin Review button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleBeginReview}
          className="font-sans text-sm font-medium px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md shadow-lg transition-colors"
        >
          Begin Review
        </button>
      </div>
    </div>
  );
}
