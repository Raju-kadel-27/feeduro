export function encode<T>(payload: T): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decode<T>(token: string): T | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (padded.length % 4)) % 4);
    return JSON.parse(atob(padded + padding)) as T;
  } catch {
    return null;
  }
}
