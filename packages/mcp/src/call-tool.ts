import { ORPCError } from "@orpc/server";

import { signConfirm, verifyConfirm, CONFIRM_TTL_MS } from "#@/confirm";
import { isGated } from "#@/effects";
import { type ToolDef } from "#@/registry";
import { resolvePath } from "#@/resolve-path";

export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const text = (value: unknown, isError = false): ToolResult => {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }],
    ...(isError ? { isError: true } : {})
  };
};

export type CallToolDeps = {
  client: unknown;
  userId: string;
  confirmSecret: string;
  onUnexpectedError: (error: unknown) => void;
};

export async function callTool(
  def: ToolDef,
  rawArgs: Record<string, unknown>,
  deps: CallToolDeps
): Promise<ToolResult> {
  const { confirmToken, ...input } = rawArgs;
  const parts = { secret: deps.confirmSecret, userId: deps.userId, tool: def.name, input };

  if (isGated(def.effect)) {
    if (typeof confirmToken !== "string" || confirmToken.length === 0) {
      return text({
        requiresConfirmation: true,
        tool: def.name,
        effect: def.effect,
        wouldRunWith: input,
        confirmToken: signConfirm(parts),
        expiresInSeconds: CONFIRM_TTL_MS / 1000,
        next: "Show this to the user. If they approve, call the same tool again with the identical input plus confirmToken."
      });
    }
    const verdict = verifyConfirm({ ...parts, token: confirmToken });
    if (verdict !== "ok") {
      return text(
        verdict === "expired"
          ? "Confirmation expired. Call again without confirmToken for a new preview."
          : "Confirmation does not match this tool and input. Call again without confirmToken for a new preview.",
        true
      );
    }
  }

  const procedure = resolvePath(deps.client, def.path);
  if (typeof procedure !== "function") return text(`Unknown tool path ${def.path}`, true);

  try {
    const result = await (procedure as (input: unknown) => Promise<unknown>)(input);
    return text(result ?? null);
  } catch (error) {
    if (error instanceof ORPCError) {
      return text(
        { code: error.code, status: error.status, message: error.message, data: error.data },
        true
      );
    }
    deps.onUnexpectedError(error);
    return text("Internal error. Check server logs.", true);
  }
}
