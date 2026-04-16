"use client";

import { useState } from "react";
import Image from "next/image";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { VoiceAgent } from "@/components/voice/VoiceAgent";
import { ModeToggle } from "@/components/ModeToggle";

export default function Home() {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const hasElevenLabs = !!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Image
            src="/product.webp"
            alt="Vulcan OmniPro 220"
            width={40}
            height={40}
            className="rounded-lg object-cover"
          />
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              Vulcan OmniPro 220
            </h1>
            <p className="text-xs text-muted-foreground">AI Welding Assistant</p>
          </div>
        </div>
        {hasElevenLabs && <ModeToggle mode={mode} onModeChange={setMode} />}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {mode === "text" ? <ChatWindow /> : <VoiceAgent />}
      </main>
    </div>
  );
}
