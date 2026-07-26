import { useSyncExternalStore } from "react";

/**
 * Module-level external store (survives route unmounts).
 * Same pattern as organize-stacks job state / items UI stores.
 */
export function createExternalStore<T extends object>(initialState: T) {
  let state: T = initialState;
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function getState() {
    return state;
  }

  function setState(partial: Partial<T> | ((prev: T) => Partial<T>)) {
    const patch = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...patch };
    emit();
  }

  function resetState(next: T = initialState) {
    state = next;
    emit();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function useStore() {
    return useSyncExternalStore(subscribe, getState, getState);
  }

  return {
    getState,
    setState,
    resetState,
    subscribe,
    useStore
  };
}

export type ExternalStore<T extends object> = ReturnType<typeof createExternalStore<T>>;
