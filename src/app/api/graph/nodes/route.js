import { createClient } from "redis";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

let redisClient = null;

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => console.error("Redis error:", err));
    await redisClient.connect();
  }
  return redisClient;
}

const POSITION_MULTIPLIER = 6;

export async function GET() {
  try {
    // Load pre-computed positions
    const positionsPath = join(process.cwd(), "data", "graph", "3d_positions.json");
    const posData = JSON.parse(readFileSync(positionsPath, "utf-8"));
    const positions = posData.positions;
    const keys = Object.keys(positions);

    const client = await getRedis();

    // Batch fetch metadata for all nodes via pipeline
    const pipeline = client.multi();
    for (const key of keys) {
      if (key.startsWith("article:")) {
        pipeline.hGet(key, "title");
      } else {
        pipeline.hGet(key, "alias");
      }
    }
    const results = await pipeline.exec();

    // Merge positions + metadata into node list
    const nodes = keys.map((key, i) => {
      const pos = positions[key];
      const raw = results[i];

      let label;
      if (pos.type === "article") {
        label = raw || pos.id.slice(0, 12) + "…";
      } else {
        // user: use alias if non-empty, else truncated id
        label = raw && raw.trim() ? raw : pos.id.slice(0, 10) + "…";
      }

      return {
        id: key,
        nodeId: pos.id,
        type: pos.type,
        label,
        fx: pos.x * POSITION_MULTIPLIER,
        fy: pos.y * POSITION_MULTIPLIER,
        fz: pos.z * POSITION_MULTIPLIER,
      };
    });

    return NextResponse.json({ nodes });
  } catch (err) {
    console.error("Graph nodes error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
