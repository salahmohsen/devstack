"use client";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import Fuse from "fuse.js";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type IconBaseProps, type IconType } from "react-icons/lib";

import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { ScrollArea, ScrollBar } from "@tsu-stack/ui/components/scroll-area.js";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

import { type iconsData } from "./icons-data";

export type IconData = (typeof iconsData)[number];

export type IconPickerProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  triggerPlaceholder?: string;
  iconsList?: IconData[];
  categorized?: boolean;
  modal?: boolean;
} & Omit<React.ComponentPropsWithoutRef<typeof PopoverTrigger>, "onSelect" | "onOpenChange">;

const IconRenderer = React.memo(({ name }: { name: string }) => <Icon nameIcon={name} />);
IconRenderer.displayName = "IconRenderer";

const IconsColumnSkeleton = () => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-4 w-1/2 rounded-md" />
    <div className="grid w-full grid-cols-5 gap-2">
      {Array.from({ length: 40 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-10 rounded-md" />
      ))}
    </div>
  </div>
);

const useIconsData = () => {
  const [icons, setIcons] = useState<IconData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadIcons = async () => {
      setIsLoading(true);

      const { iconsData } = await import("./icons-data");
      if (isMounted) {
        setIcons(iconsData);
        setIsLoading(false);
      }
    };

    loadIcons();

    return () => {
      isMounted = false;
    };
  }, []);

  return { icons, isLoading };
};

const IconPicker = React.forwardRef<React.ComponentRef<typeof PopoverTrigger>, IconPickerProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      open,
      defaultOpen,
      onOpenChange,
      children,
      searchable = true,
      searchPlaceholder = "Search for an icon...",
      triggerPlaceholder = "Select an icon",
      iconsList,
      categorized = true,
      modal = false,
      ...props
    },
    ref
  ) => {
    const [selectedIcon, setSelectedIcon] = useState<string | undefined>(defaultValue);
    const [isOpen, setIsOpen] = useState(defaultOpen || false);
    const [search, setSearch] = useDebouncedValue("", 100);
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const { icons } = useIconsData();
    const [isLoading, setIsLoading] = useState(true);

    const iconsToUse = useMemo(() => iconsList || icons, [iconsList, icons]);

    const fuseInstance = useMemo(
      () =>
        new Fuse(iconsToUse, {
          keys: ["name", "tags", "categories"],
          threshold: 0.3,
          ignoreLocation: true,
          includeScore: true
        }),
      [iconsToUse]
    );

    const filteredIcons = useMemo(() => {
      if (search.trim() === "") {
        return iconsToUse;
      }

      const results = fuseInstance.search(search.toLowerCase().trim());
      return results.map((result) => result.item);
    }, [search, iconsToUse, fuseInstance]);

    const categorizedIcons = useMemo(() => {
      if (!categorized || search.trim() !== "") {
        return [{ name: "All Icons", icons: filteredIcons }];
      }

      const categories = new Map<string, IconData[]>();

      filteredIcons.forEach((icon) => {
        if (icon.categories && icon.categories.length > 0) {
          icon.categories.forEach((category) => {
            if (!categories.has(category)) {
              categories.set(category, []);
            }
            categories.get(category)!.push(icon);
          });
        } else {
          const category = "Other";
          if (!categories.has(category)) {
            categories.set(category, []);
          }
          categories.get(category)!.push(icon);
        }
      });

      return Array.from(categories.entries())
        .map(([name, icons]) => {
          return { name, icons };
        })
        .toSorted((a, b) => a.name.localeCompare(b.name));
    }, [filteredIcons, categorized, search]);

    const virtualItems = useMemo(() => {
      const items: Array<{
        type: "category" | "row";
        categoryIndex: number;
        rowIndex?: number;
        icons?: IconData[];
      }> = [];

      categorizedIcons.forEach((category, categoryIndex) => {
        items.push({ type: "category", categoryIndex });

        const rows = [];
        for (let i = 0; i < category.icons.length; i += 5) {
          rows.push(category.icons.slice(i, i + 5));
        }

        rows.forEach((rowIcons, rowIndex) => {
          items.push({
            type: "row",
            categoryIndex,
            rowIndex,
            icons: rowIcons
          });
        });
      });

      return items;
    }, [categorizedIcons]);

    const categoryIndices = useMemo(() => {
      const indices: Record<string, number> = {};

      virtualItems.forEach((item, index) => {
        if (item.type === "category") {
          indices[categorizedIcons[item.categoryIndex].name] = index;
        }
      });

      return indices;
    }, [virtualItems, categorizedIcons]);

    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
      count: virtualItems.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => (virtualItems[index].type === "category" ? 25 : 40),
      paddingEnd: 2,
      gap: 10,
      overscan: 5
    });

    const handleValueChange = useCallback(
      (icon: string) => {
        if (value === undefined) {
          setSelectedIcon(icon);
        }
        onValueChange?.(icon);
      },
      [value, onValueChange]
    );

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setSearch("");
        if (open === undefined) {
          setIsOpen(newOpen);
        }
        onOpenChange?.(newOpen);

        setIsPopoverVisible(newOpen);

        if (newOpen) {
          setTimeout(() => {
            virtualizer.measure();
            setIsLoading(false);
          }, 1);
        }
      },
      [open, onOpenChange, virtualizer]
    );

    const handleIconClick = useCallback(
      (iconName: string) => {
        handleValueChange(iconName);
        setIsOpen(false);
        setSearch("");
      },
      [handleValueChange]
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);

        if (parentRef.current) {
          parentRef.current.scrollTop = 0;
        }

        virtualizer.scrollToOffset(0);
      },
      [virtualizer]
    );

    const scrollToCategory = useCallback(
      (categoryName: string) => {
        const categoryIndex = categoryIndices[categoryName];

        if (categoryIndex !== undefined && virtualizer) {
          virtualizer.scrollToIndex(categoryIndex, {
            align: "start",
            behavior: "smooth"
          });
        }
      },
      [categoryIndices, virtualizer]
    );

    const categoryButtons = useMemo(() => {
      if (!categorized || search.trim() !== "") return null;

      return categorizedIcons.map((category) => (
        <Button
          key={category.name}
          variant={"outline"}
          size="sm"
          className="text-xs"
          onClick={(e) => {
            e.stopPropagation();
            scrollToCategory(category.name);
          }}
        >
          {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
        </Button>
      ));
    }, [categorizedIcons, scrollToCategory, categorized, search]);

    const renderIcon = useCallback(
      (icon: IconData, index: number) => (
        <TooltipProvider key={`${icon.name}-${index}`}>
          <Tooltip>
            <TooltipTrigger
              className={cn(
                "rounded-md border p-2 transition hover:bg-foreground/10",
                "flex items-center justify-center"
              )}
              onClick={() => handleIconClick(icon.name)}
            >
              <IconRenderer name={icon.name} />
            </TooltipTrigger>
            <TooltipContent>
              <p>{icon.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      [handleIconClick]
    );

    const renderVirtualContent = useCallback(() => {
      if (filteredIcons.length === 0) {
        return <div className="text-center text-gray-500">No icon found</div>;
      }

      return (
        <div
          className="relative w-full overscroll-contain"
          style={{
            height: `${virtualizer.getTotalSize()}px`
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
            const item = virtualItems[virtualItem.index];

            if (!item) return null;

            const itemStyle = {
              position: "absolute" as const,
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            };

            if (item.type === "category") {
              return (
                <div key={virtualItem.key} style={itemStyle} className="top-0 z-10 bg-background">
                  <h3 className="text-sm font-medium capitalize">
                    {categorizedIcons[item.categoryIndex].name}
                  </h3>
                  <div className="h-px w-full bg-foreground/10" />
                </div>
              );
            }

            return (
              <div key={virtualItem.key} data-index={virtualItem.index} style={itemStyle}>
                <div className="grid w-full grid-cols-5 gap-2">
                  {item.icons!.map((icon, index) => renderIcon(icon, index))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }, [virtualizer, virtualItems, categorizedIcons, filteredIcons, renderIcon]);

    React.useEffect(() => {
      if (isPopoverVisible) {
        setIsLoading(true);
        const timer = setTimeout(() => {
          setIsLoading(false);
          virtualizer.measure();
        }, 10);

        const resizeObserver = new ResizeObserver(() => {
          virtualizer.measure();
        });

        if (parentRef.current) {
          resizeObserver.observe(parentRef.current);
        }

        return () => {
          clearTimeout(timer);
          resizeObserver.disconnect();
        };
      }
    }, [isPopoverVisible, virtualizer]);

    return (
      <Popover open={open ?? isOpen} onOpenChange={handleOpenChange} modal={modal}>
        <PopoverTrigger ref={ref} asChild {...props}>
          {children || (
            <Button variant="outline">
              {value || selectedIcon ? (
                <>
                  <Icon nameIcon={(value || selectedIcon)!} />
                </>
              ) : (
                triggerPlaceholder
              )}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          {searchable && <Input placeholder={searchPlaceholder} onChange={handleSearchChange} />}
          {categorized && search.trim() === "" && (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex w-max gap-1 p-3">{categoryButtons}</div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
          <ScrollArea className="h-60 max-h-60 w-full" viewportRef={parentRef}>
            {isLoading ? <IconsColumnSkeleton /> : renderVirtualContent()}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }
);
IconPicker.displayName = "IconPicker";

type typesPropsIcon = {
  nameIcon: string;
  propsIcon?: IconBaseProps;
};

const iconSetImporters: Record<string, () => Promise<unknown>> = {
  ai: () => import("react-icons/ai"),
  bi: () => import("react-icons/bi"),
  bs: () => import("react-icons/bs"),
  cg: () => import("react-icons/cg"),
  ci: () => import("react-icons/ci"),
  di: () => import("react-icons/di"),
  fa: () => import("react-icons/fa"),
  fa6: () => import("react-icons/fa6"),
  fc: () => import("react-icons/fc"),
  fi: () => import("react-icons/fi"),
  gi: () => import("react-icons/gi"),
  go: () => import("react-icons/go"),
  gr: () => import("react-icons/gr"),
  hi: () => import("react-icons/hi"),
  hi2: () => import("react-icons/hi2"),
  im: () => import("react-icons/im"),
  io: () => import("react-icons/io"),
  io5: () => import("react-icons/io5"),
  lia: () => import("react-icons/lia"),
  lu: () => import("react-icons/lu"),
  md: () => import("react-icons/md"),
  pi: () => import("react-icons/pi"),
  ri: () => import("react-icons/ri"),
  rx: () => import("react-icons/rx"),
  si: () => import("react-icons/si"),
  sl: () => import("react-icons/sl"),
  tb: () => import("react-icons/tb"),
  tfi: () => import("react-icons/tfi"),
  ti: () => import("react-icons/ti"),
  vsc: () => import("react-icons/vsc"),
  wi: () => import("react-icons/wi")
};

const iconComponentCache = new Map<string, IconType>();

function Icon({ nameIcon, propsIcon }: typesPropsIcon): React.ReactElement | null {
  const lib = nameIcon
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")[0]
    .toLocaleLowerCase();

  const cacheKey = `${lib}:${nameIcon}`;
  const [Component, setComponent] = React.useState<IconType | null>(
    () => iconComponentCache.get(cacheKey) ?? null
  );

  React.useEffect(() => {
    if (iconComponentCache.has(cacheKey)) {
      setComponent(() => iconComponentCache.get(cacheKey)!);
      return;
    }

    const importer = iconSetImporters[lib];
    if (!importer) return;

    let cancelled = false;
    importer().then((mod) => {
      if (cancelled) return;
      const Comp = (mod as Record<string, IconType>)[nameIcon];
      if (Comp) {
        iconComponentCache.set(cacheKey, Comp);
        setComponent(() => Comp);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, lib, nameIcon]);

  if (!Component) return null;
  return <Component {...propsIcon} />;
}

export { Icon, IconPicker };
