import logo from "@/assets/miprojet-logo.png.asset.json";

export function Logo({
  className = "h-10 w-auto",
  plus: _plus,
}: {
  className?: string;
  plus?: boolean;
}) {
  return (
    <img
      src={logo.url}
      alt="MiProjet+ — Entrepreneuriat jeune"
      className={`${className} object-contain shrink-0 select-none`}
      decoding="async"
      loading="eager"
      draggable={false}
    />
  );
}
