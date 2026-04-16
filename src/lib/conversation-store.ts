"use client";

import type { ChatMessage } from "./use-agent-chat";

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface StoredConversation {
  meta: ConversationMeta;
  messages: ChatMessage[];
}

const STORE_KEY = "prox-conversations";
const META_KEY = "prox-conversation-metas";
const ACTIVE_KEY = "prox-active-conversation";
const MAX_CONVERSATIONS = 50;

function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setToStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage full — evict oldest conversation
    console.warn("localStorage full, evicting oldest conversation", e);
    evictOldest();
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Give up silently
    }
  }
}

function evictOldest(): void {
  const metas = getConversationMetas();
  if (metas.length === 0) return;
  const oldest = metas.sort((a, b) => a.updatedAt - b.updatedAt)[0];
  deleteConversation(oldest.id);
}

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Conversation";
  const text = firstUser.content.trim();
  return text.length > 50 ? text.slice(0, 47) + "…" : text;
}

// --- Public API ---

export function getConversationMetas(): ConversationMeta[] {
  return getFromStorage<ConversationMeta[]>(META_KEY, []);
}

export function getActiveConversationId(): string | null {
  return getFromStorage<string | null>(ACTIVE_KEY, null);
}

export function setActiveConversationId(id: string | null): void {
  setToStorage(ACTIVE_KEY, id);
}

export function loadConversation(id: string): StoredConversation | null {
  return getFromStorage<StoredConversation | null>(`${STORE_KEY}-${id}`, null);
}

export function saveConversation(id: string, messages: ChatMessage[]): string {
  const existing = loadConversation(id);
  const now = Date.now();

  const meta: ConversationMeta = {
    id,
    title: existing?.meta.title || generateTitle(messages),
    createdAt: existing?.meta.createdAt || now,
    updatedAt: now,
    messageCount: messages.length,
  };

  const stored: StoredConversation = { meta, messages };
  setToStorage(`${STORE_KEY}-${id}`, stored);

  // Update metas list
  const metas = getConversationMetas().filter((m) => m.id !== id);
  metas.unshift(meta);

  // Cap max conversations
  while (metas.length > MAX_CONVERSATIONS) {
    const removed = metas.pop()!;
    localStorage.removeItem(`${STORE_KEY}-${removed.id}`);
  }

  setToStorage(META_KEY, metas);
  return id;
}

export function createNewConversation(): string {
  const id = generateId();
  setActiveConversationId(id);
  return id;
}

export function deleteConversation(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORE_KEY}-${id}`);
  const metas = getConversationMetas().filter((m) => m.id !== id);
  setToStorage(META_KEY, metas);
  if (getActiveConversationId() === id) {
    setActiveConversationId(null);
  }
}

export function clearAllConversations(): void {
  const metas = getConversationMetas();
  for (const m of metas) {
    localStorage.removeItem(`${STORE_KEY}-${m.id}`);
  }
  setToStorage(META_KEY, []);
  setActiveConversationId(null);
}
