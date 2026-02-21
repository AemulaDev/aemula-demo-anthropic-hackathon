import { createClient } from "redis";
import OpenAI from "openai";
import { NextResponse } from "next/server";

let redisClient = null;

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => console.error("Redis error:", err));
    await redisClient.connect();
  }
  return redisClient;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function vecToBuffer(vec) {
  return Buffer.from(new Float32Array(vec).buffer);
}

function bufferToArray(buf) {
  if (!buf) return null;
  // If it's already a Buffer/Uint8Array, use it directly
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return Array.from(new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4));
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Fetch a binary hash field via raw HGET command
async function hGetBinary(client, key, field) {
  try {
    const result = await client.sendCommand(["HGET", key, field]);
    if (!result) return null;
    // sendCommand returns a Buffer for binary data
    return Buffer.isBuffer(result) ? result : Buffer.from(result);
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const { query, userId } = await request.json();
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const demoUserId = userId || process.env.NEXT_PUBLIC_DEMO_USER_ID;

    // 1. Embed the query with OpenAI text-embedding-3-small (1536d)
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVec = embeddingRes.data[0].embedding;
    const queryBuf = vecToBuffer(queryVec);

    // 2. KNN search on idx:contextual
    const client = await getRedis();
    const searchResults = await client.ft.search(
      "idx:contextual",
      "*=>[KNN 20 @ctx_vec $BLOB AS ctx_score]",
      {
        PARAMS: { BLOB: queryBuf },
        RETURN: ["title", "preview", "body", "authorId", "ctx_score"],
        SORTBY: { BY: "ctx_score", DIRECTION: "ASC" },
        DIALECT: 2,
      }
    );

    // 3. Fetch the demo user's ideological vector
    let userIdeoVec = null;
    if (demoUserId) {
      const userKey = `user:${demoUserId}`;
      const rawVec = await hGetBinary(client, userKey, "ideo_vec");
      if (rawVec) {
        userIdeoVec = bufferToArray(rawVec);
      }
    }

    // 4. For each result, fetch ideo_vec and compute ideological similarity
    const results = [];
    for (const doc of searchResults.documents) {
      const articleKey = doc.id;
      const val = doc.value;

      let ideologicalScore = null;
      if (userIdeoVec) {
        const artIdeoRaw = await hGetBinary(client, articleKey, "ideo_vec");
        if (artIdeoRaw) {
          const artIdeoVec = bufferToArray(artIdeoRaw);
          ideologicalScore = cosineSimilarity(userIdeoVec, artIdeoVec);
        }
      }

      results.push({
        id: articleKey,
        title: val.title || "",
        preview: val.preview || "",
        body: val.body || "",
        authorId: val.authorId || "",
        contextualScore: parseFloat(val.ctx_score),
        ideologicalScore,
      });
    }

    // 5. Sort by ideological proximity (highest similarity first)
    if (userIdeoVec) {
      results.sort((a, b) => (b.ideologicalScore ?? -1) - (a.ideologicalScore ?? -1));
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
