"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import BlockItem from "./BlockItem";
import ReviewFlags from "./ReviewFlags";

export default function BlockEditorView({
  initialBlocks,
  initialFlags,
  topicSummary,
  keyArguments,
  onBackToDraft,
  onFinalReview,
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [flagsByBlock, setFlagsByBlock] = useState(initialFlags);
  const [selectedBlockId, setSelectedBlockId] = useState(
    initialBlocks[0]?.id || null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const addBlock = () => {
    const id = "block_" + Date.now();
    setBlocks((prev) => [
      ...prev,
      { id, summary: "New block", text_content: "" },
    ]);
    setFlagsByBlock((prev) => ({ ...prev, [id]: [] }));
    setSelectedBlockId(id);
  };

  const deleteBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setFlagsByBlock((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedBlockId === id) {
      setSelectedBlockId(blocks.find((b) => b.id !== id)?.id || null);
    }
  };

  const updateText = (id, text) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, text_content: text } : b))
    );
  };

  const acceptCorrection = (flagIndex) => {
    if (!selectedBlockId) return;
    const flags = flagsByBlock[selectedBlockId] || [];
    const flag = flags[flagIndex];
    if (!flag || flag.type !== "grammar" || !flag.correction) return;

    // Remove the flag
    setFlagsByBlock((prev) => ({
      ...prev,
      [selectedBlockId]: prev[selectedBlockId].filter((_, i) => i !== flagIndex),
    }));
  };

  const dismissFlag = (flagIndex) => {
    if (!selectedBlockId) return;
    setFlagsByBlock((prev) => ({
      ...prev,
      [selectedBlockId]: prev[selectedBlockId].filter((_, i) => i !== flagIndex),
    }));
  };

  const searchSources = () => {
    // Placeholder for source search
    alert("Source search coming soon (requires Exa or web search integration)");
  };

  const selectedFlags = selectedBlockId
    ? flagsByBlock[selectedBlockId] || []
    : [];

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left column — blocks */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Topic summary */}
          {topicSummary && (
            <div className="mb-6">
              <h2 className="font-serif text-xl text-stone-100 mb-2">
                {topicSummary}
              </h2>
              {keyArguments && keyArguments.length > 0 && (
                <ul className="list-disc list-inside text-sm text-stone-400 font-sans space-y-1">
                  {keyArguments.map((arg, i) => (
                    <li key={i}>{arg}</li>
                  ))}
                </ul>
              )}
              <div className="border-b border-stone-700 mt-4" />
            </div>
          )}

          {/* Sortable blocks */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {blocks.map((block) => (
                  <BlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    flagCount={
                      (flagsByBlock[block.id] || []).length
                    }
                    onSelect={setSelectedBlockId}
                    onDelete={deleteBlock}
                    onUpdateText={updateText}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add block */}
          <button
            onClick={addBlock}
            className="mt-4 w-full py-3 border border-dashed border-stone-600 rounded-lg text-stone-500 hover:text-stone-300 hover:border-stone-400 font-sans text-sm transition-colors"
          >
            + Add Block
          </button>
        </div>
      </div>

      {/* Right column — flags */}
      <div className="w-80 border-l border-stone-700 overflow-y-auto p-6 flex-shrink-0">
        <h3 className="font-sans text-xs uppercase tracking-wider text-stone-500 mb-4">
          Review Flags
        </h3>
        {selectedBlockId ? (
          <ReviewFlags
            flags={selectedFlags}
            onAcceptCorrection={acceptCorrection}
            onDismissFlag={dismissFlag}
            onSearchSources={searchSources}
          />
        ) : (
          <p className="text-stone-500 font-sans text-sm">
            Select a block to view flags
          </p>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <button
          onClick={onBackToDraft}
          className="font-sans text-sm px-4 py-2.5 text-stone-400 hover:text-stone-200 border border-stone-600 rounded-md hover:border-stone-500 transition-colors"
        >
          Back to Draft
        </button>
        <button
          onClick={() => onFinalReview(blocks)}
          className="font-sans text-sm font-medium px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md shadow-lg transition-colors"
        >
          Final Review
        </button>
      </div>
    </div>
  );
}
