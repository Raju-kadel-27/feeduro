import type { IntegrationLink } from "@features/feedback/schemas/admin";
import { NotionPageResultSchema } from "@features/feedback/schemas/admin";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function useNotionLink(postId: string) {
  const [notionLink, setNotionLink] = useState<IntegrationLink | null>(null);

  const { mutate: createNotionPage, isPending: creatingNotionPage } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_page", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return NotionPageResultSchema.parse(json.page);
    },
    onSuccess: (page) => {
      setNotionLink({ identifier: page.id.slice(0, 8), externalTitle: page.title, externalStatus: null, externalUrl: page.url });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkNotionPage, isPending: linkingNotionPage } = useMutation({
    mutationFn: async (pageInput: string) => {
      const res = await fetch("/api/oauth2/integrations/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_page", postId, pageInput }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return NotionPageResultSchema.parse(json.page);
    },
    onSuccess: (page) => {
      setNotionLink({ identifier: page.id.slice(0, 8), externalTitle: page.title, externalStatus: null, externalUrl: page.url });
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkNotionPage, isPending: unlinkingNotionPage } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/oauth2/integrations/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_page", postId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => setNotionLink(null),
  });

  return {
    notionLink,
    setNotionLink,
    createNotionPage,
    creatingNotionPage,
    linkNotionPage,
    linkingNotionPage,
    unlinkNotionPage,
    unlinkingNotionPage,
  };
}
