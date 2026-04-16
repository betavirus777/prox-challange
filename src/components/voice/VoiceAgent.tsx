"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, Volume2, Loader2, PhoneOff } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "error";

interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

export function VoiceAgent() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentCaption, setCurrentCaption] = useState("");
  const [volume, setVolume] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Simulate volume animation when speaking
  useEffect(() => {
    if (status === "speaking" || status === "listening") {
      volumeIntervalRef.current = setInterval(() => {
        setVolume(Math.random() * 0.6 + (status === "speaking" ? 0.4 : 0.1));
      }, 100);
    } else {
      setVolume(0);
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
    }
    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
    };
  }, [status]);

  const startConversation = useCallback(async () => {
    try {
      setStatus("connecting");
      setErrorMessage("");
      setCurrentCaption("");

      // 1. Fetch secure signed URL from our backend API
      const tokenRes = await fetch("/api/voice/token");
      if (!tokenRes.ok) {
        const errData = await tokenRes.json();
        throw new Error(errData.error || "Failed to fetch secure signed URL");
      }
      const { signedUrl } = await tokenRes.json();

      if (!signedUrl) {
        throw new Error("No signed URL received from backend.");
      }

      // 2. Start Conversation using the authenticated Signed URL
      const { Conversation } = await import("@elevenlabs/client");

      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => setStatus("listening"),
        onDisconnect: () => {
          setStatus("idle");
          setCurrentCaption("");
        },
        onError: (err: unknown) => {
          console.error("Voice error:", err);
          setErrorMessage(typeof err === "string" ? err : String(err));
          setStatus("error");
        },
        onModeChange: (mode: { mode: string }) => {
          setStatus(mode.mode === "speaking" ? "speaking" : "listening");
        },
        onMessage: (message: { source: string; message: string }) => {
          const entry: TranscriptEntry = {
            role: message.source === "user" ? "user" : "agent",
            text: message.message,
            timestamp: Date.now(),
          };
          setTranscript((prev) => [...prev, entry]);
          setCurrentCaption(message.message);

          // Clear caption after 5 seconds
          setTimeout(() => {
            setCurrentCaption((prev) =>
              prev === message.message ? "" : prev
            );
          }, 5000);
        },
      });

      conversationRef.current = conversation;
    } catch (e) {
      console.error("Failed to start voice session:", e);
      setErrorMessage(
        e instanceof Error 
          ? e.message 
          : "Failed to start voice session. Check your microphone permissions."
      );
      setStatus("error");
    }
  }, []);

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
    setCurrentCaption("");
  }, []);

  const isActive = status === "listening" || status === "speaking";
  const isConnected = isActive || status === "connecting";

  // Orb scale factor based on state
  const orbScale = status === "speaking"
    ? 1 + volume * 0.2
    : status === "listening"
    ? 1 + volume * 0.08
    : 1;

  if (!agentId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="mx-auto mb-6 relative w-24 h-24">
            <Image
              src="/orb.png"
              alt="AI Assistant"
              fill
              className="rounded-full object-cover opacity-40"
            />
          </div>
          <h3 className="text-lg font-semibold mb-2">Voice Mode</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Voice mode requires an ElevenLabs Agent ID.
            <br />
            Set{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-accent">
              NEXT_PUBLIC_ELEVENLABS_AGENT_ID
            </code>{" "}
            in your <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Main orb area */}
      <div className="flex flex-1 flex-col items-center justify-center relative">
        {/* Ambient background glow */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700",
            isActive ? "opacity-100" : "opacity-0"
          )}
        >
          <div
            className="rounded-full blur-[120px] transition-all duration-500"
            style={{
              width: `${300 + volume * 200}px`,
              height: `${300 + volume * 200}px`,
              background: status === "speaking"
                ? `radial-gradient(circle, rgba(249,115,22,${0.15 + volume * 0.1}) 0%, transparent 70%)`
                : `radial-gradient(circle, rgba(168,85,247,${0.1 + volume * 0.05}) 0%, transparent 70%)`,
            }}
          />
        </div>

        {/* Orb container */}
        <div className="relative flex flex-col items-center gap-8">
          {/* The orb */}
          <button
            onClick={isActive ? endConversation : startConversation}
            disabled={status === "connecting"}
            className={cn(
              "relative group cursor-pointer transition-all duration-300 ease-out",
              status === "connecting" && "animate-pulse"
            )}
          >
            {/* Outer ring pulses */}
            {isActive && (
              <>
                <div
                  className="absolute inset-0 rounded-full transition-all duration-150"
                  style={{
                    transform: `scale(${1.1 + volume * 0.3})`,
                    border: `1.5px solid rgba(249,115,22,${0.08 + volume * 0.12})`,
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full transition-all duration-200"
                  style={{
                    transform: `scale(${1.25 + volume * 0.4})`,
                    border: `1px solid rgba(249,115,22,${0.04 + volume * 0.06})`,
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full transition-all duration-300"
                  style={{
                    transform: `scale(${1.4 + volume * 0.5})`,
                    border: `0.5px solid rgba(249,115,22,${0.02 + volume * 0.03})`,
                  }}
                />
              </>
            )}

            {/* Glow ring */}
            <div
              className={cn(
                "absolute -inset-2 rounded-full transition-all duration-300",
                isActive && "shadow-[0_0_60px_-10px_rgba(249,115,22,0.4)]",
                status === "listening" && "shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]"
              )}
            />

            {/* Orb image */}
            <div
              className={cn(
                "relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden transition-all duration-150 ease-out",
                !isActive && !isConnected && "group-hover:scale-105",
                status === "connecting" && "opacity-70"
              )}
              style={{
                transform: `scale(${orbScale})`,
              }}
            >
              <Image
                src="/orb.png"
                alt="AI Voice Assistant"
                fill
                className={cn(
                  "object-cover transition-all duration-500",
                  isActive && "brightness-110 saturate-125",
                  !isActive && "brightness-75 saturate-75 group-hover:brightness-100 group-hover:saturate-100"
                )}
                priority
              />

              {/* Center icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-300",
                    isActive
                      ? "bg-black/20 backdrop-blur-sm h-14 w-14"
                      : "bg-black/30 backdrop-blur-sm h-14 w-14 group-hover:bg-black/40"
                  )}
                >
                  {status === "connecting" ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white/90" />
                  ) : status === "speaking" ? (
                    <Volume2 className="h-6 w-6 text-white/90" />
                  ) : status === "listening" ? (
                    <Mic className="h-6 w-6 text-white/90 animate-pulse" />
                  ) : (
                    <Mic className="h-6 w-6 text-white/80 group-hover:text-white" />
                  )}
                </div>
              </div>
            </div>
          </button>

          {/* Status text */}
          <div className="flex flex-col items-center gap-2">
            <p
              className={cn(
                "text-sm font-medium transition-colors",
                status === "speaking" && "text-accent",
                status === "listening" && "text-purple-400",
                status === "connecting" && "text-muted-foreground animate-pulse",
                status === "idle" && "text-muted-foreground",
                status === "error" && "text-destructive"
              )}
            >
              {status === "idle" && "Tap the orb to start"}
              {status === "connecting" && "Connecting…"}
              {status === "listening" && "Listening…"}
              {status === "speaking" && "Speaking…"}
              {status === "error" && (errorMessage || "An error occurred")}
            </p>

            {/* Live caption */}
            {currentCaption && isActive && (
              <p className="max-w-md text-center text-sm text-foreground/80 leading-relaxed animate-fade-in">
                &ldquo;{currentCaption}&rdquo;
              </p>
            )}
          </div>

          {/* End call button */}
          {isActive && (
            <button
              onClick={endConversation}
              className="flex items-center gap-2 rounded-full bg-destructive/10 px-5 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/20 hover:shadow-lg hover:shadow-destructive/10 animate-fade-in"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Transcript drawer */}
      {transcript.length > 0 && (
        <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
          <div
            ref={scrollRef}
            className="mx-auto max-w-lg overflow-y-auto px-4 py-3 space-y-2"
            style={{ maxHeight: "30vh" }}
          >
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-sm animate-fade-in",
                  entry.role === "user"
                    ? "ml-auto max-w-[85%] bg-muted/60 text-foreground/80"
                    : "mr-auto max-w-[85%] bg-accent/8 text-foreground/90 border border-accent/10"
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground/50 block mb-0.5">
                  {entry.role === "user" ? "You" : "Assistant"}
                </span>
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
