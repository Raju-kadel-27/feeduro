type Props = { title: string; description?: string };

export function SectionHeading({ title, description }: Props) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
