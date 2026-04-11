/**
 * 01-parse-export.mjs
 *
 * Parses aemula_graph_export.csv into structured JSON files:
 *   - data/articles.json
 *   - data/users.json
 *   - data/relationships.json
 *
 * Handles special characters (apostrophes, pipes, emojis) via
 * proper CSV parsing with csv-parse.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { parse } from "csv-parse/sync";

// ── Relationship weights for ideological embeddings ─────────────────
const RELATIONSHIP_WEIGHTS = {
  AUTHOR: 1.5,     // Strong positive — they wrote it
  SUPPORT: 1.0,    // Positive alignment
  DISAGREE: -1.0,  // Negative alignment (equal opposite to SUPPORT)
  NEUTRAL: 0.3,    // Slightly positive
  REPORT: -2.0,    // Strongly negative
};

function main() {
  // Find the CSV file
  const csvPaths = [
    "aemula_graph_export.csv",
    "data/aemula_graph_export.csv",
  ];
  let csvPath = csvPaths.find((p) => existsSync(p));
  if (!csvPath) {
    console.error("❌ Cannot find aemula_graph_export.csv");
    console.error("   Place it in the project root or in data/");
    process.exit(1);
  }

  console.log(`📂 Reading ${csvPath}...`);
  const csvContent = readFileSync(csvPath, "utf-8");

  // Parse CSV — csv-parse handles quoted fields with special chars properly
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,       // Handle improperly quoted fields
    relax_column_count: true,  // Handle rows with extra/fewer columns
    escape: "\\",             // Handle backslash-escaped quotes (e.g. \"text\")
  });

  console.log(`📊 Parsed ${records.length} relationship records`);

  // ── Build structured data ─────────────────────────────────────────
  const articlesMap = new Map();
  const usersMap = new Map();
  const relationships = [];

  for (const row of records) {
    const userId = (row.user_id || "").trim();
    const userAlias = (row.user_alias || "").trim();
    const relationship = (row.relationship || "").trim();
    const articleId = (row.article_id || "").trim();
    const articleTitle = (row.article_title || "").trim();
    const articlePreview = (row.article_preview || "").trim();
    const postTime = parseInt(row.post_time);

    // Skip rows with missing essential data
    if (!userId || !articleId || !relationship) {
      console.warn(`   ⚠ Skipping row with missing data: user=${userId}, article=${articleId}, rel=${relationship}`);
      continue;
    }

    // Collect articles (deduplicated)
    if (!articlesMap.has(articleId)) {
      articlesMap.set(articleId, {
        id: articleId,
        title: articleTitle,
        preview: articlePreview,
        postTime: isNaN(postTime) ? 0 : postTime * 1000,
        authorId: null,
      });
    }

    // Track author relationship
    if (relationship === "AUTHOR") {
      articlesMap.get(articleId).authorId = userId;
    }

    // Collect users (deduplicated)
    if (!usersMap.has(userId)) {
      usersMap.set(userId, {
        id: userId,
        alias: userAlias,
      });
    }

    // Build weighted edge
    const weight = RELATIONSHIP_WEIGHTS[relationship];
    if (weight === undefined) {
      console.warn(`   ⚠ Unknown relationship type: "${relationship}"`);
      continue;
    }

    relationships.push({
      user_id: userId,
      article_id: articleId,
      type: relationship,
      weight,
    });
  }

  // Sort articles by date (newest first)
  const articles = Array.from(articlesMap.values()).sort(
    (a, b) => b.postTime - a.postTime
  );
  const users = Array.from(usersMap.values());

  // ── Save ──────────────────────────────────────────────────────────
  mkdirSync("data", { recursive: true });
  writeFileSync("data/articles.json", JSON.stringify(articles, null, 2));
  writeFileSync("data/users.json", JSON.stringify(users, null, 2));
  writeFileSync("data/relationships.json", JSON.stringify(relationships, null, 2));

  console.log("\n✅ Saved:");
  console.log(`   data/articles.json — ${articles.length} articles`);
  console.log(`   data/users.json — ${users.length} users`);
  console.log(`   data/relationships.json — ${relationships.length} edges`);

  // ── Stats ─────────────────────────────────────────────────────────
  const typeCounts = {};
  relationships.forEach((r) => {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  });

  console.log("\n📊 Relationship distribution:");
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} (weight: ${RELATIONSHIP_WEIGHTS[type]})`);
    });

  if (articles.length > 0) {
    const newest = new Date(articles[0].postTime).toISOString().split("T")[0];
    const oldest = new Date(articles[articles.length - 1].postTime).toISOString().split("T")[0];
    console.log(`\n📅 Date range: ${oldest} → ${newest}`);
  }

  const orphans = articles.filter((a) => !a.authorId);
  if (orphans.length > 0) {
    console.log(`⚠ ${orphans.length} articles have no AUTHOR relationship`);
  }

  // Sanity check: print a few titles to verify special chars parsed correctly
  console.log("\n🔍 Sample titles (checking special char parsing):");
  articles.slice(0, 5).forEach((a) => {
    console.log(`   "${a.title}"`);
  });
}

main();
