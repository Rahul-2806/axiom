"use client";
import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { useAXIOMStore, AgentDomain, AgentNode } from "@/lib/store/axiom-store";

const DOMAIN_CONFIG: Record<AgentDomain, { label: string; color: string; icon: string }> = {
  finance:  { label: "FINANCE",  color: "#D4AF37", icon: "₿" },
  code:     { label: "CODE",     color: "#00f5ff", icon: "</>" },
  research: { label: "RESEARCH", color: "#a78bfa", icon: "◉" },
  web:      { label: "WEB",      color: "#34d399", icon: "⌖" },
  system:   { label: "SYSTEM",   color: "#f87171", icon: "⚙" },
};

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: "orchestrator" | "agent";
  domain?: AgentDomain;
  status?: AgentNode["status"];
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  active: boolean;
}

export function AgentGraph({ expanded }: { expanded: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { agents, currentPlan, isRunning } = useAXIOMStore();

  const nodes: GraphNode[] = useMemo(() => [
    { id: "orchestrator", type: "orchestrator" },
    ...Object.keys(agents).map((domain) => ({
      id: domain,
      type: "agent" as const,
      domain: domain as AgentDomain,
      status: agents[domain as AgentDomain].status,
    })),
  ], [agents]);

  const links: GraphLink[] = useMemo(() => {
    const activeDomains = new Set(currentPlan?.domains ?? []);
    return Object.keys(agents).map((domain) => ({
      source: "orchestrator",
      target: domain,
      active: isRunning && activeDomains.has(domain as AgentDomain),
    }));
  }, [agents, currentPlan, isRunning]);

  useEffect(() => {
    if (!svgRef.current) return;

    const container = svgRef.current.parentElement!;
    const W = container.clientWidth || 300;
    const H = container.clientHeight || 400;

    const svg = d3.select(svgRef.current)
      .attr("width", W)
      .attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`);

    svg.selectAll("*").remove();

    // ── Defs ──────────────────────────────────────────────────
    const defs = svg.append("defs");

    // Glow filter
    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Strong glow
    const glowStrong = defs.append("filter").attr("id", "glow-strong");
    glowStrong.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
    const mergeStrong = glowStrong.append("feMerge");
    mergeStrong.append("feMergeNode").attr("in", "blur");
    mergeStrong.append("feMergeNode").attr("in", "SourceGraphic");

    // Gradient for orchestrator
    const orchGrad = defs.append("radialGradient")
      .attr("id", "orch-grad")
      .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
    orchGrad.append("stop").attr("offset", "0%").attr("stop-color", "#D4AF37").attr("stop-opacity", 0.3);
    orchGrad.append("stop").attr("offset", "100%").attr("stop-color", "#D4AF37").attr("stop-opacity", 0);

    // Arrow marker
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(212,175,55,0.4)");

    // ── Layout ─────────────────────────────────────────────────
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.32;

    // Fixed positions — radial layout around orchestrator
    const agentDomains = Object.keys(agents) as AgentDomain[];
    const posMap: Record<string, { x: number; y: number }> = { orchestrator: { x: cx, y: cy } };
    agentDomains.forEach((domain, i) => {
      const angle = (i / agentDomains.length) * 2 * Math.PI - Math.PI / 2;
      posMap[domain] = { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
    });

    // ── Draw links ────────────────────────────────────────────
    const linkGroup = svg.append("g").attr("class", "links");

    links.forEach((link) => {
      const src = posMap["orchestrator"];
      const tgt = posMap[link.target as string];
      if (!src || !tgt) return;

      const cfg = DOMAIN_CONFIG[(link.target as AgentDomain)];
      const color = link.active ? cfg?.color ?? "#D4AF37" : "rgba(212,175,55,0.12)";

      // Base line
      linkGroup.append("line")
        .attr("x1", src.x).attr("y1", src.y)
        .attr("x2", tgt.x).attr("y2", tgt.y)
        .attr("stroke", color)
        .attr("stroke-width", link.active ? 1.5 : 0.5)
        .attr("stroke-dasharray", link.active ? "none" : "4,4")
        .attr("marker-end", "url(#arrow)")
        .style("transition", "all 0.4s ease");

      // Animated pulse on active links
      if (link.active) {
        const circle = linkGroup.append("circle")
          .attr("r", 3)
          .attr("fill", color)
          .attr("filter", "url(#glow)");

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;

        function animatePulse() {
          circle
            .attr("cx", src.x).attr("cy", src.y)
            .transition()
            .duration(1200)
            .ease(d3.easeLinear)
            .attr("cx", src.x + dx)
            .attr("cy", src.y + dy)
            .on("end", animatePulse);
        }
        animatePulse();
      }
    });

    // ── Draw orchestrator ─────────────────────────────────────
    const orchGroup = svg.append("g")
      .attr("transform", `translate(${cx},${cy})`);

    // Ambient glow
    orchGroup.append("circle")
      .attr("r", 40)
      .attr("fill", "url(#orch-grad)")
      .attr("opacity", isRunning ? 1 : 0.4);

    // Pulse ring (when running)
    if (isRunning) {
      orchGroup.append("circle")
        .attr("r", 26)
        .attr("fill", "none")
        .attr("stroke", "#D4AF37")
        .attr("stroke-width", 1)
        .attr("opacity", 0.6)
        .attr("class", "orch-pulse-ring");
    }

    // Main circle
    orchGroup.append("circle")
      .attr("r", 22)
      .attr("fill", "rgba(212,175,55,0.08)")
      .attr("stroke", "#D4AF37")
      .attr("stroke-width", isRunning ? 2 : 1)
      .attr("filter", isRunning ? "url(#glow-strong)" : "url(#glow)");

    // Inner dot
    orchGroup.append("circle")
      .attr("r", 4)
      .attr("fill", "#D4AF37")
      .attr("filter", "url(#glow)");

    orchGroup.append("text")
      .attr("y", 36)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(212,175,55,0.7)")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "9")
      .attr("letter-spacing", "0.12em")
      .text("ORCHESTRATOR");

    // ── Draw agents ───────────────────────────────────────────
    agentDomains.forEach((domain) => {
      const pos = posMap[domain];
      const cfg = DOMAIN_CONFIG[domain];
      const node = agents[domain];
      const status = node.status;

      const color = status === "idle"     ? "rgba(212,175,55,0.15)"
                  : status === "running"  ? cfg.color
                  : status === "complete" ? "#00ff87"
                  : "#ff2d55";

      const strokeColor = status === "idle"     ? "rgba(212,175,55,0.2)"
                        : status === "running"  ? cfg.color
                        : status === "complete" ? "#00ff87"
                        : "#ff2d55";

      const agentGroup = svg.append("g")
        .attr("transform", `translate(${pos.x},${pos.y})`);

      // Status ring (running = animated)
      if (status === "running") {
        agentGroup.append("circle")
          .attr("r", 20)
          .attr("fill", "none")
          .attr("stroke", cfg.color)
          .attr("stroke-width", 1)
          .attr("opacity", 0.3)
          .attr("class", "agent-ring");
      }

      // Main circle
      agentGroup.append("circle")
        .attr("r", 16)
        .attr("fill", `${color}22`)
        .attr("stroke", strokeColor)
        .attr("stroke-width", status === "running" ? 2 : 1)
        .attr("filter", status !== "idle" ? "url(#glow)" : "none")
        .style("transition", "all 0.4s ease");

      // Icon
      agentGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", status === "idle" ? "rgba(212,175,55,0.3)" : cfg.color)
        .attr("font-size", "11")
        .attr("font-family", "monospace")
        .text(cfg.icon);

      // Label
      agentGroup.append("text")
        .attr("y", 26)
        .attr("text-anchor", "middle")
        .attr("fill", status === "idle" ? "rgba(212,175,55,0.3)" : cfg.color)
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("font-size", "8")
        .attr("letter-spacing", "0.1em")
        .attr("font-weight", status !== "idle" ? "600" : "400")
        .text(cfg.label);

      // Tools used badge
      if (status === "complete" && node.tools_used?.length) {
        agentGroup.append("text")
          .attr("y", 36)
          .attr("text-anchor", "middle")
          .attr("fill", "rgba(0,255,135,0.5)")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "7")
          .text(`${node.tools_used.length} tool${node.tools_used.length > 1 ? "s" : ""}`);
      }

      // Duration badge (if complete)
      if (status === "complete" && node.duration_ms) {
        agentGroup.append("text")
          .attr("y", status === "complete" && node.tools_used?.length ? 44 : 36)
          .attr("text-anchor", "middle")
          .attr("fill", "rgba(0,255,135,0.35)")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "7")
          .text(`${node.duration_ms}ms`);
      }
    });

    // ── CSS animations via style element ─────────────────────
    const style = svg.append("style");
    style.text(`
      .orch-pulse-ring {
        animation: orchPulse 1.5s ease-in-out infinite;
      }
      .agent-ring {
        animation: agentPulse 1.2s ease-in-out infinite;
      }
      @keyframes orchPulse {
        0%, 100% { r: 26; opacity: 0.6; }
        50%       { r: 34; opacity: 0.1; }
      }
      @keyframes agentPulse {
        0%, 100% { r: 20; opacity: 0.3; }
        50%       { r: 28; opacity: 0.05; }
      }
    `);

  }, [agents, currentPlan, isRunning, expanded]);

  return (
    <div className="graph-container">
      <svg ref={svgRef} className="agent-svg" />

      {/* Legend */}
      <div className="graph-legend">
        {Object.entries(DOMAIN_CONFIG).map(([domain, cfg]) => {
          const node = agents[domain as AgentDomain];
          return (
            <div key={domain} className="legend-item">
              <span className="legend-dot" style={{ background: cfg.color, opacity: node.status === "idle" ? 0.2 : 1 }} />
              <span className="legend-label" style={{ color: node.status === "idle" ? "rgba(212,175,55,0.25)" : cfg.color }}>
                {cfg.label}
              </span>
              {node.status === "running" && <span className="legend-pulse" style={{ color: cfg.color }}>●</span>}
              {node.status === "complete" && <span style={{ color: "#00ff87", fontSize: "9px" }}>✓</span>}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .graph-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .agent-svg {
          width: 100%;
          flex: 1;
          min-height: 0;
        }
        .graph-legend {
          padding: 12px 20px;
          border-top: 1px solid rgba(212,175,55,0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .legend-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: opacity 0.3s;
        }
        .legend-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          flex: 1;
          transition: color 0.3s;
        }
        .legend-pulse {
          font-size: 8px;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
