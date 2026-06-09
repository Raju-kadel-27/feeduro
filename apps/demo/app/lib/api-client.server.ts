import { z } from "zod";
import { logRequest } from "./request-log.server";

export interface ApiResult<T> {
  data: T | null;
  status: number;
  durationMs: number;
  error: string | null;
}

async function apiFetch<T>(
  method: string,
  url: string,
  schema: z.ZodSchema<T>,
  apiKey: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const parsed_url = new URL(url);
  const path = parsed_url.pathname + parsed_url.search;
  const t0 = Date.now();
  let status = 0;
  console.log(`[api] ${method} ${url}`);
  try {
    const res = await fetch(url, {
      method,
      headers: { "x-api-key": apiKey, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    status = res.status;
    const durationMs = Date.now() - t0;
    const rawText = await res.text();
    let json: unknown;
    try { json = JSON.parse(rawText); } catch { json = rawText; }
    logRequest({ method, path, status, durationMs, timestamp: new Date().toISOString(), error: null });

    if (!res.ok) {
      const j = typeof json === "object" && json !== null ? json as Record<string, unknown> : {};
      const msg = String(j.message ?? j.error ?? j.detail ?? `HTTP ${status}`);
      console.error(`[api] ${method} ${url} → ${status} ${msg}\n  body: ${rawText.slice(0, 500)}`);
      return { data: null, status, durationMs, error: msg };
    }
    const result = schema.safeParse(json);
    if (!result.success) {
      console.error(`[api] ${method} ${url} → ${status} schema mismatch\n  issues: ${JSON.stringify(result.error.issues)}\n  body: ${rawText.slice(0, 500)}`);
      return { data: null, status, durationMs, error: "Unexpected response shape" };
    }
    console.log(`[api] ${method} ${url} → ${status} (${durationMs}ms)`);
    return { data: result.data, status, durationMs, error: null };
  } catch (err) {
    const durationMs = Date.now() - t0;
    const error = err instanceof Error ? err.message : "Network error";
    console.error(`[api] ${method} ${url} → network error: ${error}`);
    logRequest({ method, path, status, durationMs, timestamp: new Date().toISOString(), error });
    return { data: null, status, durationMs, error };
  }
}

export function createApiClient(baseUrl: string, apiKey: string) {
  const url = (path: string) => `${baseUrl}${path}`;
  return {
    get: <T>(path: string, schema: z.ZodSchema<T>) => apiFetch("GET", url(path), schema, apiKey),
    post: <T>(path: string, body: unknown, schema: z.ZodSchema<T>) => apiFetch("POST", url(path), schema, apiKey, body),
    patch: <T>(path: string, body: unknown, schema: z.ZodSchema<T>) => apiFetch("PATCH", url(path), schema, apiKey, body),
    delete: <T>(path: string, schema: z.ZodSchema<T>) => apiFetch("DELETE", url(path), schema, apiKey),
  };
}
