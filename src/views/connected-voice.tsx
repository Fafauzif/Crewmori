"use client";
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@elevenlabs/client";
import { BackendClient } from "@/lib/backend-client";
import { useStore } from "@/lib/store";
import { Button, Modal } from "@/components/ui";

export default function ConnectedVoice({ onClose, onText }: { onClose: () => void; onText: () => void }) {
  const [consent, setConsent] = useState(false), [status, setStatus] = useState("Ready"), [error, setError] = useState(""), [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]), [busy, setBusy] = useState(false);
  const conversation = useRef<Conversation | null>(null), active = useRef(true), timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { refresh } = useStore();
  useEffect(() => { active.current = true; return () => { active.current = false; if (timeout.current) clearTimeout(timeout.current); void conversation.current?.endSession(); }; }, []);
  const stop = async () => {
    if (timeout.current) clearTimeout(timeout.current);
    const session = conversation.current; conversation.current = null;
    await session?.endSession(); if (active.current) { setStatus("Ended"); await refresh(); }
  };
  const start = async () => {
    if (!consent || busy || conversation.current) return;
    setBusy(true); setError(""); setStatus("Connecting");
    try {
      const { Conversation: SDK } = await import("@elevenlabs/client");
      const token = await new BackendClient().request<{ signedUrl: string; dynamicVariables: Record<string, string> }>("/api/voice/session", { consent: true });
      if (!active.current) return;
      const session = await SDK.startSession({ signedUrl: token.signedUrl, connectionType: "websocket", dynamicVariables: token.dynamicVariables, textOnly: false,
        onMessage: (message) => { if (active.current) setMessages((items) => [...items, { role: message.source, text: message.message }].slice(-100)); },
        onStatusChange: ({ status }) => { if (active.current) setStatus(status); },
        onError: () => { if (active.current) setError("Voice connection interrupted. You can reconnect or continue by text."); },
        onDisconnect: () => { conversation.current = null; if (active.current) void refresh(); },
      });
      if (!active.current) { await session.endSession(); return; }
      conversation.current = session;
      timeout.current = setTimeout(() => { void stop(); }, 15 * 60 * 1000);
    } catch { if (active.current) { setError("Voice could not connect. Check microphone permission or continue by text."); setStatus("Disconnected"); } }
    finally { if (active.current) setBusy(false); }
  };
  return <Modal title="Talk through your brief" onClose={() => { void stop().finally(onClose); }}>
    <p>You are speaking with an AI representative. The freelancer reviews scope, price, and commitments. Audio is sent to ElevenLabs; the final transcript is saved with this conversation.</p>
    <label><input type="checkbox" checked={consent} disabled={!!conversation.current || busy} onChange={(e) => setConsent(e.target.checked)} /> I consent to the voice conversation and saved transcript.</label>
    <p role="status">{status}</p>{error && <p role="alert">{error}</p>}
    <div className="voice-transcript" aria-live="polite">{messages.map((message, index) => <p key={index}><strong>{message.role === "user" ? "You" : "AI representative"}:</strong> {message.text}</p>)}</div>
    <div className="public-actions"><Button disabled={!consent || busy || !!conversation.current} onClick={() => void start()}>Start conversation</Button><Button variant="secondary" disabled={!conversation.current} onClick={() => void stop()}>End conversation</Button><Button variant="secondary" onClick={() => { void stop().finally(onText); }}>Continue by text</Button></div>
  </Modal>;
}
