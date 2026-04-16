"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  saveConversation,
  loadConversation,
  getActiveConversationId,
  createNewConversation,
  setActiveConversationId,
} from "./conversation-store";

export interface Citation {
  type: string;
  cited_text: string;
  document_index: number;
  document_title?: string;
  start_page_number?: number;
  end_page_number?: number;
  start_block_index?: number;
  end_block_index?: number;
}

export interface ToolCall {
  name: string;
  id: string;
  state: "calling" | "done";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  toolCalls: ToolCall[];
  /** Transient UI line (retrieving, reviewing, …) */
  statusLine?: string;
  /** Matches SSE phase id for icons (retrieving, thinking, reviewing, …) */
  phaseId?: string;
  review?: { verdict: string; warnings: string[] };
}

function applySSEEvent(
  msg: ChatMessage,
  event: string,
  data: Record<string, unknown>,
): ChatMessage {
  switch (event) {
    case "text":
      return {
        ...msg,
        content: msg.content + (data.text as string),
        statusLine: undefined,
        phaseId: undefined,
      };

    case "citation":
      return {
        ...msg,
        citations: [...msg.citations, data.citation as Citation],
      };

    case "tool_call":
      return {
        ...msg,
        toolCalls: [
          ...msg.toolCalls,
          {
            name: data.name as string,
            id: data.id as string,
            state: "calling" as const,
          },
        ],
      };

    case "tool_result":
      return {
        ...msg,
        toolCalls: msg.toolCalls.map((tc) =>
          tc.name === data.name ? { ...tc, state: "done" as const } : tc,
        ),
      };

    case "phase": {
      const label = (data.label as string) || "";
      const id = data.id as string;
      if (id === "idle" || !label) {
        return { ...msg, statusLine: undefined, phaseId: undefined };
      }
      return { ...msg, statusLine: label, phaseId: id };
    }

    case "review":
      return {
        ...msg,
        review: {
          verdict: data.verdict as string,
          warnings: Array.isArray(data.warnings)
            ? (data.warnings as string[])
            : [],
        },
      };

    case "done":
      return { ...msg, statusLine: undefined, phaseId: undefined };

    case "error":
      return {
        ...msg,
        content: msg.content + `\n\n*Error: ${data.message as string}*`,
        statusLine: undefined,
        phaseId: undefined,
      };

    default:
      return msg;
  }
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore active conversation on mount
  useEffect(() => {
    const activeId = getActiveConversationId();
    if (activeId) {
      const stored = loadConversation(activeId);
      if (stored && stored.messages.length > 0) {
        setConversationId(activeId);
        setMessages(stored.messages);
      }
    }
  }, []);

  // Persist messages whenever they change (debounced)
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    // Only save completed messages (not mid-stream)
    const hasStreaming = messages.some((m) => m.statusLine);
    if (hasStreaming) return;
    saveConversation(conversationId, messages);
  }, [messages, conversationId]);

  const startNewConversation = useCallback(() => {
    const id = createNewConversation();
    setConversationId(id);
    setMessages([]);
    setError(null);
    setIsLoading(false);
    abortRef.current?.abort();
    return id;
  }, []);

  const loadExistingConversation = useCallback((id: string) => {
    const stored = loadConversation(id);
    if (stored) {
      setConversationId(id);
      setActiveConversationId(id);
      setMessages(stored.messages);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (userContent: string) => {
      if (!userContent.trim() || isLoading) return;

      // Ensure we have a conversation ID
      let currentConvId = conversationId;
      if (!currentConvId) {
        currentConvId = createNewConversation();
        setConversationId(currentConvId);
      }

      setError(null);
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userContent,
        citations: [],
        toolCalls: [],
      };

      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        citations: [],
        toolCalls: [],
        statusLine: "Connecting…",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `HTTP ${response.status}: ${response.statusText}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let pendingEvent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, "");
            if (line.startsWith("event: ")) {
              pendingEvent = line.slice(7).trim();
            } else if (line.startsWith("data:") && pendingEvent) {
              const jsonStr = line.replace(/^\s*data:\s?/, "").trim();
              if (!jsonStr) continue;
              try {
                const data = JSON.parse(jsonStr) as Record<string, unknown>;
                const ev = pendingEvent;
                pendingEvent = "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? applySSEEvent(m, ev, data) : m,
                  ),
                );
              } catch {
                pendingEvent = "";
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && !m.content
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                  statusLine: undefined,
                  phaseId: undefined,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, conversationId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    // Clean up the streaming message
    setMessages((prev) =>
      prev.map((m) =>
        m.statusLine ? { ...m, statusLine: undefined, phaseId: undefined } : m,
      ),
    );
  }, []);

  const retryLast = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Remove last assistant message
    setMessages((prev) => {
      const idx = prev.length - 1;
      if (idx >= 0 && prev[idx].role === "assistant") {
        return prev.slice(0, idx);
      }
      return prev;
    });
    setError(null);
    // Re-send
    setTimeout(() => sendMessage(lastUser.content), 50);
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    stop,
    retryLast,
    startNewConversation,
    loadExistingConversation,
  };
}
