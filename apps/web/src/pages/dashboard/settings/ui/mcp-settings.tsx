import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, KeyRoundIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

import { SettingsFrame } from "./settings-frame";
import { SettingsSection } from "./settings-section";

type KeyRow = { id: string; name?: string | null; start?: string | null };

const keysQueryOptions = queryOptions({
  queryKey: ["auth", "api-keys"] as const,
  queryFn: async (): Promise<KeyRow[]> => {
    const result = await authClient.apiKey.list();
    if (result.error) throw new Error(result.error.message ?? "Could not load keys");
    return (result.data?.apiKeys ?? []) as KeyRow[];
  },
  staleTime: 30_000
});

const ENDPOINT = `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/mcp`;

export function McpSettings() {
  const queryClient = useQueryClient();
  const { data: keys = [] } = useQuery(keysQueryOptions);
  const [fresh, setFresh] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: keysQueryOptions.queryKey });
  }

  async function create() {
    const result = await authClient.apiKey.create({
      name: `mcp-${new Date().toISOString().slice(0, 10)}`
    });
    if (result.error || !result.data) {
      toast.error(result.error?.message ?? "Could not create key");
      return;
    }
    setFresh(result.data.key);
    await refresh();
  }

  async function revoke(keyId: string) {
    const result = await authClient.apiKey.delete({ keyId });
    if (result.error) {
      toast.error(result.error.message ?? "Could not revoke key");
      return;
    }
    await refresh();
  }

  return (
    <SettingsFrame
      title="MCP access"
      description="Run your job pipeline from Claude Code or any MCP client."
      icon={<KeyRoundIcon className="size-4" />}
      actions={
        <Button size="sm" onClick={() => void create()}>
          <PlusIcon /> New key
        </Button>
      }
    >
      <div className="space-y-6 p-4">
        <SettingsSection
          title="Connect a client"
          description="Sends, replies, and deletes always return a preview first. Nothing goes out until the client repeats the call with the confirm token."
        >
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {`claude mcp add --transport http jobs ${ENDPOINT} --header "x-api-key: <your key>"`}
          </pre>
        </SettingsSection>

        <SettingsSection title="API keys">
          {fresh ? (
            <Alert>
              <KeyRoundIcon />
              <AlertTitle>Copy this key now. It is shown once.</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <code className="text-xs break-all">{fresh}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Copy key"
                  onClick={() => {
                    void navigator.clipboard.writeText(fresh);
                    toast.success("Copied");
                  }}
                >
                  <CopyIcon />
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys yet.</p>
          ) : (
            <ul className="divide-y">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">
                    {key.name ?? "Key"}{" "}
                    <span className="text-muted-foreground">{key.start ?? ""}…</span>
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Revoke key"
                    onClick={() => void revoke(key.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>
      </div>
    </SettingsFrame>
  );
}
