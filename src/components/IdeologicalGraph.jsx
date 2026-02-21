"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function IdeologicalGraph({ highlightedNodes, onNodeClick }) {
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

  // Center camera on demo user node after data loads
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;
    const userNode = graphData.nodes.find((n) => n.id === DEMO_USER_KEY);
    if (!userNode) return;
    const { fx = 0, fy = 0, fz = 0 } = userNode;
    // Slight delay to let ForceGraph3D finish its internal setup
    const timer = setTimeout(() => {
      graphRef.current?.cameraPosition(
        { x: fx + 300, y: fy + 150, z: fz + 300 },
        { x: fx, y: fy, z: fz },
        1000
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [graphData.nodes]);

  const getNodeColor = useCallback(
    (node) => {
      const isDemoUser = node.id === DEMO_USER_KEY;
      const isHighlighted = highlightedNodes?.has(node.id);
      const hasHighlights = highlightedNodes != null;

      if (isDemoUser) return COLOR_DEMO_USER;

      if (!hasHighlights) {
        return node.type === "user" ? COLOR_USER : COLOR_ARTICLE;
      }

      // Highlighting is active
      if (isHighlighted) {
        return COLOR_ARTICLE;
      }

      // Dim non-highlighted nodes
      const base = node.type === "user" ? COLOR_USER : COLOR_ARTICLE;
      return hexToRgba(base, 0.08);
    },
    [highlightedNodes]
  );

  const handleNodeClick = useCallback(
    (node) => {
      if (node.type === "article" && onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

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
          nodeColor={getNodeColor}
          nodeLabel={(node) => node.label}
          nodeRelSize={3}
          linkColor={() => "rgba(255,255,255,0.05)"}
          backgroundColor="#27272a"
          width={dimensions.width}
          height={dimensions.height}
          onNodeClick={handleNodeClick}
        />
      )}
    </div>
  );
}
