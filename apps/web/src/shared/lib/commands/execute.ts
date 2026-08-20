import { type CommandId } from "./types";

type CommandHandler = () => void;

const handlers = new Map<CommandId, CommandHandler>();
const handlerListeners = new Set<() => void>();

function emitHandlers() {
  for (const listener of handlerListeners) listener();
}

export function registerCommandHandler(id: CommandId, handler: CommandHandler): () => void {
  handlers.set(id, handler);
  emitHandlers();
  return () => {
    if (handlers.get(id) === handler) {
      handlers.delete(id);
      emitHandlers();
    }
  };
}

export function getCommandHandler(id: CommandId): CommandHandler | undefined {
  return handlers.get(id);
}

export function executeCommand(id: CommandId) {
  handlers.get(id)?.();
}

export function subscribeCommandHandlers(listener: () => void): () => void {
  handlerListeners.add(listener);
  return () => {
    handlerListeners.delete(listener);
  };
}

export function hasCommandHandler(id: CommandId): boolean {
  return handlers.has(id);
}
