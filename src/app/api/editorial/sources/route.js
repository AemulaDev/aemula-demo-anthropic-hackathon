import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request) {
  try {
    const { claimText, articleContext } = await request.json();

    if (!claimText) {
      return NextResponse.json({ error: "Missing claimText" }, { status: 400 });
    }

    const userMessage = `Search for 3 credible sources that support or verify this claim from a journalism article.

CLAIM: "${claimText}"
${articleContext ? `ARTICLE CONTEXT: ${articleContext}\n` : ""}
After searching, respond with ONLY a JSON array — no explanation, no preamble, no markdown fences. Output must start with [ and end with ]:
[{"title":"...","url":"https://...","description":"..."},{"title":"...","url":"https://...","description":"..."},{"title":"...","url":"https://...","description":"..."}]`;

    const messages = [{ role: "user", content: userMessage }];

    let response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    });

    // web_search_20250305 is a server-side tool — Anthropic executes it internally.
    // The response comes back as end_turn with text containing the search-informed answer.
    // If for any reason it returns tool_use (fallback loop), continue until end_turn.
    let iterations = 0;
    while (response.stop_reason === "tool_use" && iterations < 3) {
      iterations++;
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      messages.push({ role: "assistant", content: response.content });

      const toolResults = toolUseBlocks.map((tb) => ({
        type: "tool_result",
        tool_use_id: tb.id,
        content: "Search completed. Now return the JSON array of sources.",
      }));

      messages.push({ role: "user", content: toolResults });

      response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "No response from model" }, { status: 500 });
    }

    // Extract JSON array from anywhere in the response text
    const match = textBlock.text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("No JSON array found in response:", textBlock.text);
      return NextResponse.json({ error: "Could not parse sources from response" }, { status: 500 });
    }

    const sources = JSON.parse(match[0]);

    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ error: "No sources found" }, { status: 500 });
    }

    return NextResponse.json({ sources: sources.slice(0, 3) });
  } catch (err) {
    console.error("Source search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
