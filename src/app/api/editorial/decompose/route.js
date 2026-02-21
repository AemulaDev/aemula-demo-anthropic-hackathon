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
- Include the exact text content for each block`;

const DECOMPOSE_TOOL = {
  name: "decompose_article",
  description: "Decompose an article into atomic building blocks with a topic summary and key arguments.",
  input_schema: {
    type: "object",
    properties: {
      topic_summary: {
        type: "string",
        description: "A brief summary of the article's central topic in a few words",
      },
      key_arguments: {
        type: "array",
        items: { type: "string" },
        description: "Brief summaries of the main arguments made in the article in a few words",
      },
      blocks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique block identifier, e.g. block_1" },
            summary: { type: "string", description: "Brief semantic summary of this block's idea in a few words" },
            text_content: { type: "string", description: "Exact text of this block from the article" },
          },
          required: ["id", "summary", "text_content"],
        },
        description: "The article decomposed into sequential building blocks",
      },
    },
    required: ["topic_summary", "key_arguments", "blocks"],
  },
};

export async function POST(request) {
  try {
    const { articleText } = await request.json();

    if (!articleText) {
      return NextResponse.json({ error: "articleText is required" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [DECOMPOSE_TOOL],
      tool_choice: { type: "tool", name: "decompose_article" },
      messages: [
        {
          role: "user",
          content: `Decompose this article into blocks:\n\n${articleText}`,
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse) {
      throw new Error("No tool use block in response");
    }

    return NextResponse.json(toolUse.input);
  } catch (err) {
    console.error("Decompose error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
