import { toast } from "sonner";

export function parseSettings<T>(settings?: string | null): T | null {
  if (!settings) return null;

  try {
    return JSON.parse(settings) as T;
  } catch {
    return null;
  }
}

export function ensureIntegrationConfigured(
  configured: boolean,
  message: string,
) {
  if (!configured) {
    toast.error(message, {
      duration: 6000,
    });

    return false;
  }

  return true;
}