"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  AiOutlineHolder,
  AiOutlineDown,
  AiOutlineUp,
  AiOutlineClose,
  AiOutlineFlag,
  AiOutlineCheckCircle,
} from "react-icons/ai";

export default function BlockItem({
  block,
  isSelected,
  flagCount = 0,
  onSelect,
  onDelete,
  onUpdateText,
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(block.id)}
      className={`group relative bg-zinc-800 rounded-lg border transition-colors cursor-pointer ${
        isSelected
          ? "border-cyan-500"
          : "border-stone-700 hover:border-stone-500"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="mt-1 text-stone-500 hover:text-stone-300 cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <AiOutlineHolder className="text-lg" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {flagCount > 0 ? (
              <span className="flex items-center gap-1 text-xs font-sans text-amber-400">
                <AiOutlineFlag className="text-sm" />
                {flagCount}
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <AiOutlineCheckCircle className="text-sm text-cyan-500" />
              </span>
            )}
          </div>

          <p className="font-serif text-sm text-stone-300 leading-relaxed">
            {block.summary}
          </p>

          {expanded && (
            <textarea
              value={block.text_content}
              onChange={(e) => {
                e.stopPropagation();
                onUpdateText(block.id, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full mt-3 p-3 bg-zinc-900 border border-stone-700 rounded text-sm font-serif text-stone-300 leading-relaxed resize-none outline-none focus:border-stone-500 min-h-[120px]"
              rows={6}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
          >
            {expanded ? (
              <AiOutlineUp className="text-sm" />
            ) : (
              <AiOutlineDown className="text-sm" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
            className="p-1 text-stone-500 hover:text-red-400 transition-colors"
          >
            <AiOutlineClose className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
