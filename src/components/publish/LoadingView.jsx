"use client";

import { AiOutlineLoading3Quarters, AiOutlineCheckCircle } from "react-icons/ai";

const isPolishingMode = (steps) =>
  steps.length === 1 && steps[0].label === "Polishing article";

export default function LoadingView({ steps = [] }) {
  if (isPolishingMode(steps)) {
    return (
      <>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          .shimmer-text {
            background: linear-gradient(
              90deg,
              #0e7490 0%,
              #06b6d4 35%,
              #a5f3fc 50%,
              #06b6d4 65%,
              #0e7490 100%
            );
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 4s linear infinite;
          }
        `}</style>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
          <h2 className="font-sans font-light text-3xl shimmer-text">
            Polishing article...
          </h2>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-8">
      <h2 className="font-sans font-light text-3xl text-stone-100 mb-4">
        Analyzing your article...
      </h2>
      <div className="flex flex-col gap-4 w-fit">
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
