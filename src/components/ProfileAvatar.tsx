export function ProfileAvatar({
  name,
  email,
  size = "md",
}: {
  name?: string;
  email?: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = getInitials(name, email);
  const sizeClass =
    size === "lg"
      ? "h-24 w-24 text-3xl"
      : size === "sm"
        ? "h-10 w-10 text-sm"
        : "h-12 w-12 text-base";

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-[radial-gradient(circle_at_32%_28%,#fff2a6_0,#f7cf65_34%,#a76d1c_76%)] font-display font-extrabold text-[#241400] shadow-lg`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function getInitials(name?: string, email?: string): string {
  const source = name?.trim() || email?.split("@")[0] || "User";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
