"use client";

import { surprised } from "blobatar/expression";
import { Blobatar } from "blobatar/react";

import { cn } from "@tsu-stack/ui/lib/utils";

import "blobatar/motion.css";

export type CompanyAvatarProps = {
  companyName: string;
  size?: number;
  /** When true: idle loop + surprised expression. When false: static idle. */
  selected?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Tracked-jobs company face via blobatar.
 * Unselected → static idle; selected → animate="always" + surprised.
 * Transparent backdrop (library default — do not pass background).
 *
 * Blobatars leave transparent margin in the viewBox; a light scale makes the
 * creature fill the layout slot without changing the reserved size.
 */
export function CompanyAvatar({
  companyName,
  size = 32,
  selected = false,
  className,
  "aria-label": ariaLabel
}: CompanyAvatarProps) {
  const label = ariaLabel ?? companyName;
  const faceClassName = "size-full max-h-none max-w-none origin-center scale-[1.28]";

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-visible", className)}
      style={{ width: size, height: size }}
    >
      {selected ? (
        <Blobatar
          name={companyName}
          size={size}
          title={companyName}
          aria-label={label}
          className={faceClassName}
          animate="always"
          expression={surprised}
        />
      ) : (
        <Blobatar
          name={companyName}
          size={size}
          title={companyName}
          aria-label={label}
          className={faceClassName}
        />
      )}
    </span>
  );
}
