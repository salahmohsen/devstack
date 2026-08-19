"use client";

import { surprised } from "blobatar/expression";
import { Blobatar } from "blobatar/react";
import { useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import "blobatar/motion.css";

export type ItemAvatarProps = {
  /** Seed for the blobatar fallback (and default accessible name). */
  name: string;
  /** When set and loadable, shown instead of the blobatar. */
  imageSrc?: string | null;
  size?: number;
  /** Animate + surprised expression (blobatar only). */
  selected?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Leading mark for dashboard list/detail items.
 * Prefers `imageSrc` (project logo, etc.); falls back to a deterministic blobatar from `name`.
 */
export function ItemAvatar({
  name,
  imageSrc,
  size = 32,
  selected = false,
  className,
  "aria-label": ariaLabel
}: ItemAvatarProps) {
  const trimmedSrc = imageSrc?.trim();
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const label = ariaLabel ?? name;
  const showImage = Boolean(trimmedSrc) && failedSrc !== trimmedSrc;
  const faceClassName = "size-full max-h-none max-w-none origin-center scale-[1.28]";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-visible",
        showImage && "overflow-hidden rounded-lg bg-muted/40",
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={trimmedSrc}
          alt=""
          aria-label={label}
          className="size-full object-contain"
          onError={() => setFailedSrc(trimmedSrc)}
        />
      ) : selected ? (
        <Blobatar
          name={name}
          size={size}
          title={name}
          aria-label={label}
          className={faceClassName}
          animate="always"
          expression={surprised}
        />
      ) : (
        <Blobatar
          name={name}
          size={size}
          title={name}
          aria-label={label}
          className={faceClassName}
        />
      )}
    </span>
  );
}

/** Shared eyebrow shell overrides so ItemAvatar is not crushed by ItemInfoPanel defaults. */
export const ITEM_AVATAR_EYEBROW_CLASSNAME =
  "size-12 overflow-visible rounded-none bg-transparent [&_img]:!size-full [&_svg]:!size-full";
