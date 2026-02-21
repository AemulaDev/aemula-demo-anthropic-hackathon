"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

const DEMO_USER_KEY = process.env.NEXT_PUBLIC_DEMO_USER_ID
  ? `user:${process.env.NEXT_PUBLIC_DEMO_USER_ID}`
  : null;

const COLOR_DEMO_USER = "#06B6D4";
const COLOR_ARTICLE = "#F59E0B";
const COLOR_USER = "#D1D5DB";

function nodeColor(node) {
  if (node.type === "user") {
    return node.id === DEMO_USER_KEY ? COLOR_DEMO_USER : COLOR_USER;
  }
  return COLOR_ARTICLE;
}

export default function IdeologicalGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const graphRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    fetch("/api/graph/nodes")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const userCount = data.nodes.filter((n) => n.type === "user").length;
        const articleCount = data.nodes.filter((n) => n.type === "article").length;
        console.log(`[IdeologicalGraph] nodes loaded — users: ${userCount}, articles: ${articleCount}, total: ${data.nodes.length}`);
        setGraphData({ nodes: data.nodes, links: [] });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Kill all forces so pre-computed positions are respected
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.d3Force("link", null);
    graphRef.current.d3Force("charge", null);
    graphRef.current.d3Force("center", null);
  }, [graphData.nodes.length]);

  return (
    <div ref={containerRef} className="w-full h-full">
      {loading && (
        <div className="flex items-center justify-center w-full h-full text-stone-400 text-sm">
          Loading ideological space…
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center w-full h-full text-red-400 text-sm">
          Failed to load graph: {error}
        </div>
      )}
      {!loading && !error && dimensions.width > 0 && (
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData}
          nodeColor={nodeColor}
          nodeLabel={(node) => node.label}
          nodeRelSize={3}
          linkColor={() => "rgba(255,255,255,0.05)"}
          backgroundColor="#0c0a09"
          width={dimensions.width}
          height={dimensions.height}
        />
      )}
    </div>
  );
}
