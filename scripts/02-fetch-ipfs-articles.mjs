/**
 * 02-fetch-ipfs-articles.mjs
 *
 * Fetches full article JSON from IPFS using Pinata gateway.
 * Each article's `id` is its IPFS CID.
 *
 * Output:
 *   - data/article_content/<CID>.json — individual articles
 *   - data/article_content_index.json — summary index
 *
 * Supports resuming — skips already-fetched articles.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { config } from "dotenv";

config();

const PINATA_JWT = process.env.PINATA_JWT;
const GATEWAY_URL = process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";

const CONCURRENT_REQUESTS = 3;
const DELAY_BETWEEN_BATCHES_MS = 500;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(cid, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `${GATEWAY_URL}/${cid}`;
      const headers = {};
      if (PINATA_JWT) {
        headers["Authorization"] = `Bearer ${PINATA_JWT}`;
      }

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn(`   ⚠ Attempt ${attempt}/${retries} for ${cid}: ${err.message}`);
      if (attempt < retries) await sleep(1000 * attempt);
    }
  }
  return null;
}

async function main() {
  if (!existsSync("data/articles.json")) {
    console.error("❌ data/articles.json not found. Run step1:parse first.");
    process.exit(1);
  }

  const articles = JSON.parse(readFileSync("data/articles.json", "utf-8"));
  console.log(`📂 ${articles.length} articles to fetch from IPFS`);

  if (!PINATA_JWT) {
    console.warn("⚠ PINATA_JWT not set — using public gateway (may be rate limited)");
  }

  const contentDir = "data/article_content";
  mkdirSync(contentDir, { recursive: true });

  const toFetch = articles.filter(
    (a) => !existsSync(`${contentDir}/${a.id}.json`)
  );
  const alreadyDone = articles.length - toFetch.length;

  console.log(`   Already fetched: ${alreadyDone}`);
  console.log(`   To fetch: ${toFetch.length}`);

  if (toFetch.length === 0) {
    console.log("✅ All articles already fetched!");
    buildIndex(articles, contentDir);
    return;
  }

  let success = 0;
  let failed = 0;
  const failedCids = [];

  for (let i = 0; i < toFetch.length; i += CONCURRENT_REQUESTS) {
    const batch = toFetch.slice(i, i + CONCURRENT_REQUESTS);
    const batchNum = Math.floor(i / CONCURRENT_REQUESTS) + 1;
    const totalBatches = Math.ceil(toFetch.length / CONCURRENT_REQUESTS);

    console.log(`📦 Batch ${batchNum}/${totalBatches}...`);

    const results = await Promise.all(
      batch.map(async (article) => {
        const content = await fetchWithRetry(article.id);
        if (content) {
          writeFileSync(
            `${contentDir}/${article.id}.json`,
            JSON.stringify(content, null, 2)
          );
          const title = (content.title || "").slice(0, 50);
          console.log(`   ✅ ${article.id.slice(0, 12)}... — "${title}"`);
          return true;
        } else {
          console.log(`   ❌ ${article.id.slice(0, 12)}... — FAILED`);
          failedCids.push(article.id);
          return false;
        }
      })
    );

    success += results.filter(Boolean).length;
    failed += results.filter((r) => !r).length;

    if (i + CONCURRENT_REQUESTS < toFetch.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log(`\n📊 Results: ${success} success, ${failed} failed`);

  if (failedCids.length > 0) {
    writeFileSync("data/failed_fetches.json", JSON.stringify(failedCids, null, 2));
    console.log("   Failed CIDs saved to data/failed_fetches.json");
  }

  buildIndex(articles, contentDir);
}

function buildIndex(articles, contentDir) {
  console.log("\n📇 Building content index...");

  const index = {};
  for (const article of articles) {
    const filePath = `${contentDir}/${article.id}.json`;
    if (existsSync(filePath)) {
      try {
        const content = JSON.parse(readFileSync(filePath, "utf-8"));
        index[article.id] = {
          cid: article.id,
          title: content.title || article.title,
          hasContent: !!(content.body && content.body.length > 0),
          bodyLength: (content.body || "").length,
          tags: content.tags || [],
        };
      } catch {
        index[article.id] = {
          cid: article.id,
          title: article.title,
          hasContent: false,
          bodyLength: 0,
          tags: [],
        };
      }
    }
  }

  writeFileSync("data/article_content_index.json", JSON.stringify(index, null, 2));

  const withContent = Object.values(index).filter((a) => a.hasContent);
  const totalBytes = Object.values(index).reduce((sum, a) => sum + a.bodyLength, 0);

  console.log(`   Articles with content: ${withContent.length}/${articles.length}`);
  console.log(`   Total content size: ~${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  // Tag distribution
  const tagCounts = {};
  Object.values(index).forEach((a) => {
    a.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  if (Object.keys(tagCounts).length > 0) {
    console.log("\n🏷 Tag distribution:");
    Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([tag, count]) => {
        console.log(`   ${tag}: ${count}`);
      });
  }
}

main().catch((err) => {
  console.error("❌ IPFS fetch failed:", err);
  process.exit(1);
});
