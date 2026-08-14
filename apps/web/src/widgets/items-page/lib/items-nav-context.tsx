import { createContext, useContext, useMemo, useRef } from "react";

export type ItemsNavContainerRef = React.RefObject<HTMLUListElement | null>;

export type ItemsNavContextValue = {
  handleNext: () => void;
  handlePrev: () => void;
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
  value: Omit<ItemsNavContextValue, "containerRef"> & {
    containerRef?: ItemsNavContainerRef;
  };
};

export function ItemsNavProvider({ children, value }: ItemsNavProviderProps) {
  const localRef = useRef<HTMLUListElement | null>(null);
  const containerRef = value.containerRef ?? localRef;
  const memoised = useMemo<ItemsNavContextValue>(() => {
    return {
      handleNext: value.handleNext,
      handlePrev: value.handlePrev,
      containerRef
    };
  }, [value.handleNext, value.handlePrev, containerRef]);
  return <ItemsNavContext value={memoised}>{children}</ItemsNavContext>;
}
