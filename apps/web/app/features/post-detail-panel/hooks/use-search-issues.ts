import { useEffect, useState } from "react";
import { z } from "zod";

export const SearchResultSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  status: z.string(),
  url: z.string(),
});

const SearchResponseSchema = z.object({ results: z.array(SearchResultSchema) });

export type SearchResult = z.infer<typeof SearchResultSchema>;

export function useSearchIssues(
  provider: "jira" | "linear" | "asana",
  query: string,
  enabled: boolean,
) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = `/api/${provider}`;
        const intent = provider === "asana" ? "search_tasks" : "search_issues";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent, query }),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? "Search failed");
        const parsed = SearchResponseSchema.safeParse(json);
        if (parsed.success) setResults(parsed.data.results);
        else setResults([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [provider, query, enabled]);

  return { results, loading, error };
}
