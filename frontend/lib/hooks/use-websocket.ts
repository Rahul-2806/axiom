"use client";
import { useEffect, useRef, useCallback } from "react";
import { useAXIOMStore, WSEvent } from "@/lib/store/axiom-store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
const MAX_RECONNECT = 5;

export function useAXIOMWebSocket(sessionId: string) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const { handleWSEvent, setWsStatus } = useAXIOMStore();

  const connect = useCallback(async () => {
    setWsStatus("connecting");

    // Try to get real Supabase token, fall back to dev-token
    let token = "dev-token";
    try {
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          token = data.session.access_token;
        }
      }
    } catch (e) {
      // use dev-token
    }

    const socket = new WebSocket(`${WS_URL}/ws/${sessionId}`);
    ws.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ token }));
      reconnectCount.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const data: WSEvent = JSON.parse(event.data);
        handleWSEvent(data);
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    socket.onclose = () => {
      setWsStatus("disconnected");
      if (reconnectCount.current < MAX_RECONNECT) {
        reconnectCount.current++;
        setTimeout(connect, 2000 * reconnectCount.current);
      }
    };

    socket.onerror = () => setWsStatus("error");
  }, [sessionId, handleWSEvent, setWsStatus]);

  useEffect(() => {
    connect();
    return () => { ws.current?.close(); };
  }, [connect]);

  const send = useCallback((message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "chat", message }));
    }
  }, []);

  return { send, reconnect: connect };
}