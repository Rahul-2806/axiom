"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SideNav } from "@/components/layout/SideNav";

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ content: string; similarity: number; memory_type: string; created_at: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    // Replace with actual API call: GET /api/v1/memory/search?q=...
    await new Promise((r) => setTimeout(r, 800));
    setResults([
      { content: "User prefers dark mode interfaces with gold accents", memory_type: "preference", similarity: 0.94, created_at: new Date().toISOString() },
      { content: "Discussed NordAI project architecture with Groq LLaMA", memory_type: "conversation", similarity: 0.87, created_at: new Date(Date.now() - 86400000).toISOString() },
    ]);
    setSearching(false);
  };

  return (
    <div className="memory-root">
      <div className="ambient" />
      <div className="grid-bg" />
      <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "64px 1fr", height: "100vh" }}>
        <SideNav />
        <main style={{ borderLeft: "1px solid rgba(212,175,55,0.08)", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
          <div style={{ padding: "32px 40px 24px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 700, letterSpacing: "0.15em", color: "#D4AF37", margin: "0 0 4px" }}>MEMORY OS</h1>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(107,107,128,0.5)", margin: 0 }}>Semantic search over long-term memory</p>
          </div>

          <div style={{ padding: "32px 40px", flex: 1, overflow: "auto" }}>
            {/* Search */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
              <input
                style={{ flex: 1, background: "rgba(15,15,26,0.8)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "10px", padding: "12px 16px", color: "#e8e8f0", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
                placeholder="Search your memories…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{ padding: "12px 24px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#D4AF37", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}
              >
                {searching ? "SEARCHING…" : "SEARCH"}
              </button>
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {results.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{ background: "rgba(15,15,26,0.6)", border: "1px solid rgba(212,175,55,0.08)", borderRadius: "10px", padding: "16px 20px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(212,175,55,0.5)", textTransform: "uppercase" }}>{r.memory_type}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#00ff87" }}>{(r.similarity * 100).toFixed(0)}% match</span>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(232,232,240,0.8)", margin: 0 }}>{r.content}</p>
                </motion.div>
              ))}

              {results.length === 0 && !searching && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(107,107,128,0.3)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.1em" }}>
                  Search to recall memories
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .memory-root { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #050508; }
        .ambient { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 50%, rgba(212,175,55,0.04) 0%, transparent 60%); pointer-events: none; }
        .grid-bg { position: fixed; inset: 0; background-image: linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
      `}</style>
    </div>
  );
}
