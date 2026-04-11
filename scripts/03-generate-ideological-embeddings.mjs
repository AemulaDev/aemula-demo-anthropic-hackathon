/**
 * 03-generate-ideological-embeddings.mjs
 *
 * Generates 128-dimensional ideological embeddings for users and articles
 * using a node2vec-style approach implemented in pure JS.
 *
 * Approach:
 *   1. Build bipartite graph with weighted edges
 *   2. Convert negative weights to low transition probabilities (sigmoid)
 *   3. Run biased random walks (node2vec style)
 *   4. Train skip-gram embeddings on the walks
 *
 * This avoids Python/node2vec dependency entirely.
 *
 * Input: data/relationships.json, data/articles.json, data/users.json
 * Output: data/ideological_embeddings.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

// ── Configuration ───────────────────────────────────────────────────
const EMBEDDING_DIM = 128;
const NUM_WALKS = 40;         // walks per node
const WALK_LENGTH = 20;       // steps per walk
const WINDOW_SIZE = 5;        // skip-gram context window
const LEARNING_RATE = 0.025;
const MIN_LEARNING_RATE = 0.0001;
const NEGATIVE_SAMPLES = 5;   // negative sampling count
const EPOCHS = 3;             // passes over all walks

// node2vec parameters
const P = 1.0;   // Return parameter
const Q = 0.5;   // In-out parameter (< 1 = BFS-like, explores local neighborhoods)

// ── Sigmoid for weight transformation ───────────────────────────────
function weightToTransitionProb(weight) {
  // Maps: REPORT(-2) → ~0.05, DISAGREE(-1) → ~0.18, NEUTRAL(0.3) → ~0.61,
  //        SUPPORT(1) → ~0.82, AUTHOR(1.5) → ~0.90
  const k = 1.5;
  return 1.0 / (1.0 + Math.exp(-k * weight));
}

// ── Graph class ─────────────────────────────────────────────────────
class Graph {
  constructor() {
    this.adjacency = new Map(); // nodeId → [{neighbor, weight}]
    this.nodes = new Set();
  }

  addEdge(u, v, weight) {
    this.nodes.add(u);
    this.nodes.add(v);

    if (!this.adjacency.has(u)) this.adjacency.set(u, []);
    if (!this.adjacency.has(v)) this.adjacency.set(v, []);

    // Check for existing edge and update
    const uEdges = this.adjacency.get(u);
    const existing = uEdges.find((e) => e.neighbor === v);
    if (existing) {
      existing.weight = (existing.weight + weight) / 2;
    } else {
      uEdges.push({ neighbor: v, weight });
    }

    // Undirected: add reverse
    const vEdges = this.adjacency.get(v);
    const existingRev = vEdges.find((e) => e.neighbor === u);
    if (existingRev) {
      existingRev.weight = (existingRev.weight + weight) / 2;
    } else {
      vEdges.push({ neighbor: u, weight });
    }
  }

  neighbors(node) {
    return this.adjacency.get(node) || [];
  }

  degree(node) {
    return this.neighbors(node).length;
  }
}

// ── Random walk with node2vec bias ──────────────────────────────────
function randomWalk(graph, startNode, walkLength, p, q) {
  const walk = [startNode];
  if (graph.degree(startNode) === 0) return walk;

  // First step: weighted random from neighbors
  const firstNeighbors = graph.neighbors(startNode);
  walk.push(weightedChoice(firstNeighbors));

  for (let step = 2; step < walkLength; step++) {
    const current = walk[walk.length - 1];
    const prev = walk[walk.length - 2];
    const neighbors = graph.neighbors(current);

    if (neighbors.length === 0) break;

    // node2vec bias: adjust weights based on relationship to prev node
    const prevNeighborSet = new Set(
      graph.neighbors(prev).map((e) => e.neighbor)
    );

    const biasedEdges = neighbors.map((edge) => {
      let bias;
      if (edge.neighbor === prev) {
        // Return to previous node
        bias = 1.0 / p;
      } else if (prevNeighborSet.has(edge.neighbor)) {
        // Neighbor of previous node (BFS-like)
        bias = 1.0;
      } else {
        // Far from previous node (DFS-like)
        bias = 1.0 / q;
      }
      return { neighbor: edge.neighbor, weight: edge.weight * bias };
    });

    walk.push(weightedChoice(biasedEdges));
  }

  return walk;
}

function weightedChoice(edges) {
  const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const edge of edges) {
    r -= edge.weight;
    if (r <= 0) return edge.neighbor;
  }
  return edges[edges.length - 1].neighbor;
}

// ── Skip-gram with negative sampling ────────────────────────────────
class SkipGram {
  constructor(vocabSize, dim) {
    this.dim = dim;
    this.vocabSize = vocabSize;

    // Initialize embeddings with small random values
    this.W = new Array(vocabSize);  // input (target) embeddings
    this.C = new Array(vocabSize);  // context embeddings

    for (let i = 0; i < vocabSize; i++) {
      this.W[i] = new Float32Array(dim);
      this.C[i] = new Float32Array(dim);
      for (let d = 0; d < dim; d++) {
        this.W[i][d] = (Math.random() - 0.5) / dim;
        this.C[i][d] = (Math.random() - 0.5) / dim;
      }
    }

    // Precompute unigram distribution for negative sampling (^0.75 smoothing)
    this.unigramTable = null;
  }

  buildUnigramTable(counts, tableSize = 100000) {
    this.unigramTable = new Int32Array(tableSize);
    const power = 0.75;
    let totalPow = 0;
    const pows = counts.map((c) => Math.pow(c, power));
    totalPow = pows.reduce((a, b) => a + b, 0);

    let idx = 0;
    let cumulative = pows[0] / totalPow;
    for (let i = 0; i < tableSize; i++) {
      this.unigramTable[i] = idx;
      if (i / tableSize > cumulative && idx < counts.length - 1) {
        idx++;
        cumulative += pows[idx] / totalPow;
      }
    }
  }

  sampleNegative(exclude) {
    let sample;
    do {
      sample =
        this.unigramTable[
          Math.floor(Math.random() * this.unigramTable.length)
        ];
    } while (sample === exclude);
    return sample;
  }

  sigmoid(x) {
    if (x > 6) return 1;
    if (x < -6) return 0;
    return 1 / (1 + Math.exp(-x));
  }

  // Train one (target, context) pair with negative sampling
  trainPair(targetIdx, contextIdx, lr) {
    const dim = this.dim;
    const target = this.W[targetIdx];
    const context = this.C[contextIdx];

    // Positive sample
    let dot = 0;
    for (let d = 0; d < dim; d++) dot += target[d] * context[d];
    const grad = (this.sigmoid(dot) - 1) * lr; // gradient for positive

    const tempGrad = new Float32Array(dim);
    for (let d = 0; d < dim; d++) {
      tempGrad[d] = grad * context[d];
      context[d] -= grad * target[d];
    }

    // Negative samples
    for (let n = 0; n < NEGATIVE_SAMPLES; n++) {
      const negIdx = this.sampleNegative(targetIdx);
      const neg = this.C[negIdx];

      let negDot = 0;
      for (let d = 0; d < dim; d++) negDot += target[d] * neg[d];
      const negGrad = this.sigmoid(negDot) * lr;

      for (let d = 0; d < dim; d++) {
        tempGrad[d] += negGrad * neg[d];
        neg[d] -= negGrad * target[d];
      }
    }

    // Update target
    for (let d = 0; d < dim; d++) {
      target[d] -= tempGrad[d];
    }
  }

  getEmbedding(idx) {
    return Array.from(this.W[idx]);
  }
}

// ── Main ────────────────────────────────────────────────────────────
function main() {
  console.log("📂 Loading data...");

  const relationships = JSON.parse(readFileSync("data/relationships.json", "utf-8"));
  const articles = JSON.parse(readFileSync("data/articles.json", "utf-8"));
  const users = JSON.parse(readFileSync("data/users.json", "utf-8"));

  console.log(`   ${relationships.length} relationships`);
  console.log(`   ${articles.length} articles, ${users.length} users`);

  // ── Build graph ─────────────────────────────────────────────────
  console.log("\n🔗 Building bipartite graph...");

  const graph = new Graph();
  const edgeStats = {};

  for (const rel of relationships) {
    const userNode = `user:${rel.user_id}`;
    const articleNode = `article:${rel.article_id}`;
    const transitionProb = weightToTransitionProb(rel.weight);

    graph.addEdge(userNode, articleNode, transitionProb);
    edgeStats[rel.type] = (edgeStats[rel.type] || 0) + 1;
  }

  // Remove isolated nodes
  const connectedNodes = [...graph.nodes].filter((n) => graph.degree(n) > 0);
  console.log(`   ${connectedNodes.length} connected nodes, ${graph.nodes.size} total`);
  console.log(`   Edge types:`, edgeStats);

  // ── Build node index ──────────────────────────────────────────────
  const nodeList = connectedNodes;
  const nodeToIdx = new Map();
  nodeList.forEach((node, idx) => nodeToIdx.set(node, idx));

  // Count node frequencies for unigram distribution
  const nodeCounts = new Array(nodeList.length).fill(1); // base count of 1

  // ── Generate random walks ─────────────────────────────────────────
  console.log(`\n🚶 Generating random walks (${NUM_WALKS} walks × ${nodeList.length} nodes × ${WALK_LENGTH} steps)...`);

  const allWalks = [];
  for (let w = 0; w < NUM_WALKS; w++) {
    if (w % 10 === 0) {
      console.log(`   Walk round ${w + 1}/${NUM_WALKS}...`);
    }
    // Shuffle node order each round
    const shuffled = [...nodeList].sort(() => Math.random() - 0.5);
    for (const node of shuffled) {
      const walk = randomWalk(graph, node, WALK_LENGTH, P, Q);
      // Convert to indices
      const indexWalk = walk.map((n) => nodeToIdx.get(n)).filter((i) => i !== undefined);
      if (indexWalk.length >= 2) {
        allWalks.push(indexWalk);
        // Update frequency counts
        for (const idx of indexWalk) {
          nodeCounts[idx]++;
        }
      }
    }
  }

  console.log(`   Generated ${allWalks.length} walks`);

  // ── Train skip-gram ───────────────────────────────────────────────
  console.log(`\n🧮 Training skip-gram embeddings (dim=${EMBEDDING_DIM}, epochs=${EPOCHS})...`);

  const model = new SkipGram(nodeList.length, EMBEDDING_DIM);
  model.buildUnigramTable(nodeCounts);

  const totalPairs = allWalks.reduce(
    (sum, walk) => sum + walk.length * Math.min(walk.length, WINDOW_SIZE * 2),
    0
  );

  let pairCount = 0;
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const epochStart = Date.now();
    let lr =
      LEARNING_RATE -
      (LEARNING_RATE - MIN_LEARNING_RATE) * (epoch / EPOCHS);

    // Shuffle walks each epoch
    const shuffledWalks = [...allWalks].sort(() => Math.random() - 0.5);

    for (const walk of shuffledWalks) {
      for (let i = 0; i < walk.length; i++) {
        const target = walk[i];
        const windowStart = Math.max(0, i - WINDOW_SIZE);
        const windowEnd = Math.min(walk.length - 1, i + WINDOW_SIZE);

        for (let j = windowStart; j <= windowEnd; j++) {
          if (j === i) continue;
          model.trainPair(target, walk[j], lr);
          pairCount++;
        }
      }
    }

    const elapsed = ((Date.now() - epochStart) / 1000).toFixed(1);
    console.log(
      `   Epoch ${epoch + 1}/${EPOCHS} — ${elapsed}s — lr: ${lr.toFixed(6)}`
    );
  }

  console.log(`   Trained on ${pairCount.toLocaleString()} pairs total`);

  // ── Extract embeddings ────────────────────────────────────────────
  console.log("\n📊 Extracting embeddings...");

  const embeddings = {};
  let userCount = 0;
  let articleCount = 0;

  for (let i = 0; i < nodeList.length; i++) {
    const nodeId = nodeList[i];
    embeddings[nodeId] = model.getEmbedding(i);

    if (nodeId.startsWith("user:")) userCount++;
    else articleCount++;
  }

  // ── Validate: show nearest neighbors for a few nodes ──────────────
  console.log("\n🔍 Validation — nearest neighbors for sample articles:");

  const articleNodes = nodeList.filter((n) => n.startsWith("article:")).slice(0, 3);
  for (const articleNode of articleNodes) {
    const vec = embeddings[articleNode];
    const similarities = [];

    for (const [otherNode, otherVec] of Object.entries(embeddings)) {
      if (otherNode === articleNode) continue;
      const sim = cosineSimilarity(vec, otherVec);
      similarities.push({ node: otherNode, sim });
    }

    similarities.sort((a, b) => b.sim - a.sim);

    const articleId = articleNode.replace("article:", "");
    const article = articles.find((a) => a.id === articleId);
    const title = article ? article.title.slice(0, 40) : articleId.slice(0, 20);

    console.log(`\n   "${title}...":`);
    similarities.slice(0, 5).forEach((s) => {
      const type = s.node.startsWith("user:") ? "user" : "article";
      const id = s.node.split(":")[1].slice(0, 16);
      console.log(`     ${type}:${id}... (sim: ${s.sim.toFixed(3)})`);
    });
  }

  // ── Save ──────────────────────────────────────────────────────────
  const output = {
    metadata: {
      dimension: EMBEDDING_DIM,
      num_users: userCount,
      num_articles: articleCount,
      num_walks: NUM_WALKS,
      walk_length: WALK_LENGTH,
      p: P,
      q: Q,
      epochs: EPOCHS,
    },
    embeddings,
  };

  writeFileSync("data/ideological_embeddings.json", JSON.stringify(output));

  const fileSizeMB = (
    Buffer.byteLength(JSON.stringify(output)) /
    1024 /
    1024
  ).toFixed(2);

  console.log(`\n✅ Saved data/ideological_embeddings.json (${fileSizeMB} MB)`);
  console.log(`   ${userCount} user embeddings + ${articleCount} article embeddings`);
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
}

main();
