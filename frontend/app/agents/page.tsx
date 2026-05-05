"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SideNav } from "@/components/layout/SideNav";

const AGENT_COLORS: Record<string, string> = {
  finance:  "#D4AF37",
  code:     "#00f5ff",
  research: "#a78bfa",
  web:      "#34d399",
  system:   "#f87171",
};

const AGENT_ICONS: Record<string, string> = {
  finance:  "₿",
  code:     "</>",
  research: "◉",
  web:      "⌖",
  system:   "⚙",
};

interface Agent {
  domain: string;
  name: string;
  description: string;
  tools: { name: string; description: string }[];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data — replace with actual API call: GET /api/v1/agents
    setTimeout(() => {
      setAgents([
        { domain: "finance",  name: "FinanceAgent",  description: "Market intelligence, stock/crypto prices, arbitrage, portfolio analysis", tools: [{ name: "get_stock_price", description: "Fetch real-time stock price" }, { name: "get_crypto_price", description: "Fetch crypto price" }] },
        { domain: "code",     name: "CodeAgent",     description: "Code generation, review, debugging, architecture, DevOps", tools: [{ name: "run_python", description: "Execute Python code" }, { name: "search_github", description: "Search GitHub" }] },
        { domain: "research", name: "ResearchAgent", description: "Web research, academic papers, fact-checking, knowledge synthesis", tools: [{ name: "web_search", description: "Search the web" }, { name: "search_arxiv", description: "Search academic papers" }] },
        { domain: "web",      name: "WebAgent",      description: "Web scraping, news monitoring, URL analysis, trend detection", tools: [{ name: "scrape_url", description: "Extract content from URL" }, { name: "web_search", description: "Search the web" }] },
        { domain: "system",   name: "SystemAgent",   description: "File operations, scheduling, notifications, workflow automation", tools: [{ name: "send_email", description: "Send email" }, { name: "schedule_task", description: "Schedule a task" }] },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const selectedAgent = agents.find((a) => a.domain === selected);

  return (
    <div className="agents-root">
      <div className="agents-ambient" />
      <div className="agents-grid" />
      <div className="agents-layout">
        <SideNav />
        <main className="agents-main">
          <div className="agents-header">
            <h1 className="page-title">AGENT NETWORK</h1>
            <p className="page-subtitle">5 domain specialists · 8 tools registered</p>
          </div>

          <div className="agents-content">
            {/* Agent cards grid */}
            <div className="agents-grid-cards">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="agent-card skeleton" />
                ))
              ) : (
                agents.map((agent, i) => {
                  const color = AGENT_COLORS[agent.domain];
                  const icon = AGENT_ICONS[agent.domain];
                  const isSelected = selected === agent.domain;

                  return (
                    <motion.div
                      key={agent.domain}
                      className={`agent-card ${isSelected ? "selected" : ""}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      style={{ "--agent-color": color } as React.CSSProperties}
                      onClick={() => setSelected(isSelected ? null : agent.domain)}
                    >
                      <div className="card-icon" style={{ color, borderColor: color + "30" }}>
                        {icon}
                      </div>
                      <div className="card-info">
                        <span className="card-name">{agent.name}</span>
                        <span className="card-desc">{agent.description}</span>
                      </div>
                      <div className="card-tools-count">
                        <span>{agent.tools.length}</span>
                        <span className="tools-label">tools</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Detail panel */}
            {selectedAgent && (
              <motion.div
                className="agent-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{ "--agent-color": AGENT_COLORS[selectedAgent.domain] } as React.CSSProperties}
              >
                <div className="detail-header">
                  <span className="detail-icon" style={{ color: AGENT_COLORS[selectedAgent.domain] }}>
                    {AGENT_ICONS[selectedAgent.domain]}
                  </span>
                  <div>
                    <div className="detail-name">{selectedAgent.name}</div>
                    <div className="detail-domain">{selectedAgent.domain.toUpperCase()}</div>
                  </div>
                </div>
                <p className="detail-desc">{selectedAgent.description}</p>
                <div className="detail-section-label">REGISTERED TOOLS</div>
                <div className="detail-tools">
                  {selectedAgent.tools.map((tool) => (
                    <div key={tool.name} className="tool-row">
                      <span className="tool-name">{tool.name}</span>
                      <span className="tool-desc">{tool.description}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .agents-root {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #050508;
        }
        .agents-ambient {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 60% 40% at 20% 50%, rgba(212,175,55,0.04) 0%, transparent 60%);
          pointer-events: none;
        }
        .agents-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }
        .agents-layout {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 64px 1fr;
          height: 100vh;
        }
        .agents-main {
          display: flex;
          flex-direction: column;
          height: 100vh;
          border-left: 1px solid rgba(212,175,55,0.08);
          overflow: hidden;
        }
        .agents-header {
          padding: 32px 40px 24px;
          border-bottom: 1px solid rgba(212,175,55,0.08);
        }
        .page-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #D4AF37;
          margin: 0 0 4px;
        }
        .page-subtitle {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: rgba(107,107,128,0.5);
          letter-spacing: 0.08em;
          margin: 0;
        }
        .agents-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px 40px;
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-content: start;
        }
        .agents-grid-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .agent-card {
          background: rgba(15,15,26,0.6);
          border: 1px solid rgba(212,175,55,0.08);
          border-radius: 12px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: pointer;
          transition: all 0.25s;
        }
        .agent-card:hover {
          border-color: color-mix(in srgb, var(--agent-color) 30%, transparent);
          background: rgba(15,15,26,0.9);
          transform: translateX(4px);
        }
        .agent-card.selected {
          border-color: color-mix(in srgb, var(--agent-color) 50%, transparent);
          background: color-mix(in srgb, var(--agent-color) 4%, rgba(15,15,26,0.9));
          box-shadow: 0 0 20px color-mix(in srgb, var(--agent-color) 8%, transparent);
        }
        .agent-card.skeleton {
          height: 80px;
          background: rgba(212,175,55,0.03);
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
        }
        .card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .card-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #e8e8f0;
        }
        .card-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: rgba(107,107,128,0.6);
          line-height: 1.4;
        }
        .card-tools-count {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .card-tools-count span:first-child {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: rgba(212,175,55,0.4);
        }
        .tools-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: rgba(107,107,128,0.4);
          letter-spacing: 0.1em;
        }

        /* Detail */
        .agent-detail {
          background: rgba(10,10,18,0.8);
          border: 1px solid color-mix(in srgb, var(--agent-color) 20%, transparent);
          border-radius: 12px;
          padding: 24px;
          height: fit-content;
          position: sticky;
          top: 0;
        }
        .detail-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .detail-icon {
          font-size: 24px;
          line-height: 1;
        }
        .detail-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #e8e8f0;
        }
        .detail-domain {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: var(--agent-color);
          opacity: 0.6;
        }
        .detail-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: rgba(232,232,240,0.5);
          line-height: 1.6;
          margin: 0 0 20px;
        }
        .detail-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.2em;
          color: rgba(107,107,128,0.5);
          margin-bottom: 12px;
        }
        .detail-tools {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tool-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px;
          background: rgba(212,175,55,0.03);
          border: 1px solid rgba(212,175,55,0.06);
          border-radius: 8px;
        }
        .tool-name {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--agent-color);
          opacity: 0.8;
        }
        .tool-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: rgba(107,107,128,0.5);
        }
      `}</style>
    </div>
  );
}
