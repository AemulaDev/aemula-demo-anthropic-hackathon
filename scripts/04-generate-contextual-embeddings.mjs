/**
 * 04-generate-contextual-embeddings.mjs
 *
 * Generates content-based embeddings for articles using Voyage AI or OpenAI.
 * Used for semantic/topic search.
 *
 * Input: article content from data/article_content/*.json
 * Output: data/contextual_embeddings.json
 *
 * Supports resuming — saves progress after each batch.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { config } from "dotenv";

config();

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "voyage";
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES_MS = 500;
const MAX_CONTENT_CHARS = 6000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prepareText(content) {
  const parts = [
    content.title || "",
    content.preview || "",
    content.body || "",
  ].filter(Boolean);

  let text = parts.join("\n\n");
  if (text.length > MAX_CONTENT_CHARS) {
    text = text.slice(0, MAX_CONTENT_CHARS) + "...";
  }
  return text;
}

async function embedVoyage(texts) {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: texts,
      input_type: "document",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.data.map((item) => item.embedding);
}

async function embedOpenAI(texts) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

async function embedBatch(texts) {
  if (EMBEDDING_PROVIDER === "voyage") {
    if (!VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY required");
    return embedVoyage(texts);
  } else {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY required");
    return embedOpenAI(texts);
  }
}

async function main() {
  const contentDir = "data/article_content";
  if (!existsSync(contentDir)) {
    console.error("❌ data/article_content/ not found. Run step2:fetch-ipfs first.");
    process.exit(1);
  }

  // Validate API key
  if (EMBEDDING_PROVIDER === "voyage" && !VOYAGE_API_KEY) {
    console.error("❌ VOYAGE_API_KEY required (set EMBEDDING_PROVIDER=openai to use OpenAI instead)");
    process.exit(1);
  }
  if (EMBEDDING_PROVIDER === "openai" && !OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY required");
    process.exit(1);
  }

  const modelName =
    EMBEDDING_PROVIDER === "voyage"
      ? "voyage-3 (1024d)"
      : "text-embedding-3-small (1536d)";
  console.log(`🧮 Generating contextual embeddings: ${modelName}`);

  // Load article content files
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));
  console.log(`📂 Found ${files.length} article content files`);

  const items = [];
  let skipped = 0;

  for (const file of files) {
    const cid = file.replace(".json", "");
    try {
      const content = JSON.parse(readFileSync(`${contentDir}/${file}`, "utf-8"));
      const text = prepareText(content);
      if (text.length < 20) {
        skipped++;
        continue;
      }
      items.push({ cid, text });
    } catch {
      skipped++;
    }
  }

  console.log(`   Articles to embed: ${items.length} (skipped ${skipped})`);

  // Load existing progress
  let existingEmbeddings = {};
  if (existsSync("data/contextual_embeddings.json")) {
    const existing = JSON.parse(readFileSync("data/contextual_embeddings.json", "utf-8"));
    existingEmbeddings = existing.embeddings || {};
    console.log(`   Resuming: ${Object.keys(existingEmbeddings).length} already done`);
  }

  const toEmbed = items.filter((item) => !existingEmbeddings[`article:${item.cid}`]);
  console.log(`   New to embed: ${toEmbed.length}`);

  if (toEmbed.length === 0) {
    console.log("✅ All articles already embedded!");
    return;
  }

  const embeddings = { ...existingEmbeddings };
  let dimension = 0;

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toEmbed.length / BATCH_SIZE);

    console.log(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} articles)...`);

    try {
      const texts = batch.map((item) => item.text);
      const vectors = await embedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        embeddings[`article:${batch[j].cid}`] = vectors[j];
        if (!dimension) dimension = vectors[j].length;
      }

      // Save progress
      writeFileSync(
        "data/contextual_embeddings.json",
        JSON.stringify({
          metadata: {
            provider: EMBEDDING_PROVIDER,
            model: EMBEDDING_PROVIDER === "voyage" ? "voyage-3" : "text-embedding-3-small",
            dimension,
            num_articles: Object.keys(embeddings).length,
          },
          embeddings,
        })
      );
    } catch (err) {
      console.error(`   ❌ Batch ${batchNum} failed: ${err.message}`);
      console.log("   Progress saved. Re-run to resume.");
      break;
    }

    if (i + BATCH_SIZE < toEmbed.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log(`\n✅ Generated ${Object.keys(embeddings).length} contextual embeddings (${dimension}d)`);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
