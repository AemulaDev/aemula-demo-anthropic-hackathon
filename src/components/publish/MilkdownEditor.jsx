"use client";

import { useRef, useEffect } from "react";

export default function MilkdownEditor({ defaultValue = "", onReady, className = "" }) {
  const containerRef = useRef(null);
  const crepeRef = useRef(null);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      const { Crepe } = await import("@milkdown/crepe");

      if (destroyed || !containerRef.current) return;

      const crepe = new Crepe({
        root: containerRef.current,
        defaultValue,
        featureConfigs: {
          [Crepe.Feature.CodeMirror]: false,
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.Table]: false,
          [Crepe.Feature.BlockEdit]: false,
          [Crepe.Feature.Placeholder]: {
            text: "Begin writing your article...",
          },
        },
      });

      await crepe.create();

      if (destroyed) {
        crepe.destroy();
        return;
      }

      crepeRef.current = crepe;
      onReady?.(crepe);
    }

    init();

    return () => {
      destroyed = true;
      if (crepeRef.current) {
        crepeRef.current.destroy();
        crepeRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className={`milkdown-wrapper ${className}`}
    />
  );
}
