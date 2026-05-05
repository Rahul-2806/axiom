"use client";
import { motion } from "framer-motion";
import { OrchestratorPlan } from "@/lib/store/axiom-store";

const DOMAIN_COLORS: Record<string, string> = {
  finance:  "#D4AF37",
  code:     "#00f5ff",
  research: "#a78bfa",
  web:      "#34d399",
  system:   "#f87171",
};

const DOMAIN_ICONS: Record<string, string> = {
  finance:  "₿",
  code:     "</>",
  research: "◉",
  web:      "⌖",
  system:   "⚙",
};

interface PlanOverlayProps {
  plan: OrchestratorPlan;
}

export function PlanOverlay({ plan }: PlanOverlayProps) {
  return (
    <motion.div
      className="plan-overlay"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <div className="plan-header">
        <span className="plan-badge">ORCHESTRATING</span>
        {plan.parallel && <span className="parallel-badge">∥ PARALLEL EXECUTION</span>}
      </div>

      <p className="plan-intent">"{plan.intent}"</p>

      <div className="plan-agents">
        {plan.domains.map((domain, i) => (
          <motion.div
            key={domain}
            className="plan-agent-chip"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            style={{ borderColor: DOMAIN_COLORS[domain] + "50", color: DOMAIN_COLORS[domain] }}
          >
            <span className="chip-icon">{DOMAIN_ICONS[domain]}</span>
            <span className="chip-label">{domain.toUpperCase()}</span>
            <span className="chip-dot" style={{ background: DOMAIN_COLORS[domain] }} />
          </motion.div>
        ))}
      </div>

      {plan.reasoning && (
        <p className="plan-reasoning">{plan.reasoning}</p>
      )}

      <style jsx>{`
        .plan-overlay {
          position: fixed;
          top: 56px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          background: rgba(10,10,18,0.95);
          border: 1px solid rgba(212,175,55,0.2);
          border-radius: 12px;
          padding: 16px 20px;
          min-width: 360px;
          max-width: 560px;
          backdrop-filter: blur(20px);
          box-shadow: 0 4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.05);
        }

        .plan-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .plan-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #D4AF37;
          background: rgba(212,175,55,0.08);
          border: 1px solid rgba(212,175,55,0.2);
          padding: 3px 8px;
          border-radius: 3px;
        }

        .parallel-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: rgba(0,245,255,0.6);
          border: 1px solid rgba(0,245,255,0.2);
          padding: 3px 8px;
          border-radius: 3px;
        }

        .plan-intent {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: rgba(232,232,240,0.7);
          margin: 0 0 12px;
          font-style: italic;
        }

        .plan-agents {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .plan-agent-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid;
          padding: 5px 12px;
          border-radius: 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          background: rgba(255,255,255,0.02);
        }

        .chip-icon {
          font-size: 11px;
          opacity: 0.8;
        }

        .chip-label {
          font-weight: 600;
        }

        .chip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .plan-reasoning {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(107,107,128,0.5);
          margin: 0;
          line-height: 1.5;
          border-top: 1px solid rgba(212,175,55,0.06);
          padding-top: 10px;
        }
      `}</style>
    </motion.div>
  );
}
