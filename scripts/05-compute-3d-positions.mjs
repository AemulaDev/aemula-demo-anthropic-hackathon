/**
 * 05-compute-3d-positions.mjs
 *
 * Reduces 128d ideological embeddings to 3D coordinates using UMAP-JS.
 * Pre-computed so the browser renders the graph instantly.
 *
 * Input: data/ideological_embeddings.json
 * Output: data/3d_positions.json
 */

import { readFileSync, writeFileSync } from "fs";
import { UMAP } from "umap-js";

const POSITION_SCALE = 100.0;

function main() {
  console.log("📂 Loading ideological embeddings...");

  const data = JSON.parse(readFileSync("data/ideological_embeddings.json", "utf-8"));
  const { embeddings, metadata } = data;

  const nodeIds = Object.keys(embeddings);
  console.log(`   ${nodeIds.length} nodes (${metadata.num_users} users, ${metadata.num_articles} articles)`);
  console.log(`   Dimension: ${metadata.dimension}`);

  // Build array of vectors
  const vectors = nodeIds.map((id) => embeddings[id]);

  console.log(`\n🧮 Running UMAP: ${metadata.dimension}d → 3d...`);

  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: Math.min(15, Math.floor(nodeIds.length / 3)), // scale for small datasets
    minDist: 0.3,
    spread: 1.0,
    nEpochs: 500,
  });

  const coords3d = umap.fit(vectors);

  // Center and scale
  const xs = coords3d.map((c) => c[0]);
  const ys = coords3d.map((c) => c[1]);
  const zs = coords3d.map((c) => c[2]);

  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const meanZ = zs.reduce((a, b) => a + b, 0) / zs.length;

  const centered = coords3d.map((c) => [
    c[0] - meanX,
    c[1] - meanY,
    c[2] - meanZ,
  ]);

  const maxExtent = Math.max(
    ...centered.map((c) => Math.max(Math.abs(c[0]), Math.abs(c[1]), Math.abs(c[2])))
  );

  const scaled = centered.map((c) => [
    (c[0] / maxExtent) * POSITION_SCALE,
    (c[1] / maxExtent) * POSITION_SCALE,
    (c[2] / maxExtent) * POSITION_SCALE,
  ]);

  // Build output
  const positions = {};
  let userPositions = 0;
  let articlePositions = 0;

  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    const [x, y, z] = scaled[i];
    const type = nodeId.startsWith("user:") ? "user" : "article";
    const rawId = nodeId.split(":").slice(1).join(":"); // handle colons in IDs

    positions[nodeId] = {
      id: rawId,
      type,
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
      z: Math.round(z * 10000) / 10000,
    };

    if (type === "user") userPositions++;
    else articlePositions++;
  }

  const output = {
    metadata: {
      position_scale: POSITION_SCALE,
      num_users: userPositions,
      num_articles: articlePositions,
    },
    positions,
  };

  writeFileSync("data/3d_positions.json", JSON.stringify(output, null, 2));

  console.log(`\n✅ Saved data/3d_positions.json`);
  console.log(`   ${userPositions} user positions, ${articlePositions} article positions`);
  console.log(`   Position range: [-${POSITION_SCALE}, ${POSITION_SCALE}]`);

  // Quick stats
  const userCoords = scaled.filter((_, i) => nodeIds[i].startsWith("user:"));
  const articleCoords = scaled.filter((_, i) => nodeIds[i].startsWith("article:"));

  if (userCoords.length > 0 && articleCoords.length > 0) {
    const spread = (coords) => {
      const mean = coords.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]).map(v => v / coords.length);
      const dists = coords.map((c) => Math.sqrt((c[0]-mean[0])**2 + (c[1]-mean[1])**2 + (c[2]-mean[2])**2));
      return (dists.reduce((a, b) => a + b, 0) / dists.length).toFixed(1);
    };
    console.log(`\n📊 Avg spread — users: ${spread(userCoords)}, articles: ${spread(articleCoords)}`);
  }
}

main();
