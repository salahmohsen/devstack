"use client";

import { ItemAvatar, type ItemAvatarProps } from "@/shared/ui/item-avatar";

export type CompanyAvatarProps = Omit<ItemAvatarProps, "name"> & {
  companyName: string;
};

/** @deprecated Prefer {@link ItemAvatar} with `name={companyName}`. */
export function CompanyAvatar({ companyName, ...rest }: CompanyAvatarProps) {
  return <ItemAvatar name={companyName} {...rest} />;
}
