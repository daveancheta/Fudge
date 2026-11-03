"use client";

import { useCallback, useEffect, useState } from "react";

export type ChatMessage = {
  id: string;
  from: "user" | "assistant";
  text: string;
  createdAt: string;
};

const STORAGE_KEY = "fudge-chat";

function readMessages(): ChatMessage[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ChatMessage => !!item && typeof item === "object"
      && typeof item.id === "string" && (item.from === "user" || item.from === "assistant")
      && typeof item.text === "string" && typeof item.createdAt === "string");
  } catch { return []; }
}

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => setMessages(readMessages()), []);

  const addMessage = useCallback((text: string, from: ChatMessage["from"]) => {
    setMessages((current) => {
      const next = [...current, { id: crypto.randomUUID(), from, text, createdAt: new Date().toISOString() }];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep the in-memory chat usable. */ }
      return next;
    });
  }, []);

  return { messages, addMessage };
}
