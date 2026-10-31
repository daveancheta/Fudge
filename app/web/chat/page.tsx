"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { ArrowUp, AudioLines, Sparkles } from "lucide-react";
import { useSyncedChat } from "@/lib/use-synced-chat";
import { isDesktopCommand } from "@/lib/chat-commands";

const authClient = createAuthClient();

export default function WebChatPage() {
  const { data: session, isPending } = authClient.useSession();
  const [input, setInput] = useState("");
  const { messages, addMessage } = useSyncedChat(session?.user.id);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    addMessage(text, "user", "web");
    if (isDesktopCommand(text)) {
      addMessage("Sent to your Dynamic Island. Keep the desktop app open to run this command.", "assistant", "web");
    } else {
      addMessage(replyTo(text), "assistant", "web");
    }
    setInput("");
  };

  if (isPending) return <div className="grid min-h-[80vh] place-items-center text-sm text-white/45">Checking your Fudge account…</div>;
  if (!session?.user) return <div className="grid min-h-[85vh] place-items-center px-6"><div className="max-w-md text-center">
    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[0.07]"><AudioLines className="size-6" /></span>
    <h1 className="mt-5 text-2xl font-semibold tracking-tight">Your chat is waiting</h1>
    <p className="mt-2 text-sm leading-6 text-white/50">Sign in to open your Fudge web chat and keep your workspace connected.</p>
    <Link href="/login" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-black hover:bg-white/90">Sign in to Fudge <ArrowUp className="size-4 rotate-45" /></Link>
  </div></div>;

  return <div className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-4xl flex-col px-5 sm:px-8">
    <header className="flex items-center justify-between border-b border-white/[0.08] py-5">
      <div><p className="text-xs text-white/40">FUDGE WORKSPACE</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Chat</h1></div>
      <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55"><span className="size-1.5 rounded-full bg-emerald-400" /> Signed in as {session.user.name || session.user.email}</div>
    </header>
    <div ref={chatContainerRef} className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-10">
      {messages.length === 0 ? <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#ff637d]/10 text-[#ff8295]">            <AudioLines className="size-[17px]" strokeWidth={2.2} />
        </span>
        <h2 className="mt-5 text-3xl font-medium tracking-[-.04em]">Hi! What can I help with?</h2>
        <p className="mt-2 text-sm text-white/45">Ask me about Fudge, your settings, or what you can do from your desktop.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs text-white/55">
          {["What can Fudge do?", "Open Fudge settings", "How do I change the music wave?"].map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)} className="cursor-pointer rounded-full border border-white/10 px-3 py-2 transition hover:border-white/20 hover:bg-white/[0.04]">{suggestion}</button>)}
        </div>
      </div> : <ol aria-live="polite" className="mx-auto flex w-full max-w-2xl flex-col gap-4">{messages.map((message) => <li key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.from === "user" ? "self-end bg-white text-black" : "self-start border border-white/10 bg-white/[0.04] text-white/80"}`}>{message.text}</li>)}</ol>}
    </div>
    <form onSubmit={send} className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-2 shadow-[0_12px_50px_rgba(0,0,0,.2)]">
      <textarea aria-label="Message Fudge" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message Fudge…" rows={2} className="max-h-40 min-h-14 w-full resize-y bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/30" />
      <div className="flex items-center justify-between px-2 pb-1"><span className="text-[11px] text-white/30">Enter to send · Shift + Enter for a new line</span><button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid size-9 cursor-pointer place-items-center rounded-xl bg-white text-black transition hover:bg-white/85 disabled:cursor-default disabled:bg-white/10 disabled:text-white/25"><ArrowUp className="size-4" /></button></div>
    </form>
  </div>;
}

function replyTo(text: string) {
  if (/settings/i.test(text)) return "You can tune your island’s music wave on the Settings page.";
  if (/what can fudge do|help/i.test(text)) return "Fudge can help you open installed apps, keep up with what’s playing, and make your desktop feel more personal. Explore your preferences in Settings.";
  return "I’ve got your message. Web chat is connected to your Fudge account; app controls are available from the desktop island.";
}
