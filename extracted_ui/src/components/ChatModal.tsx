import { useState, useEffect, useRef } from "react";
import { type Media, titleOf } from "../lib/tmdb";
import { syncProfileToSupabase, fetchProfileFromSupabase } from "../lib/supabaseSync";
import { Icon, RoundBtn } from "./ui";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  recommendations?: Media[];
}

const STORAGE_CHAT_KEY = "cinemaverse_chat_history";

const QUICK_PROMPTS = [
  "🍿 Recommend top Sci-Fi movies like Interstellar",
  "🔥 What's trending in Anime right now?",
  "🎬 High-rated Action blockbusters with Dolby Atmos",
  "⚡ Best Server for 4K streaming?",
];

export function ChatModal({
  isOpen,
  onClose,
  onOpenMedia,
  onPlay,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenMedia?: (media: Media) => void;
  onPlay?: (media: Media) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_CHAT_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "msg_welcome",
        role: "assistant",
        content:
          "👋 Welcome to CinemaVerse AI Concierge! I can recommend movies, find anime series, search actors, and give you direct 4K stream links in real time. What would you like to watch today?",
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Load chat history from Supabase Cloud on initial open
  useEffect(() => {
    if (!isOpen) return;
    fetchProfileFromSupabase().then((p) => {
      if (p && Array.isArray(p.chat_history) && p.chat_history.length > 0) {
        setMessages(p.chat_history);
        try {
          localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(p.chat_history));
        } catch {}
      }
    });
  }, [isOpen]);

  // Save messages to local storage and sync to Supabase in real time
  const persistMessages = (newMsgs: ChatMessage[]) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(newMsgs));
    } catch {}
    // Background cloud sync to Supabase
    syncProfileToSupabase({ chat_history: newMsgs }).catch(() => {});
  };

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: q,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    persistMessages(updated);
    setInput("");
    setIsTyping(true);

    try {
      // First try /api/assistant/interact
      let responseText = "";
      let foundMedia: Media[] = [];

      try {
        const res = await fetch("/api/assistant/interact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) {
            responseText = data.reply;
          }
        }
      } catch {}

      // If no reply or query is movie related, search TMDB catalog for real-time recommendations
      try {
        const searchRes = await fetch(
          `/api/tmdb/search?query=${encodeURIComponent(q)}&include_adult=true`
        );
        if (searchRes.ok) {
          const sData = await searchRes.json();
          if (sData && Array.isArray(sData.results) && sData.results.length > 0) {
            foundMedia = sData.results.slice(0, 4);
          }
        }
      } catch {}

      // Fallback query for popular trending if needed
      if (!foundMedia.length && /recommend|trending|top|anime|movie|series/i.test(q)) {
        try {
          const trendRes = await fetch("/api/tmdb/trending/all/day");
          if (trendRes.ok) {
            const tData = await trendRes.json();
            if (tData && Array.isArray(tData.results)) {
              foundMedia = tData.results.slice(0, 4);
            }
          }
        } catch {}
      }

      if (!responseText) {
        if (foundMedia.length > 0) {
          responseText = `Here are the top real-time matches from the CinemaVerse 4K vault for "${q}":`;
        } else {
          responseText = `I checked the catalog for "${q}". You can stream any of our 10 VIP servers or switch servers anytime from the top bar!`;
        }
      }

      const botMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: responseText,
        timestamp: Date.now(),
        recommendations: foundMedia.length > 0 ? foundMedia : undefined,
      };

      persistMessages([...updated, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `ast_err_${Date.now()}`,
        role: "assistant",
        content: "I'm having a connection glitch, but you can browse all titles directly from the Search bar or Catalog.",
        timestamp: Date.now(),
      };
      persistMessages([...updated, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Clear all AI chat history?")) {
      const reset = [
        {
          id: "msg_welcome_reset",
          role: "assistant" as const,
          content: "Chat cleared. What can I help you find in CinemaVerse Pro?",
          timestamp: Date.now(),
        },
      ];
      persistMessages(reset);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-[fade_.2s_both]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="CinemaVerse AI Chat"
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative flex size-full max-h-[680px] max-w-xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0b0c13] shadow-2xl shadow-black ring-1 ring-white/10 animate-[pop_.25s_cubic-bezier(.16,1,.3,1)_both]"
      >
        {/* shadcn Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#12131d]/90 px-4 sm:px-6 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="grid size-10 place-items-center rounded-2xl bg-linear-to-tr from-red-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                </svg>
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#12131d]">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm sm:text-base font-black text-white">CinemaVerse Copilot</h3>
                <span className="rounded-md bg-purple-600/20 px-1.5 py-0.2 text-[9px] font-black text-purple-300 border border-purple-500/30">
                  REAL-TIME AI
                </span>
              </div>
              <p className="text-[11px] text-white/50">Streaming Concierge • Supabase Synced</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              title="Clear Chat History"
              className="text-white/40 hover:text-white p-1.5 transition rounded-lg hover:bg-white/5"
            >
              <Icon name="trash" size={15} />
            </button>
            <RoundBtn icon="close" label="Close Chat" onClick={onClose} size={32} />
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#090a10]">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isUser && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-black">
                    AI
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                    isUser
                      ? "bg-linear-to-r from-red-600 to-accent text-white font-medium"
                      : "border border-white/10 bg-[#141522] text-white/90"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Render Movie Recommendations if any */}
                  {m.recommendations && m.recommendations.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      {m.recommendations.map((rec) => {
                        const poster = rec.poster_path
                          ? `https://image.tmdb.org/t/p/w185${rec.poster_path}`
                          : "/fallback-poster.png";
                        return (
                          <div
                            key={rec.id}
                            className="group flex flex-col rounded-xl border border-white/10 bg-black/40 p-1.5 hover:border-red-500/50 transition"
                          >
                            <img
                              src={poster}
                              alt={titleOf(rec)}
                              className="aspect-[2/3] w-full rounded-lg object-cover"
                            />
                            <div className="mt-1 flex items-center justify-between text-[10px]">
                              <span className="font-bold text-white truncate max-w-[85px]">
                                {titleOf(rec)}
                              </span>
                              <span className="text-amber font-mono font-bold">
                                ★ {rec.vote_average?.toFixed(1) || "7.5"}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                onClose();
                                if (onPlay) onPlay(rec);
                                else if (onOpenMedia) onOpenMedia(rec);
                              }}
                              className="mt-1.5 flex items-center justify-center gap-1 rounded-md bg-white/10 hover:bg-red-600 py-1 text-[10px] font-bold text-white transition active:scale-95"
                            >
                              <Icon name="play" size={10} /> Stream
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <span className="mt-1 block text-[9px] text-white/30 text-right">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-purple-600/30 text-purple-300 text-xs font-black">
                AI
              </span>
              <div className="rounded-2xl border border-white/10 bg-[#141522] px-4 py-3 text-xs text-white/60 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="size-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="size-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="ml-2 text-[11px] font-medium text-white/50">Analyzing 4K catalog...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2 border-t border-white/5 bg-[#0e0f17] no-scrollbar">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-3 py-1 text-[11px] font-semibold text-white/70 hover:text-white transition active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>

        {/* shadcn Input Footer */}
        <div className="border-t border-white/10 bg-[#12131d]/95 p-3 sm:p-4 backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything (e.g. Recommend dark psychological thrillers...)"
              className="flex-1 rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="grid size-10 place-items-center rounded-2xl bg-linear-to-r from-red-600 to-accent text-white shadow-lg shadow-red-600/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" x2="11" y1="2" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
