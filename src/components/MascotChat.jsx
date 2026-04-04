import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { chatCompletion } from "../lib/openai";

const SYSTEM_PROMPT = (nickname, language) =>
  `You are Buddy, a warm and playful language learning mascot for Indian children ages 5–15.
The child's name is ${nickname || "friend"} and they are learning ${language || "an Indian language"}.
Keep every reply to 1–2 short sentences. Be encouraging, fun, and age-appropriate.
If asked about a word, give it in both ${language} and English.
Always end with a small emoji.`;

export default function MascotChat({ nickname, language }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hi ${nickname || "friend"}! Ask me anything 😊` },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      history.push({ role: "user", content: text });
      const reply = await chatCompletion(
        [{ role: "system", content: SYSTEM_PROMPT(nickname, language) }, ...history],
        { max_tokens: 120 }
      );
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Oops, I couldn't connect. Try again! 🙈" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="relative">
      {/* Chat bubble toggle */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="flex items-center gap-2 rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft"
        aria-label="Chat with Buddy"
      >
        <ChatIcon />
        Ask Buddy anything
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute bottom-12 left-0 z-50 w-72 rounded-3xl border border-white/70 bg-white/95 shadow-card sm:w-80"
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-3xl bg-buddy-grape/10 px-4 py-3">
              <span className="text-sm font-semibold text-buddy-cocoa">Chat with Buddy 🤖</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="max-h-52 space-y-2 overflow-y-auto px-4 py-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs font-semibold ${
                    msg.role === "assistant"
                      ? "bg-buddy-mint/70 text-slate-700"
                      : "ml-auto bg-buddy-peach/80 text-slate-700"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {loading && (
                <div className="max-w-[90%] rounded-2xl bg-buddy-mint/40 px-3 py-2 text-xs text-slate-500">
                  Buddy is thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 rounded-b-3xl border-t border-white/60 bg-white/80 px-4 py-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a question…"
                className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-buddy-grape"
                disabled={loading}
              />
              <motion.button
                type="button"
                onClick={send}
                disabled={loading || !input.trim()}
                whileTap={{ scale: 0.92 }}
                className="rounded-full bg-buddy-grape px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                Send
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
