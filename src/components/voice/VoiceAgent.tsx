"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "error";

export function VoiceAgent() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const startConversation = useCallback(async () => {
    if (!agentId) {
      setErrorMessage("ElevenLabs Agent ID not configured.");
      setStatus("error");
      return;
    }

    try {
      setStatus("connecting");
      setErrorMessage("");

      const { Conversation } = await import("@elevenlabs/client");

      const conversation = await Conversation.startSession({
        agentId,
        onConnect: () => setStatus("listening"),
        onDisconnect: () => setStatus("idle"),
        onError: (err: unknown) => {
          console.error("Voice error:", err);
          setErrorMessage(String(err));
          setStatus("error");
        },
        onModeChange: (mode: { mode: string }) => {
          setStatus(mode.mode === "speaking" ? "speaking" : "listening");
        },
        onMessage: (message: { source: string; message: string }) => {
          setTranscript((prev) => [
            ...prev,
            {
              role: message.source === "user" ? "user" : "agent",
              text: message.message,
            },
          ]);
        },
      });

      conversationRef.current = conversation;
    } catch (e) {
      console.error("Failed to start voice session:", e);
      setErrorMessage("Failed to start voice session. Check your microphone permissions.");
      setStatus("error");
    }
  }, [agentId]);

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession();
      } catch {
        // Ignore cleanup errors
      }
      conversationRef.current = null;
    }
    setStatus("idle");
  }, []);

  const isActive = status === "listening" || status === "speaking";

  if (!agentId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <MicOff className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Voice mode requires an ElevenLabs Agent ID.
            <br />
            Set <code className="text-xs">NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code> in your{" "}
            <code className="text-xs">.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-between p-8">
      {/* Transcript area */}
      <div ref={scrollRef} className="w-full max-w-lg flex-1 overflow-y-auto space-y-3 py-4">
        {transcript.map((entry, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-4 py-2 text-sm",
              entry.role === "user"
                ? "ml-auto max-w-[80%] bg-muted text-foreground"
                : "mr-auto max-w-[80%] bg-accent/10 text-foreground"
            )}
          >
            {entry.text}
          </div>
        ))}
        {transcript.length === 0 && status === "idle" && (
          <p className="text-center text-sm text-muted-foreground">
            Tap the microphone to start talking.
            <br />
            Ask questions about your Vulcan OmniPro 220 hands-free.
          </p>
        )}
      </div>

      {/* Status and mic button */}
      <div className="flex flex-col items-center gap-4 pb-8">
        <p className="text-xs text-muted-foreground">
          {status === "idle" && "Ready"}
          {status === "connecting" && "Connecting..."}
          {status === "listening" && "Listening..."}
          {status === "speaking" && "Speaking..."}
          {status === "error" && (errorMessage || "An error occurred")}
        </p>

        <button
          onClick={isActive ? endConversation : startConversation}
          disabled={status === "connecting"}
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full transition-all",
            isActive
              ? "bg-destructive text-white hover:bg-destructive/90"
              : "bg-accent text-white hover:bg-accent/90",
            status === "connecting" && "opacity-50"
          )}
        >
          {status === "speaking" && (
            <div className="voice-pulse absolute inset-0 rounded-full bg-accent/30" />
          )}
          {status === "connecting" ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : status === "speaking" ? (
            <Volume2 className="h-8 w-8" />
          ) : isActive ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </button>
      </div>
    </div>
  );
}
