import logoUrl from "@/assets/miprojet-logo.png";

export function Logo({
  className = "h-10 w-auto",
  plus: _plus,
}: {
  className?: string;
  plus?: boolean;
}) {
  return (
    <img
      src={logoUrl}
      alt="MiProjet+"
      className={`${className} object-contain shrink-0 select-none`}
      width={414}
      height={134}
      decoding="async"
      loading="eager"
      draggable={false}
    />
  );
}
