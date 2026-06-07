import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  /** Texte affiché en fallback (ex. initiales du projet). */
  fallbackText?: string;
  /** Icône custom de fallback. */
  fallbackIcon?: React.ReactNode;
  /** "cover" (par défaut) ou "contain". */
  fit?: "cover" | "contain";
  rounded?: string;
};

function initials(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Image robuste avec :
 *  - lazy loading
 *  - fallback élégant (initiales/icône) si src vide ou cassée
 *  - object-fit configurable
 */
export function SmartImage({
  src,
  alt = "",
  className,
  fallbackText,
  fallbackIcon,
  fit = "cover",
  rounded,
}: Props) {
  const [broken, setBroken] = useState(false);
  const showFallback = !src || broken;

  if (showFallback) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/15 text-primary",
          rounded,
          className,
        )}
        aria-label={alt}
        role="img"
      >
        {fallbackText ? (
          <span className="font-semibold tracking-wide text-base sm:text-lg select-none">
            {initials(fallbackText) || "•"}
          </span>
        ) : (
          (fallbackIcon ?? <ImageIcon className="h-1/3 w-1/3 opacity-50" />)
        )}
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={cn(
        "h-full w-full",
        fit === "cover" ? "object-cover" : "object-contain",
        rounded,
        className,
      )}
    />
  );
}
