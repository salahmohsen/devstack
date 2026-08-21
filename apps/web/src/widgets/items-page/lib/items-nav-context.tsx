import { createContext, useContext, useMemo, useRef } from "react";

import { type ItemsNavLayout } from "@/widgets/items-page/lib/use-items-navigation";

export type ItemsNavContainerRef = React.RefObject<HTMLElement | null>;

export type ItemsNavContextValue = {
  handleNext: () => void;
  handlePrev: () => void;
  handleUp?: () => void;
  handleDown?: () => void;
  layout: ItemsNavLayout;
  canPrev: boolean;
  canNext: boolean;
  canUp: boolean;
  canDown: boolean;
  containerRef: ItemsNavContainerRef;
};

const ItemsNavContext = createContext<ItemsNavContextValue | null>(null);

export function useItemsNavContextOptional() {
  return useContext(ItemsNavContext);
}

export function useItemsNavContext() {
  const ctx = useItemsNavContextOptional();
  if (!ctx) {
    throw new Error("useItemsNavContext must be used inside <ItemsNavProvider>.");
  }
  return ctx;
}

type ItemsNavProviderProps = {
  children: React.ReactNode;
  value: Omit<
    ItemsNavContextValue,
    "containerRef" | "layout" | "canPrev" | "canNext" | "canUp" | "canDown"
  > & {
    containerRef?: ItemsNavContainerRef;
    layout?: ItemsNavLayout;
    canPrev?: boolean;
    canNext?: boolean;
    canUp?: boolean;
    canDown?: boolean;
  };
};

export function ItemsNavProvider({ children, value }: ItemsNavProviderProps) {
  const localRef = useRef<HTMLElement | null>(null);
  const containerRef = value.containerRef ?? localRef;
  const memoised = useMemo<ItemsNavContextValue>(() => {
    return {
      handleNext: value.handleNext,
      handlePrev: value.handlePrev,
      handleUp: value.handleUp,
      handleDown: value.handleDown,
      layout: value.layout ?? "list",
      canPrev: value.canPrev ?? true,
      canNext: value.canNext ?? true,
      canUp: value.canUp ?? false,
      canDown: value.canDown ?? false,
      containerRef
    };
  }, [
    value.handleNext,
    value.handlePrev,
    value.handleUp,
    value.handleDown,
    value.layout,
    value.canPrev,
    value.canNext,
    value.canUp,
    value.canDown,
    containerRef
  ]);
  return <ItemsNavContext value={memoised}>{children}</ItemsNavContext>;
}
