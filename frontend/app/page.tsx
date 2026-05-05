"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/auth");
  }, [router]);
  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#A89070", letterSpacing: "0.1em" }}>
      LOADING AXIOM...
    </div>
  );
}
