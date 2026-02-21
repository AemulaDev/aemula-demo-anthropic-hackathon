import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request) {
  try {
    const { articleText, blockText, blockId, blockNumber, totalBlocks } = await request.json();

    if (!articleText || !blockText || !blockId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const systemPrompt = `You are an expert editor reviewing a building block of a journalism article.

FULL ARTICLE CONTEXT:
${articleText}

BLOCK BEING REVIEWED (Block ${blockNumber} of ${totalBlocks}):
${blockText}

Review this block for ONLY these categories. Only include a flag if there
is a genuine issue — do not flag things that are fine.

1. GRAMMAR/SPELLING: Specific errors with corrections
2. NEEDS_SOURCE: Claims that would be stronger with citations
3. COUNTER_ARGUMENT: Arguments that would benefit from acknowledging opposing views
4. REDUNDANT: Content that overlaps significantly with another block
5. REORDER: This block would serve the article better in a different position

Return valid JSON:
{
  "block_id": "${blockId}",
  "flags": [
    {
      "type": "grammar|needs_source|counter_argument|redundant|reorder",
      "detail": "Brief explanation for the author",
      "correction": "For grammar only: the corrected text",
      "claim_text": "For needs_source only: the specific claim",
      "topic": "For counter_argument only: the opposing viewpoint topic",
      "overlaps_with": "For redundant only: the other block ID",
      "suggested_position": null
    }
  ]
}

Only include fields relevant to each flag type. Return ONLY the JSON object, no markdown fences or extra text.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Review this block and return flags as JSON.`,
        },
      ],
    });

    const text = message.content[0].text;
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Review error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
