"use client";
import { motion } from "framer-motion";
import { useAXIOMStore } from "@/lib/store/axiom-store";

interface StatusBarProps {
  wsStatus: string;
  isRunning: boolean;
}

const WS_LABELS: Record<string, string> = {
  connected:    "ONLINE",
  connecting:   "CONNECTING",
  disconnected: "OFFLINE",
  error:        "ERROR",
};

const WS_COLORS: Record<string, string> = {
  connected:    "#00ff87",
  connecting:   "#D4AF37",
  disconnected: "#6b6b80",
  error:        "#ff2d55",
};

export function StatusBar({ wsStatus, isRunning }: StatusBarProps) {
  const { newSession, messages, currentPlan } = useAXIOMStore();
  const color = WS_COLORS[wsStatus] ?? "#6b6b80";
  const label = WS_LABELS[wsStatus] ?? "UNKNOWN";

  return (
    <div className="status-bar">
      {/* Left: AXIOM identity */}
      <div className="status-left">
        <div className="status-dot-wrap">
          <span className="status-dot" style={{ background: color }} />
          {wsStatus === "connected" && <span className="status-ring" style={{ borderColor: color }} />}
        </div>
        <span className="status-system-name">AXIOM</span>
        <span className="status-version">v1.0</span>
        <span className="status-ws" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Center: current plan intent */}
      {currentPlan && (
        <motion.div
          className="status-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <span className="plan-intent">{currentPlan.intent}</span>
          {currentPlan.parallel && (
            <span className="parallel-badge">∥ PARALLEL</span>
          )}
        </motion.div>
      )}

      {/* Right: controls */}
      <div className="status-right">
        <span className="msg-count">{messages.length} msgs</span>
        <button className="new-session-btn" onClick={newSession} disabled={isRunning}>
          + New Session
        </button>
      </div>

      <style jsx>{`
        .status-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 32px;
          border-bottom: 1px solid rgba(212,175,55,0.08);
          background: rgba(5,5,8,0.8);
          backdrop-filter: blur(12px);
          height: 48px;
          flex-shrink: 0;
        }

        .status-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .status-dot-wrap {
          position: relative;
          width: 10px;
          height: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: block;
          position: relative;
          z-index: 1;
        }

        .status-ring {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 1px solid;
          animation: ringPulse 2s ease-in-out infinite;
          opacity: 0;
        }

        @keyframes ringPulse {
          0%   { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.8); }
        }

        .status-system-name {
          font-family: 'Space Grotesk', var(--font-display, sans-serif);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #D4AF37;
        }

        .status-version {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: rgba(212,175,55,0.3);
          letter-spacing: 0.1em;
          margin-top: 1px;
        }

        .status-ws {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          padding: 2px 8px;
          border-radius: 3px;
          background: currentColor;
          background: rgba(0,255,135,0.06);
          border: 1px solid currentColor;
          opacity: 1;
        }

        .status-center {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          overflow: hidden;
        }

        .plan-intent {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: rgba(212,175,55,0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 400px;
        }

        .parallel-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: rgba(0,245,255,0.6);
          border: 1px solid rgba(0,245,255,0.2);
          padding: 1px 6px;
          border-radius: 3px;
          letter-spacing: 0.1em;
          flex-shrink: 0;
        }

        .status-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          margin-left: auto;
        }

        .msg-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(107,107,128,0.5);
        }

        .new-session-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: rgba(212,175,55,0.4);
          background: transparent;
          border: 1px solid rgba(212,175,55,0.12);
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .new-session-btn:hover:not(:disabled) {
          color: #D4AF37;
          border-color: rgba(212,175,55,0.4);
          background: rgba(212,175,55,0.05);
        }
        .new-session-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
