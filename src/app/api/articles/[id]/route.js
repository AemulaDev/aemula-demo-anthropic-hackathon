import { createClient } from "redis";
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

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const key = `article:${id}`;
    const client = await getRedis();
    const data = await client.hGetAll(key);

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: key,
      title: data.title || "",
      preview: data.preview || "",
      body: data.body || "",
      authorId: data.author_id || data.authorId || "",
    });
  } catch (err) {
    console.error("Article fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
