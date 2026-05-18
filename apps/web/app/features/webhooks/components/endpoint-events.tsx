import { EventBadge, formatDate } from "./shared";

interface EndpointEventsProps {
  events: string[];
  createdAt: Date;
}

export function EndpointEvents({ events, createdAt }: EndpointEventsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {events.includes("*") ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          All events
        </span>
      ) : (
        events.map((e) => <EventBadge key={e} event={e} />)
      )}
      <span className="text-xs text-muted-foreground ml-auto tabular-nums">
        Added {formatDate(createdAt)}
      </span>
    </div>
  );
}
