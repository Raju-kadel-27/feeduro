interface EndpointHeaderProps {
  name: string | null;
  url: string;
}

export function EndpointHeader({ name, url }: EndpointHeaderProps) {
  return (
    <div className="min-w-0 space-y-0.5">
      {name && <p className="text-sm font-medium text-foreground truncate">{name}</p>}
      <code className="text-xs font-mono text-muted-foreground break-all leading-snug block">
        {url}
      </code>
    </div>
  );
}