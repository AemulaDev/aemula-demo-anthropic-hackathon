"use client";

import { AiOutlineLoading3Quarters, AiOutlineCheckCircle } from "react-icons/ai";

export default function LoadingView({ steps = [] }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-8">
      <h2 className="font-sans font-semibold text-xl text-stone-100 mb-4">
        Analyzing your article...
      </h2>
      <div className="flex flex-col gap-4 w-80">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {step.status === "done" ? (
              <AiOutlineCheckCircle className="text-cyan-500 text-xl flex-shrink-0" />
            ) : step.status === "active" ? (
              <AiOutlineLoading3Quarters className="text-cyan-500 text-xl flex-shrink-0 animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-stone-600 flex-shrink-0" />
            )}
            <span
              className={`font-sans text-sm ${
                step.status === "done"
                  ? "text-stone-400"
                  : step.status === "active"
                  ? "text-stone-100"
                  : "text-stone-500"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
