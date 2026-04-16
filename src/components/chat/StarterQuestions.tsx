"use client";

import { Zap, Shield, Settings, AlertTriangle } from "lucide-react";
import Image from "next/image";

const STARTER_QUESTIONS = [
  {
    icon: Settings,
    text: "How do I set up for MIG welding?",
    description: "Setup, polarity, wire feed",
  },
  {
    icon: Zap,
    text: "What's the duty cycle at 200A on 240V?",
    description: "Performance specifications",
  },
  {
    icon: AlertTriangle,
    text: "Help me troubleshoot porosity in my welds",
    description: "Diagnose welding defects",
  },
  {
    icon: Shield,
    text: "Show me the polarity setup for TIG",
    description: "Cable routing and connections",
  },
];

interface StarterQuestionsProps {
  onSelect: (question: string) => void;
}

export function StarterQuestions({ onSelect }: StarterQuestionsProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 animate-fade-in">
      <div className="relative mb-6 h-20 w-20">
        <Image
          src="/orb.png"
          alt="AI Assistant"
          fill
          className="rounded-full object-cover shadow-lg shadow-accent/10"
          priority
        />
        <div className="absolute -inset-1 rounded-full ring-1 ring-accent/20" />
      </div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight">
        How can I help?
      </h2>
      <p className="mb-8 max-w-md text-center text-sm text-muted-foreground leading-relaxed">
        Ask me anything about your welder — setup, specs, troubleshooting, or
        technique. I&apos;ll cite the exact manual page or video timestamp.
      </p>

      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {STARTER_QUESTIONS.map((q, index) => (
          <button
            key={q.text}
            onClick={() => onSelect(q.text)}
            className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4 text-left transition-all duration-200 hover:border-accent/30 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5 animate-fade-in"
            style={{ animationDelay: `${100 + index * 70}ms` }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
              <q.icon className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug">{q.text}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {q.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
