"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAXIOMStore } from "@/lib/store/axiom-store";
import { useAXIOMWebSocket } from "@/lib/hooks/use-websocket";
import { MessageBody } from "./MessageBody";

const AGENTS = {
  finance:  { color: "#C4922A", bg: "#FBF6EC", border: "#E8D5A8", label: "FINANCE" },
  code:     { color: "#185FA5", bg: "#E6F1FB", border: "#B5D4F4", label: "CODE" },
  research: { color: "#C0392B", bg: "#FDF0EE", border: "#F0C4BE", label: "RESEARCH" },
  web:      { color: "#0F6E56", bg: "#E1F5EE", border: "#9FE1CB", label: "WEB" },
  system:   { color: "#533AB7", bg: "#EEEDFE", border: "#CECBF6", label: "SYSTEM" },
} as const;
type Domain = keyof typeof AGENTS;

const SUGGESTIONS = [
  "Build a full Flask website with auth",
  "Write a FastAPI WebSocket endpoint",
  "Compare BTC vs ETH this month",
  "Research latest GPT-4o papers",
];

export default function DashboardPage() {
  const store = useAXIOMStore();
  const { sessionId, messages, streamingContent, isRunning, currentPlan, agents, wsStatus, addMessage, newSession } = store;
  const { send } = useAXIOMWebSocket(sessionId);
  const [input, setInput] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animFrames = useRef<number[]>([]);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isRunning && !streamingContent) {
      setShowThinking(true);
    } else {
      thinkingTimer.current = setTimeout(() => setShowThinking(false), 400);
    }
    return () => { if (thinkingTimer.current) clearTimeout(thinkingTimer.current); };
  }, [isRunning, streamingContent]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    animFrames.current.forEach(cancelAnimationFrame);
    animFrames.current = [];
    const W = svg.clientWidth || 220, H = svg.clientHeight || 320;
    const cx = W / 2, cy = H / 2 - 10, R = Math.min(W, H) * 0.3;
    const ns = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";

    const defs = document.createElementNS(ns, "defs");
    const f = document.createElementNS(ns, "filter"); f.setAttribute("id", "sf");
    const b = document.createElementNS(ns, "feGaussianBlur"); b.setAttribute("stdDeviation", "2"); b.setAttribute("result", "r");
    const m = document.createElementNS(ns, "feMerge");
    ["r", "SourceGraphic"].forEach(s => { const n = document.createElementNS(ns, "feMergeNode"); n.setAttribute("in", s); m.appendChild(n); });
    f.appendChild(b); f.appendChild(m); defs.appendChild(f); svg.appendChild(defs);

    const domains = Object.keys(AGENTS) as Domain[];
    const pos: Record<string, { x: number; y: number }> = { orc: { x: cx, y: cy } };
    domains.forEach((d, i) => {
      const a = (i / domains.length) * 2 * Math.PI - Math.PI / 2;
      pos[d] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });

    const lg = document.createElementNS(ns, "g");
    domains.forEach(d => {
      const s = pos.orc, t = pos[d], cfg = AGENTS[d], st = agents[d]?.status ?? "idle";
      const active = st !== "idle";
      const line = document.createElementNS(ns, "line");
      Object.entries({ x1: s.x, y1: s.y, x2: t.x, y2: t.y, stroke: active ? cfg.color : "#E8DDD0", "stroke-width": active ? 1.5 : 0.5 }).forEach(([k, v]) => line.setAttribute(k, String(v)));
      if (!active) line.setAttribute("stroke-dasharray", "3,3");
      lg.appendChild(line);
      if (st === "running") {
        const pc = document.createElementNS(ns, "circle"); pc.setAttribute("r", "3.5"); pc.setAttribute("fill", cfg.color); lg.appendChild(pc);
        const dx = t.x - s.x, dy = t.y - s.y; let p = Math.random();
        const anim = () => { p = (p + 0.008) % 1; pc.setAttribute("cx", String(s.x + dx * p)); pc.setAttribute("cy", String(s.y + dy * p)); animFrames.current.push(requestAnimationFrame(anim)); };
        anim();
      }
    });
    svg.appendChild(lg);

    const og = document.createElementNS(ns, "g"); og.setAttribute("transform", `translate(${cx},${cy})`);
    const oc = document.createElementNS(ns, "circle"); oc.setAttribute("r", "18"); oc.setAttribute("fill", "#C4922A"); oc.setAttribute("filter", "url(#sf)"); og.appendChild(oc);
    const ot = document.createElementNS(ns, "text"); ot.setAttribute("text-anchor", "middle"); ot.setAttribute("dominant-baseline", "central"); ot.setAttribute("fill", "#1A1208"); ot.setAttribute("font-size", "10"); ot.setAttribute("font-weight", "800"); ot.textContent = "A"; og.appendChild(ot);
    const ol = document.createElementNS(ns, "text"); ol.setAttribute("y", "30"); ol.setAttribute("text-anchor", "middle"); ol.setAttribute("fill", "#A89070"); ol.setAttribute("font-size", "7"); ol.setAttribute("font-family", "DM Mono, monospace"); ol.setAttribute("letter-spacing", "0.08em"); ol.textContent = "ORCHESTRATOR"; og.appendChild(ol);
    svg.appendChild(og);

    domains.forEach(d => {
      const p = pos[d], cfg = AGENTS[d], st = agents[d]?.status ?? "idle", active = st !== "idle";
      const ag = document.createElementNS(ns, "g"); ag.setAttribute("transform", `translate(${p.x},${p.y})`);
      const c = document.createElementNS(ns, "circle"); c.setAttribute("r", "14"); c.setAttribute("fill", active ? cfg.bg : "#FAF9F7"); c.setAttribute("stroke", active ? cfg.color : "#E8DDD0"); c.setAttribute("stroke-width", active ? "1.5" : "0.5"); if (active) c.setAttribute("filter", "url(#sf)"); ag.appendChild(c);
      const ico = document.createElementNS(ns, "text"); ico.setAttribute("text-anchor", "middle"); ico.setAttribute("dominant-baseline", "central"); ico.setAttribute("fill", active ? cfg.color : "#C4B8A0"); ico.setAttribute("font-size", "8"); ico.setAttribute("font-family", "DM Mono, monospace"); ico.setAttribute("font-weight", "500"); ico.textContent = cfg.label[0]; ag.appendChild(ico);
      const lbl = document.createElementNS(ns, "text"); lbl.setAttribute("y", "22"); lbl.setAttribute("text-anchor", "middle"); lbl.setAttribute("fill", active ? cfg.color : "#C4B8A0"); lbl.setAttribute("font-size", "6.5"); lbl.setAttribute("font-family", "DM Mono, monospace"); lbl.setAttribute("letter-spacing", "0.06em"); lbl.textContent = cfg.label; ag.appendChild(lbl);
      if (st === "complete") {
        const ck = document.createElementNS(ns, "text"); ck.setAttribute("y", "30"); ck.setAttribute("text-anchor", "middle"); ck.setAttribute("fill", "#0F6E56"); ck.setAttribute("font-size", "6"); ck.setAttribute("font-family", "DM Mono, monospace"); ck.textContent = "done"; ag.appendChild(ck);
      }
      svg.appendChild(ag);
    });
  }, [agents, isRunning]);

  useEffect(() => { msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" }); }, [messages, streamingContent, showThinking]);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isRunning) return;
    addMessage({ role: "user", content: msg });
    send(msg);
    setInput("");
    setShowThinking(true);
  }, [input, isRunning, send, addMessage]);

  const activeCount = Object.values(agents).filter(a => a.status === "running").length;
  const wsColor = wsStatus === "connected" ? "#22C55E" : wsStatus === "connecting" ? "#C4922A" : "#C0392B";
  const activeDomains = currentPlan?.domains ?? [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        :root{--gold:#C4922A;--gold-pale:#FBF6EC;--off-white:#FAF9F7;--warm-gray:#F4F1EC;--text:#1A1208;--text-2:#6B5B3E;--text-3:#A89070;--border:#E8DDD0;--border-2:#D4C4A8;--white:#FFFFFF}
        .dash-root{display:grid;grid-template-columns:52px 1fr 220px;height:100vh;background:var(--off-white);font-family:'DM Sans',sans-serif;color:var(--text)}
        .snav{background:var(--text);display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:2px}
        .slogo{width:36px;height:36px;border-radius:8px;background:var(--gold);display:flex;align-items:center;justify-content:center;margin-bottom:20px;cursor:pointer;font-family:'Playfair Display',serif;font-size:16px;font-weight:800;color:var(--text)}
        .navitem{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,0.25);font-size:15px;transition:all 0.2s;position:relative}
        .navitem:hover:not(.active){color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.04)}
        .navitem.active{background:rgba(196,146,42,0.18);color:#E8C97A}
        .navitem.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:18px;background:var(--gold);border-radius:0 2px 2px 0}
        .nav-sp{flex:1}
        .navatar{width:28px;height:28px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--text);cursor:pointer}
        .dash-main{display:flex;flex-direction:column;height:100vh;background:var(--off-white);border-left:1px solid var(--border);border-right:1px solid var(--border);overflow:hidden;position:relative}
        .topbar{display:flex;align-items:center;height:48px;padding:0 20px;border-bottom:1px solid var(--border);background:var(--white);gap:10px;flex-shrink:0}
        .tb-brand{font-family:'Playfair Display',serif;font-size:14px;font-weight:800;letter-spacing:0.12em;color:var(--text)}
        .tb-ver{font-family:'DM Mono',monospace;font-size:9px;color:var(--text-3)}
        .tb-badge{font-family:'DM Mono',monospace;font-size:9px;padding:2px 8px;border-radius:20px;border:1px solid}
        .tb-right{margin-left:auto;display:flex;align-items:center;gap:8px}
        .tb-msgs{font-family:'DM Mono',monospace;font-size:9px;color:var(--text-3)}
        .tb-new{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:var(--text-2);border:1px solid var(--border-2);padding:4px 12px;border-radius:20px;cursor:pointer;background:none;transition:all 0.2s}
        .tb-new:hover{background:var(--warm-gray);border-color:var(--gold);color:var(--gold)}
        .statrow{display:flex;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--white)}
        .stat{flex:1;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:1px;border-right:1px solid var(--border)}
        .stat:last-child{border-right:none}
        .statv{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--gold)}
        .statl{font-family:'DM Mono',monospace;font-size:7px;letter-spacing:0.1em;color:var(--text-3);text-transform:uppercase}
        .msgs{flex:1;overflow-y:auto;padding:24px 20px;display:flex;flex-direction:column;gap:20px}
        .msgs::-webkit-scrollbar{width:3px}
        .msgs::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:2px}
        .hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;min-height:55vh}
        .hero-line{width:40px;height:2px;background:var(--gold);margin:0 auto 4px}
        .hero-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:800;color:var(--text);letter-spacing:0.1em;line-height:1}
        .hero-sub{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.2em;color:var(--text-3);text-transform:uppercase}
        .hero-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:400px;margin-top:16px}
        .hchip{font-family:'DM Sans',sans-serif;font-size:11px;color:var(--text-2);border:1px solid var(--border-2);padding:7px 14px;border-radius:20px;cursor:pointer;transition:all 0.2s;background:var(--white)}
        .hchip:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-pale)}
        .umsg{display:flex;justify-content:flex-end}
        .umsg-b{font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text);background:var(--white);border:1px solid var(--border);padding:11px 15px;border-radius:16px 16px 4px 16px;max-width:75%;line-height:1.55;box-shadow:0 1px 4px rgba(0,0,0,0.06)}
        .amsg{display:flex;flex-direction:column;gap:8px}
        .amsg-hdr{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
        .amsg-av{width:26px;height:26px;border-radius:6px;background:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Playfair Display',serif;font-size:12px;font-weight:800;color:var(--text)}
        .amsg-name{font-family:'DM Mono',monospace;font-size:9px;font-weight:500;letter-spacing:0.12em;color:var(--text-2)}
        .atag{font-family:'DM Mono',monospace;font-size:8px;padding:2px 7px;border-radius:10px;border:1px solid}
        .thinking-wrap{display:flex;gap:10px;align-items:flex-start;padding:4px 0}
        .thinking-av{width:26px;height:26px;border-radius:6px;background:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Playfair Display',serif;font-size:12px;font-weight:800;color:var(--text)}
        .thinking-right{display:flex;flex-direction:column;gap:7px;padding-top:2px}
        .thinking-tags{display:flex;gap:5px;flex-wrap:wrap}
        .thinking-tag{font-family:'DM Mono',monospace;font-size:8px;padding:2px 8px;border-radius:10px;border:1px solid;animation:tagpulse 1.5s ease-in-out infinite}
        @keyframes tagpulse{0%,100%{opacity:0.5}50%{opacity:1}}
        .thinking-dots{display:flex;align-items:center;gap:8px}
        .tdots{display:flex;gap:5px}
        .tdot{width:8px;height:8px;border-radius:50%;animation:bounce 1.4s ease-in-out infinite}
        .tdot:nth-child(1){background:var(--gold);animation-delay:0s}
        .tdot:nth-child(2){background:#C0392B;animation-delay:0.2s}
        .tdot:nth-child(3){background:var(--gold);animation-delay:0.4s}
        @keyframes bounce{0%,100%{opacity:0.2;transform:translateY(0) scale(0.85)}50%{opacity:1;transform:translateY(-4px) scale(1.1)}}
        .thinking-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-3)}
        .inputz{border-top:1px solid var(--border);padding:12px 16px 14px;background:var(--white);flex-shrink:0}
        .agent-bar{display:flex;gap:5px;margin-bottom:8px;overflow:hidden}
        .apill{display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:8px;padding:3px 9px;border-radius:10px;border:1px solid}
        .apdot{width:4px;height:4px;border-radius:50%;animation:tagpulse 0.9s step-end infinite}
        .irow{display:flex;gap:8px;align-items:flex-end}
        .inp{flex:1;background:var(--warm-gray);border:1.5px solid var(--border);border-radius:12px;padding:11px 14px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:none;line-height:1.5;min-height:42px;transition:border-color 0.2s}
        .inp:focus{border-color:var(--gold);background:var(--white)}
        .inp::placeholder{color:var(--text-3)}
        .inp:disabled{opacity:0.5;cursor:not-allowed}
        .sbtn{width:42px;height:42px;border-radius:10px;border:none;background:var(--gold);color:var(--text);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0}
        .sbtn:hover:not(:disabled){background:#B8841E;transform:translateY(-1px)}
        .sbtn:disabled{background:var(--border);color:var(--text-3);cursor:not-allowed}
        .spinner{width:14px;height:14px;border:2px solid rgba(26,18,8,0.2);border-top-color:var(--text);border-radius:50%;animation:spin 0.7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ihint{font-family:'DM Mono',monospace;font-size:8px;color:var(--text-3);text-align:right;margin-top:5px}
        .gpanel{display:flex;flex-direction:column;height:100vh;background:var(--white);border-left:1px solid var(--border)}
        .gphdr{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0}
        .gplbl{font-family:'DM Mono',monospace;font-size:8px;font-weight:500;letter-spacing:0.15em;color:var(--text-3);text-transform:uppercase}
        .gpct{font-family:'DM Mono',monospace;font-size:8px;color:var(--gold);background:var(--gold-pale);padding:1px 7px;border-radius:10px;border:1px solid #E8D5A8}
        .gsvg{flex:1;width:100%}
        .gleg{padding:10px 14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:6px;flex-shrink:0}
        .gli{display:flex;align-items:center;gap:7px}
        .gldot{width:6px;height:6px;border-radius:50%;flex-shrink:0;transition:all 0.35s}
        .gllbl{font-family:'DM Mono',monospace;font-size:8px;letter-spacing:0.06em;transition:color 0.35s;flex:1}
        .glst{font-family:'DM Mono',monospace;font-size:7px}
      `}</style>

      <div className="dash-root">
        <nav className="snav">
          <div className="slogo">A</div>
          {[{ icon: "⬡", active: true }, { icon: "◈" }, { icon: "◎" }, { icon: "⊕" }].map((item, i) => (
            <div key={i} className={`navitem${item.active ? " active" : ""}`}>{item.icon}</div>
          ))}
          <div className="nav-sp" />
          <div className="navatar">R</div>
        </nav>

        <main className="dash-main">
          <div className="topbar">
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: wsColor, flexShrink: 0 }} />
            <span className="tb-brand">AXIOM</span>
            <span className="tb-ver">v1.0</span>
            <span className="tb-badge" style={{ color: wsColor, borderColor: wsColor + "40", background: wsColor + "12" }}>{wsStatus.toUpperCase()}</span>
            <div className="tb-right">
              <span className="tb-msgs">{messages.length} msgs</span>
              <button className="tb-new" onClick={newSession}>+ New session</button>
            </div>
          </div>

          <div className="statrow">
            {[
              { v: messages.filter(m => m.role === "assistant").length, l: "Runs" },
              { v: 5, l: "Agents" },
              { v: "841ms", l: "Latency" },
              { v: 13, l: "Tools" },
            ].map(s => (
              <div key={s.l} className="stat">
                <span className="statv">{s.v}</span>
                <span className="statl">{s.l}</span>
              </div>
            ))}
          </div>

          <div className="msgs" ref={msgsRef}>
            {messages.length === 0 && !isRunning && !showThinking && (
              <motion.div className="hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="hero-line" />
                <div className="hero-title">AXIOM</div>
                <div className="hero-sub">One brain · Infinite agents</div>
                <div className="hero-chips">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button key={s} className="hchip"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
                      onClick={() => setInput(s)}>
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  className={msg.role === "user" ? "umsg" : "amsg"}>
                  {msg.role === "user" ? (
                    <div className="umsg-b">{msg.content}</div>
                  ) : (
                    <>
                      <div className="amsg-hdr">
                        <div className="amsg-av">A</div>
                        <span className="amsg-name">AXIOM</span>
                        {msg.agents_used?.map(d => {
                          const cfg = AGENTS[d as Domain];
                          return cfg ? <span key={d} className="atag" style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>{d}</span> : null;
                        })}
                      </div>
                      <MessageBody content={msg.content} />
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {showThinking && (
                <motion.div className="thinking-wrap"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
                  <div className="thinking-av">A</div>
                  <div className="thinking-right">
                    {activeDomains.length > 0 && (
                      <div className="thinking-tags">
                        {activeDomains.map(d => {
                          const cfg = AGENTS[d as Domain];
                          return cfg ? <span key={d} className="thinking-tag" style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>{d}</span> : null;
                        })}
                      </div>
                    )}
                    <div className="thinking-dots">
                      <div className="tdots">
                        <div className="tdot" /><div className="tdot" /><div className="tdot" />
                      </div>
                      <span className="thinking-lbl">
                        {activeDomains.length > 0 ? `${activeDomains.join(" + ")} thinking…` : "Orchestrating…"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {streamingContent && !showThinking && (
                <motion.div className="amsg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="amsg-hdr">
                    <div className="amsg-av">A</div>
                    <span className="amsg-name">AXIOM</span>
                    {activeDomains.map(d => {
                      const cfg = AGENTS[d as Domain];
                      return cfg ? <span key={d} className="atag" style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>{d}</span> : null;
                    })}
                  </div>
                  <MessageBody content={streamingContent} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="inputz">
            <AnimatePresence>
              {isRunning && currentPlan && (
                <motion.div className="agent-bar"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 24, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}>
                  {currentPlan.domains.map(d => {
                    const cfg = AGENTS[d as Domain];
                    return cfg ? <span key={d} className="apill" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}><span className="apdot" style={{ background: cfg.color }} />{d.toUpperCase()}</span> : null;
                  })}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="irow">
              <textarea className="inp" rows={1} placeholder="Ask AXIOM anything…" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={isRunning} />
              <button className="sbtn" onClick={handleSend} disabled={!input.trim() || isRunning}>
                {isRunning ? <span className="spinner" /> : "↑"}
              </button>
            </div>
            <div className="ihint">↵ send · ⇧↵ newline</div>
          </div>
        </main>

        <aside className="gpanel">
          <div className="gphdr">
            <span className="gplbl">Agent Network</span>
            <span className="gpct">{activeCount} active</span>
          </div>
          <svg ref={svgRef} className="gsvg" />
          <div className="gleg">
            {(Object.entries(AGENTS) as [Domain, typeof AGENTS[Domain]][]).map(([d, cfg]) => {
              const st = agents[d]?.status ?? "idle";
              const active = st !== "idle";
              return (
                <div key={d} className="gli">
                  <div className="gldot" style={{ background: active ? cfg.color : "#D4C4A8" }} />
                  <span className="gllbl" style={{ color: active ? cfg.color : "#A89070" }}>{cfg.label}</span>
                  {st === "running" && <span className="glst" style={{ color: cfg.color }}>● running</span>}
                  {st === "complete" && <span className="glst" style={{ color: "#0F6E56" }}>✓ done</span>}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}