import { useState } from "react";
const logo = { url: "/media/miprojet-logo.png" };

/**
 * Logo MiProjet+ — résilient au chargement.
 * En cas d'échec (CDN, offline, cache corrompu) affiche un fallback textuel
 * stylisé plutôt qu'une image cassée.
 */
export function Logo({
  className = "h-10 w-auto",
  plus: _plus,
}: {
  className?: string;
  plus?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span
        className={`${className} inline-flex items-center gap-1 font-black tracking-tight text-primary select-none`}
        aria-label="MiProjet+"
      >
        <span>MiPROJET</span>
        <span className="text-orange-500">+</span>
      </span>
    );
  }

  return (
    <img
      src={logo.url}
      alt="MiProjet+ — Entrepreneuriat jeune"
      className={`${className} object-contain shrink-0 select-none`}
      decoding="async"
      loading="eager"
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}
