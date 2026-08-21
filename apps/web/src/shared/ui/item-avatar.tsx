"use client";

import { idle, surprised } from "blobatar/expression";
import { Blobatar } from "blobatar/react";
import { useLayoutEffect, useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import "./item-avatar.css";
import "blobatar/motion.css";

export type ItemAvatarProps = {
  /** Seed for the blobatar fallback (and default accessible name). */
  name: string;
  /** When set and loadable, shown instead of the blobatar. */
  imageSrc?: string | null;
  size?: number;
  /** Animate always + morph idle → surprised (blobatar only). */
  selected?: boolean;
  className?: string;
  "aria-label"?: string;
};

type FaceProps = {
  name: string;
  size: number;
  label: string;
  className: string;
};

/**
 * Selected face: mount animated SVG on idle, then flip to surprised so
 * blobatar’s CSS morph runs. Must stay on one animated SVG — remounting
 * straight onto surprised skips the morph.
 */
function SelectedBlobatarFace({ name, size, label, className }: FaceProps) {
  const [expression, setExpression] = useState(idle);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      setExpression(surprised);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Blobatar
      name={name}
      size={size}
      title={name}
      aria-label={label}
      className={className}
      animate="always"
      expression={expression}
    />
  );
}

/**
 * Leading mark for dashboard list/detail items.
 * Prefers `imageSrc` (project logo, etc.); falls back to a deterministic blobatar from `name`.
 *
 * Unselected = static idle `<img>` (cheap list). Selected = animated SVG that
 * morphs idle → surprised, then keeps the breathe/bob/blink loop.
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
  const sizedByClass = Boolean(className && /(?:^|\s)(?:[\w-]+:)*size-/.test(className));

  return (
    <span
      data-slot="item-avatar"
      data-selected={selected ? "true" : "false"}
      data-face={showImage ? "image" : "blobatar"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-visible",
        showImage && "overflow-hidden rounded-lg bg-muted/40",
        className
      )}
      style={sizedByClass ? undefined : { width: size, height: size }}
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
        <SelectedBlobatarFace name={name} size={size} label={label} className={faceClassName} />
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
