"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appFetch } from "@/lib/app-fetch";
import { supabase } from "@/lib/supabase";

export type SyncedChatMessage = {
  id: string;
  from: "user" | "assistant";
  text: string;
  createdAt: string;
  synced: boolean;
};

type ChatState = { key: string; messages: SyncedChatMessage[] };

function readLocalMessages(key: string): SyncedChatMessage[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter(isChatMessage) : [];
  } catch {
    return [];
  }
}

function isChatMessage(value: unknown): value is SyncedChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<SyncedChatMessage>;
  return typeof message.id === "string"
    && (message.from === "user" || message.from === "assistant")
    && typeof message.text === "string"
    && typeof message.createdAt === "string"
    && typeof message.synced === "boolean";
}

function mergeMessages(...groups: SyncedChatMessage[][]) {
  const messages = new Map<string, SyncedChatMessage>();
  for (const group of groups) {
    for (const message of group) {
      const current = messages.get(message.id);
      if (!current || message.synced || !current.synced) messages.set(message.id, message);
    }
  }
  return [...messages.values()].sort((a, b) =>
    Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}

export function useSyncedChat(userId: string | undefined) {
  const key = `fudge-chat:${userId || "local"}`;
  const [state, setState] = useState<ChatState>({ key: "", messages: [] });
  const stateRef = useRef(state);
  const messages = state.key === key ? state.messages : [];

  const commitMessages = useCallback((next: SyncedChatMessage[]) => {
    const current = stateRef.current.key === key
      ? stateRef.current.messages
      : readLocalMessages(key);
    const merged = mergeMessages(current, next);
    const updated = { key, messages: merged };
    stateRef.current = updated;
    setState(updated);
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* Keep the in-memory chat usable. */ }
    return merged;
  }, [key]);

  const syncMessages = useCallback(async (pending: SyncedChatMessage[]) => {
    if (!userId || pending.length === 0) return;
    const batchSize = 50;
    for (let offset = 0; offset < pending.length; offset += batchSize) {
      const batch = pending.slice(offset, offset + batchSize);
      try {
        const response = await appFetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: batch.map(({ id, from, text, createdAt }) => ({ id, from, text, createdAt })) }),
        });
        if (!response.ok) continue;
        const result = (await response.json()) as { messages: Omit<SyncedChatMessage, "synced">[] };
        commitMessages(result.messages.map((message) => ({ ...message, synced: true })));
      } catch {
        // Keep unsent messages in local storage and retry on reconnect or next launch.
      }
    }
  }, [commitMessages, userId]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const cached = readLocalMessages(key);
    const initial = { key, messages: cached };
    stateRef.current = initial;
    setState(initial);

    if (!userId) return () => { active = false; };

    const syncFromDatabase = async () => {
      try {
        const response = await appFetch("/api/chat", { cache: "no-store" });
        if (!response.ok) return null;
        const result = (await response.json()) as {
          messages: Omit<SyncedChatMessage, "synced">[];
          realtimeTopic: string;
        };
        if (!active) return null;
        const remote = result.messages.map((message) => ({ ...message, synced: true }));
        const merged = commitMessages(remote);
        await syncMessages(merged.filter((message) => !message.synced));
        return result.realtimeTopic;
      } catch {
        return null;
      }
    };

    void syncFromDatabase().then((topic) => {
      if (!active || !topic) return;
      channel = supabase
        .channel(topic, { config: { private: false } })
        .on("broadcast", { event: "chat-message" }, ({ payload }) => {
          const message = payload?.message as Omit<SyncedChatMessage, "synced"> | undefined;
          if (message && isChatMessage({ ...message, synced: true })) {
            commitMessages([{ ...message, synced: true }]);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void syncFromDatabase();
        });
    });

    const handleOnline = () => { void syncFromDatabase(); };
    window.addEventListener("online", handleOnline);
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [commitMessages, key, syncMessages, userId]);

  const addMessage = useCallback((text: string, from: SyncedChatMessage["from"]) => {
    const current = stateRef.current.key === key
      ? stateRef.current.messages
      : readLocalMessages(key);
    const previousTimestamp = current.length ? Date.parse(current[current.length - 1].createdAt) : 0;
    const message: SyncedChatMessage = {
      id: crypto.randomUUID(),
      from,
      text,
      createdAt: new Date(Math.max(Date.now(), previousTimestamp + 1)).toISOString(),
      synced: !userId,
    };
    const updated = commitMessages([message]);
    if (userId) void syncMessages(updated.filter((item) => !item.synced));
  }, [commitMessages, key, syncMessages, userId]);

  return { messages, addMessage };
}
