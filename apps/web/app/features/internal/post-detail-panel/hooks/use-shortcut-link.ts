import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { ShortcutStoryResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useShortcutLink(postId: string) {
  const [shortcutLink, setShortcutLink] = useState<IntegrationLink | null>(null);
  const [shortcutMode, setShortcutMode] = useState<"create" | "link" | null>(null);
  const [linkShortcutInput, setLinkShortcutInput] = useState("");

  const { mutate: createShortcutStory, isPending: creatingShortcutStory } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_story", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return ShortcutStoryResultSchema.parse(json.story);
    },
    onSuccess: (story) => {
      setShortcutLink({
        identifier: `SC-${story.id}`,
        externalTitle: story.name,
        externalStatus: null,
        externalUrl: story.app_url,
      });
      setShortcutMode(null);
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkShortcutStory, isPending: linkingShortcutStory } = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await fetch("/api/shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_story", postId, storyId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return ShortcutStoryResultSchema.parse(json.story);
    },
    onSuccess: (story) => {
      setShortcutLink({
        identifier: `SC-${story.id}`,
        externalTitle: story.name,
        externalStatus: null,
        externalUrl: story.app_url,
      });
      setShortcutMode(null);
      setLinkShortcutInput("");
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkShortcutStory, isPending: unlinkingShortcutStory } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_story", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setShortcutLink(null),
  });

  return {
    shortcutLink,
    setShortcutLink,
    shortcutMode,
    setShortcutMode,
    linkShortcutInput,
    setLinkShortcutInput,
    createShortcutStory,
    creatingShortcutStory,
    linkShortcutStory,
    linkingShortcutStory,
    unlinkShortcutStory,
    unlinkingShortcutStory,
  };
}
