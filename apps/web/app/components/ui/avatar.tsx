type Props = {
  name: string | null;
  image?: string | null;
  size?: number;
};

export function Avatar({ name, image, size = 24 }: Props) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold"
    >
      {initials}
    </div>
  );
}
