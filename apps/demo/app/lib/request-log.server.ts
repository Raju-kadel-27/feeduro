export interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: string;
  error: string | null;
}

const MAX = 50;
const log: RequestLogEntry[] = [];

export function logRequest(entry: Omit<RequestLogEntry, "id">): void {
  log.unshift({ id: crypto.randomUUID(), ...entry });
  if (log.length > MAX) log.splice(MAX);
}

export function getRequestLog(): RequestLogEntry[] {
  return [...log];
}

export function clearRequestLog(): void {
  log.splice(0);
}
