import { useEffect, useSyncExternalStore } from "react";

import { isPlaygroundCommandId, isPlaygroundEnabled } from "@/shared/lib/playground";

import { COMMAND_BY_ID, COMMAND_CATALOG } from "./catalog";
import { DEFAULT_COMMAND_BINDINGS } from "./default-bindings";
import { type CommandBinding, type CommandId, COMMAND_BINDINGS_STORAGE_KEY } from "./types";

type BindingOverrides = Partial<Record<CommandId, CommandBinding | null>>;

const listeners = new Set<() => void>();

let overrides: BindingOverrides = {};
let recordingCommandId: CommandId | null = null;
let enabled: Partial<Record<CommandId, boolean>> = {};
let resolvedBindings = {} as Record<CommandId, CommandBinding | null>;

function emit() {
  resolvedBindings = buildResolvedBindings();
  for (const listener of listeners) listener();
}

function isCommandId(value: string): value is CommandId {
  return COMMAND_CATALOG.some((command) => command.id === value);
}

function isBinding(value: unknown): value is CommandBinding {
  if (!value || typeof value !== "object") return false;
  const record = value as { kind?: unknown; hotkey?: unknown; sequence?: unknown };
  if (record.kind === "hotkey" && typeof record.hotkey === "string") return true;
  return (
    record.kind === "sequence" &&
    Array.isArray(record.sequence) &&
    record.sequence.every((step) => typeof step === "string") &&
    record.sequence.length > 0
  );
}

function readOverrides(): BindingOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COMMAND_BINDINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const next: BindingOverrides = {};
    for (const [id, binding] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isCommandId(id)) continue;
      if (binding === null) {
        next[id] = null;
        continue;
      }
      if (isBinding(binding)) next[id] = binding;
    }
    return next;
  } catch {
    return {};
  }
}

function persistOverrides() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMMAND_BINDINGS_STORAGE_KEY, JSON.stringify(overrides));
}

function bindingsEqual(a: CommandBinding, b: CommandBinding): boolean {
  if (a.kind === "hotkey" && b.kind === "hotkey") return a.hotkey === b.hotkey;
  if (a.kind === "sequence" && b.kind === "sequence") {
    return JSON.stringify(a.sequence) === JSON.stringify(b.sequence);
  }
  return false;
}

function buildResolvedBindings(): Record<CommandId, CommandBinding | null> {
  const resolved = {} as Record<CommandId, CommandBinding | null>;
  for (const command of COMMAND_CATALOG) {
    // Production builds keep catalog entries for typing, but must not register
    // playground sequences (they delay chords like A,G and block rebinding).
    if (isPlaygroundCommandId(command.id) && !isPlaygroundEnabled) {
      resolved[command.id] = null;
      continue;
    }
    resolved[command.id] = Object.hasOwn(overrides, command.id)
      ? (overrides[command.id] ?? null)
      : DEFAULT_COMMAND_BINDINGS[command.id];
  }
  return resolved;
}

if (typeof window !== "undefined") {
  overrides = readOverrides();
}
resolvedBindings = buildResolvedBindings();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCommandBinding(id: CommandId): CommandBinding | null {
  return resolvedBindings[id];
}

export function getResolvedCommandBindings(): Record<CommandId, CommandBinding | null> {
  return resolvedBindings;
}

export function setCommandBinding(id: CommandId, binding: CommandBinding | null) {
  const defaults = DEFAULT_COMMAND_BINDINGS[id];
  if (binding !== null && bindingsEqual(defaults, binding)) {
    const next = { ...overrides };
    delete next[id];
    overrides = next;
  } else {
    overrides = { ...overrides, [id]: binding };
  }
  persistOverrides();
  emit();
}

export function resetCommandBinding(id: CommandId) {
  if (!Object.hasOwn(overrides, id)) return;
  const next = { ...overrides };
  delete next[id];
  overrides = next;
  persistOverrides();
  emit();
}

export function resetAllCommandBindings() {
  if (Object.keys(overrides).length === 0) return;
  overrides = {};
  persistOverrides();
  emit();
}

export function getRecordingCommandId(): CommandId | null {
  return recordingCommandId;
}

export function setRecordingCommandId(id: CommandId | null) {
  if (recordingCommandId === id) return;
  recordingCommandId = id;
  emit();
}

export function getCommandEnabled(id: CommandId): boolean {
  if (isPlaygroundCommandId(id) && !isPlaygroundEnabled) return false;
  if (COMMAND_BY_ID[id].gated) {
    return enabled[id] ?? false;
  }
  return enabled[id] ?? true;
}

export function setCommandEnabled(id: CommandId, nextEnabled: boolean) {
  if (enabled[id] === nextEnabled) return;
  enabled = { ...enabled, [id]: nextEnabled };
  emit();
}

export function findBindingConflict(
  binding: CommandBinding,
  ignoreId: CommandId
): CommandId | null {
  for (const command of COMMAND_CATALOG) {
    if (command.id === ignoreId) continue;
    if (isPlaygroundCommandId(command.id) && !isPlaygroundEnabled) continue;
    const existing = getCommandBinding(command.id);
    if (!existing || existing.kind !== binding.kind) continue;
    if (bindingsEqual(existing, binding)) return command.id;
  }
  return null;
}

export function useCommandBindings(): Record<CommandId, CommandBinding | null> {
  return useSyncExternalStore(subscribe, getResolvedCommandBindings, getResolvedCommandBindings);
}

export function useCommandBinding(id: CommandId): CommandBinding | null {
  return useSyncExternalStore(
    subscribe,
    () => getCommandBinding(id),
    () => getCommandBinding(id)
  );
}

export function useRecordingCommandId(): CommandId | null {
  return useSyncExternalStore(subscribe, getRecordingCommandId, getRecordingCommandId);
}

export function useCommandEnabled(id: CommandId): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getCommandEnabled(id),
    () => getCommandEnabled(id)
  );
}

export function useRegisterCommandEnabled(id: CommandId, enabled: boolean) {
  useEffect(() => {
    setCommandEnabled(id, enabled);
    return () => {
      setCommandEnabled(id, false);
    };
  }, [enabled, id]);
}
