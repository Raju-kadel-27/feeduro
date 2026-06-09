export interface StoredEvent {
  id: string;
  receivedAt: string;
  event: string;
  signatureHeader: string;
  valid: boolean;
  payload: Record<string, unknown>;
}

const MAX_EVENTS = 50;

// Module-level store — intentionally dev-only; resets on server restart.
const store: StoredEvent[] = [];

export function pushEvent(ev: Omit<StoredEvent, "id">): StoredEvent {
  const entry: StoredEvent = { id: crypto.randomUUID(), ...ev };
  store.unshift(entry);
  if (store.length > MAX_EVENTS) store.splice(MAX_EVENTS);
  return entry;
}

export function listEvents(): StoredEvent[] {
  return [...store];
}

export function clearEvents(): void {
  store.splice(0);
}
