"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { ArrowDown, ArrowUp, AudioLines, CircleUserRound, Command, Sparkles } from "lucide-react";
import { useSyncedChat } from "@/lib/use-synced-chat";
import { isDesktopCommand } from "@/lib/chat-commands";

const authClient = createAuthClient();

export default function WebChatPage() {
  const { data: session, isPending } = authClient.useSession();
  const [input, setInput] = useState("");
  const [showLatestButton, setShowLatestButton] = useState(false);
  const { messages, addMessage } = useSyncedChat(session?.user?.id);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const keepLatestInView = useRef(true);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container && keepLatestInView.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      setShowLatestButton(false);
    } else if (messages.length) {
      setShowLatestButton(true);
    }
  }, [messages]);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    keepLatestInView.current = true;
    setShowLatestButton(false);
    addMessage(text, "user", "web");
    if (isDesktopCommand(text)) {
      addMessage("Sent to your Dynamic Island. Keep the desktop app open to run this command.", "assistant", "web");
    } else {
      addMessage(replyTo(text), "assistant", "web");
    }
    setInput("");
  };

  if (isPending) return <div className="grid h-full min-h-0 place-items-center text-sm text-white/45">Checking your Fudge account...</div>;
  if (!session?.user) return <div className="grid h-full min-h-0 place-items-center px-6"><div className="max-w-md text-center">
    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[0.07]"><AudioLines className="size-6" /></span>
    <h1 className="mt-5 text-2xl font-semibold tracking-tight">Your chat is waiting</h1>
    <p className="mt-2 text-sm leading-6 text-white/50">Sign in to open your Fudge web chat and keep your workspace connected.</p>
    <Link href="/login" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-black hover:bg-white/90">Sign in to Fudge <ArrowUp className="size-4 rotate-45" /></Link>
  </div></div>;

  return <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-4 sm:px-8">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] py-3.5 sm:py-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-white/90">Chat</h1>
        <p className="mt-0.5 hidden text-xs text-white/40 sm:block">Your conversations with Fudge</p>
      </div>
      <div
        aria-label={`Signed in as ${session.user.name || session.user.email}`}
        title={session.user.name || session.user.email}
        className="flex max-w-[55%] shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[11px] text-white/55 sm:px-3 sm:py-2"
      >
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)]" />
        <span>Signed in</span>
        <span className="hidden max-w-40 truncate md:inline">{session.user.name || session.user.email}</span>
      </div>
    </header>

    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={chatContainerRef}
        aria-label="Chat messages"
        onScroll={(event) => {
          const element = event.currentTarget;
          const atLatest = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
          keepLatestInView.current = atLatest;
          if (atLatest) setShowLatestButton(false);
        }}
        className="web-chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1 py-6 sm:py-8"
      >
        {messages.length === 0 ? <div className="m-auto w-full max-w-xl py-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#ff637d]/15 bg-[#ff637d]/10 text-[#ff8295]"><AudioLines className="size-[18px]" strokeWidth={2.2} /></span>
          <h2 className="mt-5 text-2xl font-medium tracking-[-.04em] sm:text-3xl">Hi! What can I help with?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">Ask about Fudge, your settings, or send a command to the desktop island.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["What can Fudge do?", "Open Fudge settings", "What apps can you open?"].map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)} className="cursor-pointer rounded-full border border-white/10 bg-white/[0.025] px-3.5 py-2 text-xs text-white/55 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80">{suggestion}</button>)}
          </div>
        </div> : <ol role="log" aria-live="polite" aria-relevant="additions" className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-3">
          {messages.map((chatMessage) => {
            const isUser = chatMessage.from === "user";
            return <li key={chatMessage.id} className={`flex w-full flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
              <span className={`flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-[.12em] ${isUser ? "text-white/35" : "text-white/45"}`}>
                {isUser ? <><CircleUserRound className="size-3.5" /> You</> : <><AudioLines className="size-3.5 text-[#ff8295]" /> Fudge</>}
              </span>
              <div className={`max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[13px] leading-6 sm:max-w-[82%] sm:px-5 ${isUser ? "rounded-br-md bg-white text-[#211f1d] shadow-[0_8px_24px_rgba(0,0,0,.12)]" : "rounded-bl-md border border-white/[0.09] bg-white/[0.045] text-white/80"}`}>
                {chatMessage.text}
              </div>
            </li>;
          })}
        </ol>}
      </div>
      {showLatestButton && <button type="button" onClick={() => { keepLatestInView.current = true; chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" }); setShowLatestButton(false); }} className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#242220] px-3.5 py-2 text-xs text-white/80 shadow-lg transition hover:bg-[#33302c]"><ArrowDown className="size-3.5" /> Latest messages</button>}
    </div>

    <form onSubmit={send} className="mx-auto w-full max-w-3xl shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.045] p-2 shadow-[0_12px_48px_rgba(0,0,0,.18)] transition focus-within:border-white/20 focus-within:bg-white/[0.06]">
        <textarea aria-label="Message Fudge" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message Fudge..." rows={2} className="max-h-40 min-h-14 w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-white/30" />
        <div className="flex items-center justify-between px-2 pb-1"><span className="flex items-center gap-1.5 text-[10px] text-white/30"><Command className="size-3" /><span>Enter to send <span className="hidden sm:inline">Â· Shift + Enter for a new line</span></span></span><button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid size-9 cursor-pointer place-items-center rounded-xl bg-white text-black transition hover:bg-white/85 disabled:cursor-default disabled:bg-white/10 disabled:text-white/25"><ArrowUp className="size-4" /></button></div>
      </div>
    </form>
  </div>;
}

function replyTo(text: string) {
  if (/settings/i.test(text)) return "You can tune your island's music wave on the Settings page.";
  if (/what can fudge do|help/i.test(text)) return "Fudge can help you open installed apps, keep up with what's playing, and make your desktop feel more personal. Explore your preferences in Settings.";
  return "I've got your message. Web chat is connected to your Fudge account; app controls are available from the desktop island.";
}
