import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createRouterClient, type AnyRouter } from "@orpc/server";

import { type OrpcContext } from "@tsu-stack/core";

import { callTool } from "#@/call-tool";
import { buildInputSchema, describeProcedure } from "#@/input-schema";
import { TOOLS } from "#@/registry";
import { resolvePath } from "#@/resolve-path";

export function createMcpServer(args: {
  router: AnyRouter;
  context: OrpcContext;
  confirmSecret: string;
}): McpServer {
  const userId = args.context.session?.user?.id;
  if (!userId) throw new Error("createMcpServer requires an authenticated context");

  const client = createRouterClient(args.router, { context: args.context });
  const mcp = new McpServer(
    { name: "tsu-stack-job-pipeline", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );
  const raw = mcp.server;

  raw.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: TOOLS.map((def) => {
        const procedure = resolvePath(args.router, def.path) as Parameters<
          typeof describeProcedure
        >[0];
        return {
          name: def.name,
          description: `${describeProcedure(procedure, `Calls ${def.path}.`)} [${def.effect}]`,
          inputSchema: buildInputSchema(def.path, def.effect, procedure) as { type: "object" },
          annotations: {
            readOnlyHint: def.effect === "read",
            destructiveHint: def.effect === "destructive" || def.effect === "outbound",
            openWorldHint: def.effect === "outbound"
          }
        };
      })
    };
  });

  raw.setRequestHandler(CallToolRequestSchema, async (request) => {
    const def = TOOLS.find((tool) => tool.name === request.params.name);
    if (!def) {
      return {
        content: [{ type: "text", text: `Unknown tool ${request.params.name}` }],
        isError: true
      };
    }
    return callTool(def, (request.params.arguments ?? {}) as Record<string, unknown>, {
      client,
      userId,
      confirmSecret: args.confirmSecret,
      onUnexpectedError: (error) =>
        args.context.logger.error(error instanceof Error ? error : String(error))
    });
  });

  return mcp;
}
