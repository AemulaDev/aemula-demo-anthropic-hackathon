/**
 * INCLUDING ONLY FOR REFERENCE IN HOW WE SEEDED OUR REDIS DB WITH TEST DATA
 * THIS WAS DONE SEPARATELY AND PRE-HACKATHON IN PREPARATION
 * 06-seed-redis.mjs
 *
 * Loads all prepared data into Redis Cloud:
 *   - Article metadata as hashes
 *   - User metadata as hashes
 *   - Ideological vector index (128d, COSINE, HNSW) — users + articles
 *   - Contextual vector index (1024d/1536d, COSINE, HNSW) — articles only
 *   - 3D positions on each node hash
 *
 * Redis Cloud setup:
 *   1. https://redis.io/cloud/ — create free account
 *   2. Create Fixed subscription (free tier: 30MB)
 *   3. Create database with "RediSearch" module enabled
 *   4. Copy connection string to REDIS_URL in .env
 */

import { createClient, SchemaFieldTypes, VectorAlgorithms } from "redis";
import { readFileSync, existsSync, readdirSync } from "fs";
import { config } from "dotenv";

config();

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("❌ REDIS_URL is required in .env");
  console.error("   Format: redis://default:<password>@<host>:<port>");
  process.exit(1);
}

function loadRequired(path, stepName) {
  if (!existsSync(path)) {
    console.error(`❌ ${path} not found. Run ${stepName} first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

// Convert JS number array to Float32 Buffer (Redis vector format)
function vecToBuffer(vec) {
  return Buffer.from(new Float32Array(vec).buffer);
}

async function main() {
  console.log("📂 Loading data files...");

  const articles = loadRequired("data/articles.json", "step1:parse");
  const users = loadRequired("data/users.json", "step1:parse");

  const ideoData = loadRequired("data/ideological_embeddings.json", "step3:embed-ideological");
  const ideoEmbeddings = ideoData.embeddings;
  const ideoDim = ideoData.metadata.dimension;

  const ctxData = loadRequired("data/contextual_embeddings.json", "step4:embed-contextual");
  const ctxEmbeddings = ctxData.embeddings;
  const ctxDim = ctxData.metadata.dimension;

  const posData = loadRequired("data/3d_positions.json", "step5:compute-3d");
  const positions = posData.positions;

  const contentDir = "data/article_content";
  const hasContent = existsSync(contentDir);

  console.log(`   ${articles.length} articles, ${users.length} users`);
  console.log(`   ${Object.keys(ideoEmbeddings).length} ideological embeddings (${ideoDim}d)`);
  console.log(`   ${Object.keys(ctxEmbeddings).length} contextual embeddings (${ctxDim}d)`);
  console.log(`   ${Object.keys(positions).length} 3D positions`);
  console.log(`   Article content: ${hasContent ? "available" : "not found"}`);

  // ── Connect ─────────────────────────────────────────────────────
  console.log("\n🔌 Connecting to Redis...");
  const client = createClient({ url: REDIS_URL });
  client.on("error", (err) => console.error("Redis error:", err));
  await client.connect();
  console.log("   Connected!");

  // ── Clear existing data ─────────────────────────────────────────
  console.log("\n🗑 Clearing existing data...");

  for (const idx of ["idx:ideological", "idx:contextual"]) {
    try {
      await client.ft.dropIndex(idx);
      console.log(`   Dropped index: ${idx}`);
    } catch {
      // Didn't exist
    }
  }

  for (const prefix of ["article:", "user:"]) {
    let cursor = 0;
    let deleted = 0;
    do {
      const result = await client.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        await client.del(result.keys);
        deleted += result.keys.length;
      }
    } while (cursor !== 0);
    if (deleted > 0) console.log(`   Deleted ${deleted} keys with prefix "${prefix}"`);
  }

  // ── Store articles ──────────────────────────────────────────────
  console.log("\n📝 Storing articles...");

  let storedArticles = 0;
  for (const article of articles) {
    const key = `article:${article.id}`;
    const hash = {
      id: article.id,
      title: article.title || "",
      preview: article.preview || "",
      postTime: String(article.postTime),
      authorId: article.authorId || "",
    };

    // 3D position
    if (positions[key]) {
      hash.x = String(positions[key].x);
      hash.y = String(positions[key].y);
      hash.z = String(positions[key].z);
    }

    // Article body + tags from IPFS content
    if (hasContent) {
      const contentFile = `${contentDir}/${article.id}.json`;
      if (existsSync(contentFile)) {
        try {
          const content = JSON.parse(readFileSync(contentFile, "utf-8"));
          hash.body = content.body || "";
          hash.tags = JSON.stringify(content.tags || []);
          hash.readTime = String(content.readTime || 0);
        } catch {
          // skip
        }
      }
    }

    // Vectors stored as binary blobs
    if (ideoEmbeddings[key]) {
      hash.ideo_vec = vecToBuffer(ideoEmbeddings[key]);
    }
    if (ctxEmbeddings[key]) {
      hash.ctx_vec = vecToBuffer(ctxEmbeddings[key]);
    }

    await client.hSet(key, hash);
    storedArticles++;
  }
  console.log(`   ✅ ${storedArticles} articles stored`);

  // ── Store users ─────────────────────────────────────────────────
  console.log("\n👤 Storing users...");

  let storedUsers = 0;
  for (const user of users) {
    const key = `user:${user.id}`;
    const hash = {
      id: user.id,
      alias: user.alias || "",
    };

    if (positions[key]) {
      hash.x = String(positions[key].x);
      hash.y = String(positions[key].y);
      hash.z = String(positions[key].z);
    }

    if (ideoEmbeddings[key]) {
      hash.ideo_vec = vecToBuffer(ideoEmbeddings[key]);
    }

    await client.hSet(key, hash);
    storedUsers++;
  }
  console.log(`   ✅ ${storedUsers} users stored`);

  // ── Create vector indexes ───────────────────────────────────────
  console.log("\n🔍 Creating vector indexes...");

  try {
    await client.ft.create(
      "idx:ideological",
      {
        ideo_vec: {
          type: SchemaFieldTypes.VECTOR,
          ALGORITHM: VectorAlgorithms.HNSW,
          TYPE: "FLOAT32",
          DIM: ideoDim,
          DISTANCE_METRIC: "COSINE",
        },
        title: { type: SchemaFieldTypes.TEXT, SORTABLE: true },
        postTime: { type: SchemaFieldTypes.NUMERIC, SORTABLE: true },
      },
      {
        ON: "HASH",
        PREFIX: ["article:", "user:"],
      }
    );
    console.log(`   ✅ idx:ideological (${ideoDim}d, COSINE, HNSW)`);
  } catch (err) {
    console.error(`   ❌ idx:ideological: ${err.message}`);
  }

  try {
    await client.ft.create(
      "idx:contextual",
      {
        ctx_vec: {
          type: SchemaFieldTypes.VECTOR,
          ALGORITHM: VectorAlgorithms.HNSW,
          TYPE: "FLOAT32",
          DIM: ctxDim,
          DISTANCE_METRIC: "COSINE",
        },
        title: { type: SchemaFieldTypes.TEXT, SORTABLE: true },
        postTime: { type: SchemaFieldTypes.NUMERIC, SORTABLE: true },
      },
      {
        ON: "HASH",
        PREFIX: "article:",
      }
    );
    console.log(`   ✅ idx:contextual (${ctxDim}d, COSINE, HNSW)`);
  } catch (err) {
    console.error(`   ❌ idx:contextual: ${err.message}`);
  }

  // ── Verify ──────────────────────────────────────────────────────
  console.log("\n🔍 Verifying...");

  for (const idx of ["idx:ideological", "idx:contextual"]) {
    try {
      const info = await client.ft.info(idx);
      console.log(`   ${idx}: ${info.numDocs} documents indexed`);
    } catch (err) {
      console.error(`   ${idx}: ${err.message}`);
    }
  }

  // Test KNN query
  const demoUserId = process.env.DEMO_USER_ID;
  if (demoUserId && ideoEmbeddings[`user:${demoUserId}`]) {
    console.log("\n🧪 Test KNN — nearest articles to demo user:");
    const queryVec = vecToBuffer(ideoEmbeddings[`user:${demoUserId}`]);

    try {
      const results = await client.ft.search(
        "idx:ideological",
        "*=>[KNN 5 @ideo_vec $BLOB AS score]",
        {
          PARAMS: { BLOB: queryVec },
          RETURN: ["title", "score"],
          SORTBY: { BY: "score", DIRECTION: "ASC" },
          DIALECT: 2,
        }
      );

      for (const doc of results.documents) {
        if (doc.id.startsWith("article:")) {
          console.log(`   ${parseFloat(doc.value.score).toFixed(4)} — ${doc.value.title || doc.id}`);
        }
      }
    } catch (err) {
      console.error(`   KNN test failed: ${err.message}`);
    }
  } else {
    console.log("\n   Skipping KNN test (no DEMO_USER_ID or missing embedding)");
  }

  // ── Summary ─────────────────────────────────────────────────────
  const dbSize = await client.dbSize();
  const memInfo = await client.info("memory");
  const usedMem = memInfo.match(/used_memory_human:(\S+)/)?.[1] || "unknown";

  console.log("\n✅ Redis seeding complete!");
  console.log(`   Total keys: ${dbSize}`);
  console.log(`   Memory used: ${usedMem}`);
  console.log(`   Articles: ${storedArticles}, Users: ${storedUsers}`);
  console.log(`   Ideological vectors: ${Object.keys(ideoEmbeddings).length} (${ideoDim}d)`);
  console.log(`   Contextual vectors: ${Object.keys(ctxEmbeddings).length} (${ctxDim}d)`);

  await client.quit();
  console.log("🔌 Done.");
}

main().catch((err) => {
  console.error("❌ Redis seeding failed:", err);
  process.exit(1);
});
