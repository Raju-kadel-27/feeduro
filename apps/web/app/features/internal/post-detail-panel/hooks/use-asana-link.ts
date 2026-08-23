import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { AsanaTaskResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useAsanaLink(postId: string) {
  const [asanaLink, setAsanaLink] = useState<IntegrationLink | null>(null);
  const [asanaMode, setAsanaMode] = useState<"create" | "link" | null>(null);
  const [linkAsanaInput, setLinkAsanaInput] = useState("");

  const { mutate: createAsanaTask, isPending: creatingAsanaTask } = useMutation({
    mutationFn: async (params?: { name?: string; notes?: string }) => {
      const res = await fetch("/api/oauth2/integrations/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_task", postId, ...params }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return AsanaTaskResultSchema.parse(json.task);
    },
    onSuccess: (task) => {
      setAsanaLink({
        identifier: task.gid,
        externalTitle: task.name,
        externalStatus: task.completed ? "Completed" : (task.sectionName ?? ""),
        externalUrl: task.url,
      });
      setAsanaMode(null);
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkAsanaTask, isPending: linkingAsanaTask } = useMutation({
    mutationFn: async (taskInput: string) => {
      const res = await fetch("/api/oauth2/integrations/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_task", postId, taskInput }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return AsanaTaskResultSchema.parse(json.task);
    },
    onSuccess: (task) => {
      setAsanaLink({
        identifier: task.gid,
        externalTitle: task.name,
        externalStatus: task.completed ? "Completed" : (task.sectionName ?? ""),
        externalUrl: task.url,
      });
      setAsanaMode(null);
      setLinkAsanaInput("");
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkAsanaTask, isPending: unlinkingAsanaTask } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_task", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setAsanaLink(null),
  });

  return {
    asanaLink,
    setAsanaLink,
    asanaMode,
    setAsanaMode,
    linkAsanaInput,
    setLinkAsanaInput,
    createAsanaTask,
    creatingAsanaTask,
    linkAsanaTask,
    linkingAsanaTask,
    unlinkAsanaTask,
    unlinkingAsanaTask,
  };
}
