"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IdeologicalGraph from "@/components/IdeologicalGraph";
import ArticleModal from "@/components/ArticleModal";

const SUGGESTED_TOPICS = ["Climate Policy", "Tech Ethics", "Press Freedom"];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState("idle"); // idle | searching | highlighting | ranked
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const highlightTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const doSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    setSearchState("searching");
    setHighlightedNodeIds(null);

    try {
      const res = await fetch("/api/search/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSearchResults(data.results);

      // Build highlighted set from result IDs
      const ids = new Set(data.results.map((r) => r.id));
      setHighlightedNodeIds(ids);
      setSearchState("highlighting");

      // Transition to ranked list after 1.5s
      highlightTimerRef.current = setTimeout(() => {
        setSearchState("ranked");
      }, 1500);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchState("idle");
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(searchQuery);
  };

  const handleTopicClick = (topic) => {
    setSearchQuery(topic);
    doSearch(topic);
  };

  const clearSearch = () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setSearchQuery("");
    setSearchState("idle");
    setSearchResults([]);
    setHighlightedNodeIds(null);
  };

  const handleGraphNodeClick = useCallback(async (node) => {
    // Check if we already have full data from search results
    const fromResults = searchResults.find((r) => r.id === node.id);
    if (fromResults) {
      setSelectedArticle(fromResults);
      return;
    }
    // Otherwise fetch from Redis — nodeId is the article id without the "article:" prefix
    try {
      const res = await fetch(`/api/articles/${node.nodeId}`);
      const data = await res.json();
      if (!data.error) {
        setSelectedArticle(data);
      }
    } catch (err) {
      console.error("Failed to fetch article:", err);
    }
  }, [searchResults]);

  const handleResultClick = (result) => {
    setSelectedArticle(result);
  };

  const showGraph = searchState !== "ranked";

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden">
      {/* 3D Graph */}
      <AnimatePresence>
        {showGraph && (
          <motion.div
            key="graph"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <IdeologicalGraph
              highlightedNodes={highlightedNodeIds}
              onNodeClick={handleGraphNodeClick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranked List View */}
      <AnimatePresence>
        {searchState === "ranked" && (
          <motion.div
            key="ranked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 overflow-y-auto bg-zinc-900/95 backdrop-blur-sm"
          >
            <div className="max-w-2xl mx-auto pt-28 pb-16 px-4">
              {/* Demo user anchor */}
              <div className="flex items-center gap-3 mb-6">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shrink-0" />
                <span className="text-sm text-stone-400">
                  Your ideological position
                </span>
              </div>

              {/* Connecting line + articles */}
              <div className="border-l-2 border-zinc-700 ml-1.5 pl-6 space-y-4">
                {searchResults.map((result, i) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left group"
                  >
                    <div className="relative rounded-lg bg-zinc-800 border border-zinc-700 p-4 hover:border-amber-600/50 transition-colors">
                      {/* Rank badge */}
                      <span className="absolute -left-[2.85rem] top-4 w-5 h-5 rounded-full bg-amber-500 text-zinc-900 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>

                      <h3 className="font-serif text-stone-100 text-lg leading-snug group-hover:text-amber-400 transition-colors">
                        {result.title || "Untitled"}
                      </h3>

                      {result.preview && (
                        <p className="mt-1.5 text-sm text-stone-400 line-clamp-2">
                          {result.preview}
                        </p>
                      )}

                      <div className="mt-2 flex gap-3">
                        {result.contextualScore != null && (
                          <span className="text-xs text-amber-500">
                            Relevance{" "}
                            {(1 - result.contextualScore).toFixed(2)}
                          </span>
                        )}
                        {result.ideologicalScore != null && (
                          <span className="text-xs text-cyan-500">
                            Alignment{" "}
                            {result.ideologicalScore.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend — top left, visible only when graph is showing */}
      <AnimatePresence>
        {showGraph && (
          <motion.div
            key="legend"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute top-6 left-6 z-20 px-4 py-3 rounded-lg bg-zinc-800/90 backdrop-blur border border-zinc-700"
          >
            <p className="text-xs font-medium text-stone-400 mb-2 uppercase tracking-wide">
              Perspective Map
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
                <span className="text-xs text-stone-300">You</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs text-stone-300">Articles</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-200 shrink-0" />
                <span className="text-xs text-stone-300">Other Users</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar — always on top */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by topic…"
            className="w-full px-4 py-2.5 pl-10 rounded-lg bg-zinc-800/90 backdrop-blur border border-zinc-700 text-stone-200 text-sm placeholder:text-stone-500 focus:outline-none focus:border-amber-600/60 transition-colors"
          />
          {/* Search icon */}
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>

          {/* Clear button */}
          {searchState !== "idle" && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        {/* Suggested topics */}
        {searchState === "idle" && (
          <div className="flex justify-center gap-2 mt-3">
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => handleTopicClick(topic)}
                className="px-3 py-1 rounded-full text-xs bg-zinc-800/80 border border-zinc-700 text-stone-400 hover:text-amber-400 hover:border-amber-600/40 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {searchState === "searching" && (
          <div className="flex justify-center mt-3">
            <span className="text-xs text-stone-500 animate-pulse">
              Searching ideological space…
            </span>
          </div>
        )}

        {/* Back to graph button when in ranked view */}
        {searchState === "ranked" && (
          <div className="flex justify-center mt-3">
            <button
              onClick={clearSearch}
              className="px-3 py-1 rounded-full text-xs bg-zinc-800/80 border border-zinc-700 text-stone-400 hover:text-stone-200 transition-colors"
            >
              Back to Graph
            </button>
          </div>
        )}
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}
