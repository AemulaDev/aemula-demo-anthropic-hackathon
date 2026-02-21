import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a skilled editor who preserves authorial voice. Below is an article
that has been restructured into blocks by its author. Your ONLY job is to
ensure the blocks flow smoothly together as a cohesive article.

Rules:
- Make MINIMAL edits — only add/modify transition sentences between blocks
- PRESERVE the author's vocabulary, sentence structure, and tone
- Do NOT add new arguments, facts, or opinions
- Do NOT restructure beyond the given block order
- Do NOT change any quoted material
- Output the complete article text in markdown, ready to publish
- Return ONLY the article text, no JSON wrapping or markdown fences`;

export async function POST(request) {
  try {
    const { blocks, originalArticle } = await request.json();

    if (!blocks || !Array.isArray(blocks)) {
      return NextResponse.json({ error: "blocks array is required" }, { status: 400 });
    }

    const blocksText = blocks
      .map((b, i) => `--- Block ${i + 1}: ${b.summary} ---\n${b.text_content}`)
      .join("\n\n");

    // using sonnet because opus was running into overload errors
    const message = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `ORIGINAL ARTICLE (for voice reference):\n${originalArticle}\n\nRESTRUCTURED ARTICLE BLOCKS (in final order):\n${blocksText}\n\nPlease produce the polished, cohesive article.`,
          },
        ],
      },
      { maxRetries: 5 }
    );

    const polishedArticle = message.content[0].text;

    return NextResponse.json({ polishedArticle });
  } catch (err) {
    console.error("Polish error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
