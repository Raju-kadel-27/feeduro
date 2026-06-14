import { AVATAR_COLORS } from "../constants";

function avatarColor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function UserAvatar({
  userId,
  usersMap,
  size = "md",
}: {
  userId: string;
  usersMap: Record<string, { name: string; image: string | null }>;
  size?: "sm" | "md";
}) {
  const info = usersMap[userId];
  const dim = size === "sm" ? "h-5 w-5 text-[8px]" : "h-6 w-6 text-[9px]";
  if (info?.image) {
    return (
      <img
        src={info.image}
        alt={info.name}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  const initials = info?.name
    ? info.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: avatarColor(userId) }}
    >
      {initials}
    </div>
  );
}
