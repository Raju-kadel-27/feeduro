import { AVATAR_COLORS } from "./constants";

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

import type { StatusKey } from "./schemas/public";

export function toStatusKey(dbStatus: string): StatusKey {
  const map: Record<string, StatusKey> = {
    open: "pending",
    reviewing: "reviewing",
    planned: "planned",
    "in-progress": "inprogress",
    completed: "completed",
    closed: "closed",
  };
  return map[dbStatus] ?? "pending";
}

export function extractBlockNoteText(body: string, maxLen = 200): string {
  try {
    const blocks = JSON.parse(body) as Array<{
      type: string;
      content?: Array<{ type: string; text?: string }>;
    }>;
    const parts: string[] = [];
    for (const b of blocks) {
      if (b.content) {
        for (const c of b.content) {
          if (c.type === "text" && c.text) parts.push(c.text);
        }
      }
    }
    const text = parts.join(" ").trim();
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  } catch {
    return "";
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function avatarColor(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

const ALIAS_ADJECTIVES = [
  "Shy", "Bold", "Calm", "Bright", "Swift", "Eager", "Witty", "Kind",
  "Brave", "Quiet", "Jolly", "Keen", "Lively", "Nimble", "Proud",
  "Clever", "Gentle", "Happy", "Humble", "Lucky", "Merry", "Noble",
  "Plucky", "Radiant", "Serene", "Tidy", "Vivid", "Warm", "Zesty", "Daring",
];

const ALIAS_ANIMALS = [
  "Cheetah", "Panda", "Fox", "Eagle", "Whale", "Tiger", "Bear", "Wolf",
  "Hawk", "Lynx", "Otter", "Raven", "Crane", "Bison", "Gecko",
  "Koala", "Lemur", "Moose", "Quail", "Finch", "Stoat", "Viper",
  "Wren", "Yak", "Zebu", "Ibis", "Dingo", "Camel", "Snipe", "Tapir",
];

export function generateUserAlias(userId: string): string {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) + hash + userId.charCodeAt(i)) & 0x7fffffff;
  }
  const adj = ALIAS_ADJECTIVES[hash % ALIAS_ADJECTIVES.length]!;
  const animal = ALIAS_ANIMALS[Math.floor(hash / ALIAS_ADJECTIVES.length) % ALIAS_ANIMALS.length]!;
  return `${adj} ${animal}`;
}
