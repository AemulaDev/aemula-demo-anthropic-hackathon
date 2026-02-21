import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert editorial analyst for an independent journalism platform.
Given an article, decompose it into atomic "building blocks." Each block
should represent ONE cohesive idea, argument, or narrative beat.

Rules:
- Each block should be independently understandable when read with its summary
- Blocks should follow the article's natural flow
- A typical article has 5-12 blocks
- Include the exact text content for each block

Return valid JSON matching this schema:
{
  "topic_summary": "One-sentence summary of the article's central topic",
  "key_arguments": ["Main argument 1", "Main argument 2", ...],
  "blocks": [
    {
      "id": "block_1",
      "summary": "2-3 sentence semantic summary of this block's idea",
      "text_content": "Exact text of this block from the article"
    }
  ]
}

Return ONLY the JSON object, no markdown fences or extra text.`;

export async function POST(request) {
  try {
    const { articleText } = await request.json();

    if (!articleText) {
      return NextResponse.json({ error: "articleText is required" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Decompose this article into blocks:\n\n${articleText}`,
        },
      ],
    });

    const text = message.content[0].text;
    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Decompose error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
