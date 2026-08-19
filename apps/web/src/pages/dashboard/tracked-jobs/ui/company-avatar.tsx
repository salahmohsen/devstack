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
 */
export function CompanyAvatar({
  companyName,
  size,
  selected = false,
  className,
  "aria-label": ariaLabel
}: CompanyAvatarProps) {
  const label = ariaLabel ?? companyName;
  const sharedClassName = cn("shrink-0", className);

  // Split branches so TypeScript keeps Blobatar's static vs animated prop union.
  if (selected) {
    return (
      <Blobatar
        name={companyName}
        size={size}
        title={companyName}
        aria-label={label}
        className={sharedClassName}
        animate="always"
        expression={surprised}
      />
    );
  }

  return (
    <Blobatar
      name={companyName}
      size={size}
      title={companyName}
      aria-label={label}
      className={sharedClassName}
    />
  );
}
