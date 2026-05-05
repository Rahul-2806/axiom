"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useAXIOMStore, AgentDomain, Message } from "@/lib/store/axiom-store";

const DOMAIN_COLORS: Record<AgentDomain, string> = {
  finance:  "#D4AF37",
  code:     "#00f5ff",
  research: "#a78bfa",
  web:      "#34d399",
  system:   "#f87171",
};

const SUGGESTIONS = [
  "Compare Bitcoin and Ethereum performance this month",
  "Write a FastAPI WebSocket endpoint with auth",
  "Research the latest advances in LLM reasoning",
  "Scrape and summarize Hacker News top stories",
  "Analyze the AXIOM codebase for security issues",
];

interface ChatPanelProps {
  onSend: (message: string) => void;
}

export function ChatPanel({ onSend }: ChatPanelProps) {
  const { messages, streamingContent, isRunning, currentPlan, addMessage } = useAXIOMStore();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSentFirst = messages.length > 0;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const lines = e.target.value.split("\n").length;
    setRows(Math.min(lines, 6));
  };

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isRunning) return;
    addMessage({ role: "user", content: msg });
    onSend(msg);
    setInput("");
    setRows(1);
  }, [input, isRunning, onSend, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      {/* Messages */}
      <div className="messages-area">
        {!hasSentFirst && (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="axiom-wordmark">AXIOM</div>
            <p className="axiom-tagline">One brain. Infinite agents.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  className="suggestion-chip"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Streaming response */}
        {streamingContent && (
          <motion.div
            className="message assistant-message"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="message-meta">
              <span className="sender-tag">AXIOM</span>
              {currentPlan?.domains.map((d) => (
                <span key={d} className="domain-tag" style={{ color: DOMAIN_COLORS[d], borderColor: DOMAIN_COLORS[d] + "40" }}>
                  {d}
                </span>
              ))}
            </div>
            <div className="message-content axiom-markdown streaming-cursor">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {streamingContent}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}

        {/* Thinking indicator */}
        {isRunning && !streamingContent && (
          <motion.div
            className="thinking-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="thinking-dots">
              <span />
              <span />
              <span />
            </span>
            <span className="thinking-label">
              {currentPlan ? `Routing to ${currentPlan.domains.join(", ")}…` : "Orchestrating…"}
            </span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        {/* Active domains indicator */}
        {isRunning && currentPlan && (
          <motion.div
            className="active-agents-bar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {currentPlan.domains.map((d) => (
              <span key={d} className="active-domain-pill" style={{ borderColor: DOMAIN_COLORS[d] + "60", color: DOMAIN_COLORS[d] }}>
                <span className="running-dot" style={{ background: DOMAIN_COLORS[d] }} />
                {d}
              </span>
            ))}
          </motion.div>
        )}

        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Ask AXIOM anything…"
            value={input}
            rows={rows}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
          />
          <button
            className={`send-btn ${isRunning ? "sending" : ""} ${input.trim() ? "active" : ""}`}
            onClick={handleSend}
            disabled={isRunning || !input.trim()}
          >
            {isRunning ? (
              <span className="spinner" />
            ) : (
              <span className="send-icon">↑</span>
            )}
          </button>
        </div>

        <div className="input-footer">
          <span className="shortcut-hint">⏎ send · ⇧⏎ newline</span>
        </div>
      </div>

      <style jsx>{`
        .chat-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 0;
          scroll-behavior: smooth;
        }

        .messages-area::-webkit-scrollbar { width: 3px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 2px; }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
        }

        .axiom-wordmark {
          font-family: 'Space Grotesk', var(--font-display, sans-serif);
          font-size: clamp(48px, 8vw, 80px);
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #D4AF37;
          text-shadow: 0 0 40px rgba(212,175,55,0.3), 0 0 80px rgba(212,175,55,0.1);
          animation: wordmarkGlow 3s ease-in-out infinite alternate;
        }

        @keyframes wordmarkGlow {
          from { text-shadow: 0 0 20px rgba(212,175,55,0.3), 0 0 60px rgba(212,175,55,0.1); }
          to   { text-shadow: 0 0 40px rgba(212,175,55,0.6), 0 0 100px rgba(212,175,55,0.2); }
        }

        .axiom-tagline {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          letter-spacing: 0.15em;
          color: rgba(212,175,55,0.4);
          text-transform: uppercase;
          margin: 0;
        }

        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          max-width: 600px;
          margin-top: 16px;
        }

        .suggestion-chip {
          background: rgba(212,175,55,0.04);
          border: 1px solid rgba(212,175,55,0.12);
          color: rgba(212,175,55,0.5);
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          padding: 8px 14px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .suggestion-chip:hover {
          background: rgba(212,175,55,0.08);
          border-color: rgba(212,175,55,0.3);
          color: #D4AF37;
          transform: translateY(-1px);
        }

        /* ── Messages ── */
        :global(.message) {
          padding: 20px 0;
          border-bottom: 1px solid rgba(212,175,55,0.04);
          animation: fadeSlideIn 0.3s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        :global(.user-message .message-content) {
          color: rgba(232,232,240,0.85);
          font-size: 15px;
          line-height: 1.6;
          padding: 12px 16px;
          background: rgba(212,175,55,0.04);
          border: 1px solid rgba(212,175,55,0.08);
          border-radius: 12px 12px 4px 12px;
          display: inline-block;
          max-width: 80%;
          float: right;
          clear: both;
        }

        :global(.user-message) {
          display: flex;
          justify-content: flex-end;
          overflow: hidden;
        }
        :global(.user-message > div) {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          max-width: 80%;
        }

        :global(.assistant-message) {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        :global(.message-meta) {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.sender-tag) {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          color: rgba(212,175,55,0.6);
        }

        :global(.domain-tag) {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid;
          opacity: 0.8;
        }

        :global(.message-content.axiom-markdown) {
          font-size: 14px;
          line-height: 1.75;
          color: rgba(232,232,240,0.88);
        }

        .thinking-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 0;
        }

        .thinking-dots {
          display: flex;
          gap: 5px;
        }
        .thinking-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #D4AF37;
          opacity: 0.4;
          animation: dotPulse 1.4s ease-in-out infinite;
        }
        .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }

        .thinking-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: rgba(212,175,55,0.4);
          letter-spacing: 0.05em;
        }

        /* ── Input ── */
        .input-area {
          border-top: 1px solid rgba(212,175,55,0.08);
          padding: 16px 32px 20px;
          background: rgba(10,10,18,0.6);
          backdrop-filter: blur(12px);
        }

        .active-agents-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .active-domain-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid;
          text-transform: uppercase;
        }

        .running-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .input-wrapper {
          position: relative;
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .chat-input {
          flex: 1;
          background: rgba(15,15,26,0.8);
          border: 1px solid rgba(212,175,55,0.15);
          border-radius: 12px;
          padding: 14px 16px;
          color: #e8e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          resize: none;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          min-height: 48px;
        }
        .chat-input:focus {
          border-color: rgba(212,175,55,0.4);
          box-shadow: 0 0 0 1px rgba(212,175,55,0.1), 0 0 20px rgba(212,175,55,0.05);
        }
        .chat-input::placeholder { color: rgba(107,107,128,0.6); }
        .chat-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .send-btn {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: 1px solid rgba(212,175,55,0.15);
          background: rgba(212,175,55,0.05);
          color: rgba(212,175,55,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .send-btn.active {
          border-color: rgba(212,175,55,0.5);
          background: rgba(212,175,55,0.1);
          color: #D4AF37;
        }
        .send-btn.active:hover {
          background: rgba(212,175,55,0.2);
          box-shadow: 0 0 20px rgba(212,175,55,0.15);
          transform: translateY(-1px);
        }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .send-icon { font-size: 18px; font-weight: 700; }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(212,175,55,0.2);
          border-top-color: #D4AF37;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .input-footer {
          margin-top: 8px;
          display: flex;
          justify-content: flex-end;
        }

        .shortcut-hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(107,107,128,0.4);
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      className={`message ${isUser ? "user-message" : "assistant-message"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {isUser ? (
        <div>
          <div className="message-content">{message.content}</div>
        </div>
      ) : (
        <>
          <div className="message-meta">
            <span className="sender-tag">AXIOM</span>
            {message.agents_used?.map((d) => (
              <span key={d} className="domain-tag" style={{ color: DOMAIN_COLORS[d], borderColor: DOMAIN_COLORS[d] + "40" }}>
                {d}
              </span>
            ))}
            {message.duration_ms && (
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "rgba(107,107,128,0.5)", marginLeft: "auto" }}>
                {message.duration_ms}ms
              </span>
            )}
          </div>
          <div className="message-content axiom-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Markdown Components ────────────────────────────────────────

const mdComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <SyntaxHighlighter
        style={oneDark as any}
        language={match[1]}
        PreTag="div"
        customStyle={{
          background: "#0a0a12",
          border: "1px solid rgba(212,175,55,0.12)",
          borderRadius: "8px",
          fontSize: "13px",
          fontFamily: "JetBrains Mono, monospace",
        }}
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code
        style={{
          fontFamily: "JetBrains Mono, monospace",
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.15)",
          padding: "1px 6px",
          borderRadius: "4px",
          fontSize: "0.875em",
          color: "#D4AF37",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
};
