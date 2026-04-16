"use client";

import Image from "next/image";
import { Zap, Shield, Settings, AlertTriangle } from "lucide-react";

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
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12">
      <div className="mb-4 flex gap-3">
        <Image
          src="/product.webp"
          alt="Vulcan OmniPro 220"
          width={80}
          height={80}
          className="rounded-xl object-cover"
        />
        <Image
          src="/product-inside.webp"
          alt="Vulcan OmniPro 220 inside panel"
          width={80}
          height={80}
          className="rounded-xl object-cover"
        />
      </div>
      <h2 className="mb-1 text-lg font-semibold">Vulcan OmniPro 220 Assistant</h2>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Ask me anything about your welder — setup, specs, troubleshooting, or
        technique. I&apos;ll cite the exact manual page or video timestamp.
      </p>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {STARTER_QUESTIONS.map((q) => (
          <button
            key={q.text}
            onClick={() => onSelect(q.text)}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/50 hover:bg-card/80"
          >
            <q.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-medium">{q.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {q.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
