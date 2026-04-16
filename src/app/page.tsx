"use client";

import { useState } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { VoiceAgent } from "@/components/voice/VoiceAgent";
import { ModeToggle } from "@/components/ModeToggle";
import { Menu } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="glass relative z-30 flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          {mode === "text" && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle history"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden shadow-lg shadow-accent/10 ring-1 ring-white/10">
              <Image
                src="/orb.png"
                alt="AI Assistant"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">
                AI Assistant
              </h1>
              <p className="text-[10px] text-muted-foreground">
                Welding Knowledge Base
              </p>
            </div>
          </div>
        </div>
        <ModeToggle mode={mode} onModeChange={setMode} />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {mode === "text" ? (
          <ChatWindow
            sidebarOpen={sidebarOpen}
            onSidebarClose={() => setSidebarOpen(false)}
          />
        ) : (
          <VoiceAgent />
        )}
      </main>
    </div>
  );
}
