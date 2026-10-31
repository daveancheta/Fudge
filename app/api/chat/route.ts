import { and, asc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/index";
import { chatMessages } from "@/db/schema";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserRealtimeTopic } from "@/lib/settings-realtime";

export const runtime = "nodejs";

type ChatMessage = { id: string; from: "user" | "assistant"; text: string; createdAt: string };

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id;
}

function toMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    from: row.role as ChatMessage["from"],
    text: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === "string"
    && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(message.id)
    && (message.from === "user" || message.from === "assistant")
    && typeof message.text === "string"
    && message.text.trim().length > 0
    && message.text.length <= 8000
    && typeof message.createdAt === "string"
    && Number.isFinite(Date.parse(message.createdAt));
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in to load chat history." }, { status: 401 });

  try {
    const rows = await db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(asc(chatMessages.createdAt));
    return Response.json({
      messages: rows.map(toMessage),
      realtimeTopic: getUserRealtimeTopic(userId, "chat"),
    });
  } catch (error) {
    console.error("Could not load chat history", error);
    return Response.json({ error: "Could not load chat history." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in to sync chat history." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid chat payload." }, { status: 400 });
  }
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 100 || !messages.every(isMessage)) {
    return Response.json({ error: "Invalid chat messages." }, { status: 400 });
  }

  try {
    const inserted = await db.insert(chatMessages).values(messages.map((message) => ({
      id: message.id,
      userId,
      role: message.from,
      content: message.text,
      createdAt: new Date(message.createdAt),
    }))).onConflictDoNothing({ target: chatMessages.id }).returning();

    const savedRows = await db.select().from(chatMessages)
      .where(and(
        eq(chatMessages.userId, userId),
        inArray(chatMessages.id, messages.map((message) => message.id)),
      ))
      .orderBy(asc(chatMessages.createdAt));
    const savedMessages = savedRows.map(toMessage);
    const topic = getUserRealtimeTopic(userId, "chat");

    await Promise.all(inserted.map(async (row) => {
      try {
        const result = await supabase.channel(topic, { config: { private: false } })
          .httpSend("chat-message", { message: toMessage(row) });
        if (!result.success) console.error("Could not broadcast chat message", result.error);
      } catch (error) {
        console.error("Could not broadcast chat message", error);
      }
    }));

    return Response.json({ messages: savedMessages });
  } catch (error) {
    console.error("Could not sync chat history", error);
    return Response.json({ error: "Could not sync chat history." }, { status: 503 });
  }
}
