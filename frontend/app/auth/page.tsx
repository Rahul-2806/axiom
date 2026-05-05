"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) { setError("Email and password required."); return; }
    setLoading(true); setError(""); setSuccess("");
    const supabase = getSupabaseClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) setError(error.message);
      else setSuccess("Account created! Check your email to confirm, then log in.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F7", display: "flex", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #C4922A !important; background: #fff !important; }
        input::placeholder { color: #C4A882; }
        .tab { padding: 10px 0; flex: 1; text-align: center; font-size: 12px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; color: #A89070; transition: all 0.2s; font-family: 'DM Mono', monospace; letter-spacing: 0.08em; }
        .tab.active { color: #C4922A; border-bottom-color: #C4922A; }
        .field input { width: 100%; background: #F4F1EC; border: 1.5px solid #E8DDD0; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #1A1208; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .submit-btn { width: 100%; background: #C4922A; border: none; border-radius: 8px; padding: 13px; color: #1A1208; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .submit-btn:hover:not(:disabled) { background: #B8841E; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(26,18,8,0.2); border-top-color: #1A1208; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Left — Branding */}
      <div style={{ flex: 1, background: "#1A1208", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", position: "relative", overflow: "hidden" }}>
        {/* Grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(196,146,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(196,146,42,0.06) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: "#C4922A", letterSpacing: "0.15em", lineHeight: 1, marginBottom: 16 }}>AXIOM</div>
          <div style={{ width: 60, height: 2, background: "rgba(196,146,42,0.4)", marginBottom: 24 }} />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "rgba(196,146,42,0.4)", textTransform: "uppercase" as const, marginBottom: 32 }}>Self-Orchestrating AI OS</div>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
            {[
              { icon: "⬡", title: "5 Specialist Agents", desc: "Finance, Code, Research, Web, System" },
              { icon: "◈", title: "AWS Bedrock Powered", desc: "Claude Opus as the orchestration brain" },
              { icon: "◎", title: "Real-time Intelligence", desc: "Live data from 13+ integrated tools" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(196,146,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C4922A", fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#E8DDD0", marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(232,221,208,0.45)" }}>{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — Form */}
      <div style={{ width: 440, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} style={{ width: "100%", maxWidth: 360 }}>

          {/* Logo mark */}
          <div style={{ marginBottom: 32, textAlign: "center" as const }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#C4922A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#1A1208", marginBottom: 16 }}>A</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#1A1208", letterSpacing: "0.1em" }}>AXIOM</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#A89070", letterSpacing: "0.2em", marginTop: 4 }}>AI OPERATING SYSTEM</div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #E8DDD0", marginBottom: 28 }}>
            <div className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>LOGIN</div>
            <div className={`tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}>SIGN UP</div>
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div className="field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="field">
              <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
            <div className="field">
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>

            {error && (
              <div style={{ background: "#FDF0EE", border: "1px solid #F0C4BE", borderRadius: 8, padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#C0392B" }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: "#E1F5EE", border: "1px solid #9FE1CB", borderRadius: 8, padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#0F6E56" }}>
                {success}
              </div>
            )}

            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? "PLEASE WAIT…" : mode === "login" ? "ENTER AXIOM →" : "CREATE ACCOUNT →"}
            </button>

            {/* Dev bypass */}
            <div style={{ textAlign: "center" as const, marginTop: 8 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C4A882", cursor: "pointer" }}
                onClick={() => { window.location.href = "/dashboard"; }}>
                Skip login (dev mode) →
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}