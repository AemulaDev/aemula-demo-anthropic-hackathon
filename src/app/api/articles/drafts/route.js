import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const draftsDir = join(process.cwd(), "data", "articles", "drafts");
    const files = readdirSync(draftsDir).filter((f) => f.endsWith(".json"));

    const drafts = files.map((filename) => {
      const raw = readFileSync(join(draftsDir, filename), "utf-8");
      const data = JSON.parse(raw);
      return {
        filename,
        title: data.title || "Untitled",
        preview: data.subtitle || data.body?.slice(0, 120) || "",
      };
    });

    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("Drafts list error:", err);
    return NextResponse.json({ drafts: [] });
  }
}
