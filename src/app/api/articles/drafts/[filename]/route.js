import { readFileSync } from "fs";
import { join, basename } from "path";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    // Sanitize filename to prevent path traversal
    const safe = basename(filename);
    if (safe !== filename || !safe.endsWith(".json")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = join(process.cwd(), "data", "articles", "drafts", safe);
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Draft fetch error:", err);
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
}
