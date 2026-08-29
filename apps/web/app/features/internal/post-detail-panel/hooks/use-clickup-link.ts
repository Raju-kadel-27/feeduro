import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { ClickupTaskResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useClickupLink(postId: string) {
  const [clickupLink, setClickupLink] = useState<IntegrationLink | null>(null);
  const [clickupMode, setClickupMode] = useState<"create" | "link" | null>(null);
  const [linkClickupInput, setLinkClickupInput] = useState("");

  const { mutate: createClickupTask, isPending: creatingClickupTask } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/clickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_task", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return ClickupTaskResultSchema.parse(json.task);
    },
    onSuccess: (task) => {
      setClickupLink({
        identifier: task.custom_id ?? task.id,
        externalTitle: task.name,
        externalStatus: task.status.status,
        externalUrl: task.url,
      });
      setClickupMode(null);
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkClickupTask, isPending: linkingClickupTask } = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch("/api/oauth2/integrations/clickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_task", postId, taskId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return ClickupTaskResultSchema.parse(json.task);
    },
    onSuccess: (task) => {
      setClickupLink({
        identifier: task.custom_id ?? task.id,
        externalTitle: task.name,
        externalStatus: task.status.status,
        externalUrl: task.url,
      });
      setClickupMode(null);
      setLinkClickupInput("");
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkClickupTask, isPending: unlinkingClickupTask } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/clickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_task", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setClickupLink(null),
  });

  return {
    clickupLink,
    setClickupLink,
    clickupMode,
    setClickupMode,
    linkClickupInput,
    setLinkClickupInput,
    createClickupTask,
    creatingClickupTask,
    linkClickupTask,
    linkingClickupTask,
    unlinkClickupTask,
    unlinkingClickupTask,
  };
}
