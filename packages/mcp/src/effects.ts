export type Effect = "read" | "write" | "outbound" | "destructive";

export function isGated(effect: Effect): boolean {
  return effect === "outbound" || effect === "destructive";
}
