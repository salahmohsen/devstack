import {
  formatForDisplay,
  useHeldKeys,
  useHotkeyRecorder,
  useHotkeySequenceRecorder,
  type Hotkey,
  type HotkeySequence
} from "@tanstack/react-hotkeys";
import { Keyboard, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import {
  COMMAND_BY_ID,
  COMMAND_CATALOG,
  DEFAULT_COMMAND_BINDINGS,
  findBindingConflict,
  resetAllCommandBindings,
  resetCommandBinding,
  setCommandBinding,
  setRecordingCommandId,
  useCommandBindings,
  useRecordingCommandId,
  type CommandBinding,
  type CommandId
} from "@/shared/lib/commands";
import { HotkeyKbd } from "@/shared/ui/hotkey-kbd";

import { SettingsFrame } from "./settings-frame";
import { SettingsSection } from "./settings-section";

const GROUP_ORDER = ["Global", "Pages", "Agent", "Settings", "Playground", "Tabs"] as const;

function toStoredBinding(sequence: HotkeySequence): CommandBinding | null {
  if (sequence.length === 0) return null;
  if (sequence.length === 1) {
    return { kind: "hotkey", hotkey: sequence[0]! };
  }
  return { kind: "sequence", sequence };
}

function applyRecordedBinding(commandId: CommandId, binding: CommandBinding) {
  const conflict = findBindingConflict(binding, commandId);
  if (conflict) {
    toast.error(`Already used by ${COMMAND_BY_ID[conflict].label}`);
    setRecordingCommandId(null);
    return;
  }
  setCommandBinding(commandId, binding);
  setRecordingCommandId(null);
  toast.success("Shortcut updated");
}

export function ShortcutsSettings() {
  const bindings = useCommandBindings();
  const recordingCommandId = useRecordingCommandId();
  const heldKeys = useHeldKeys();
  const [recorderKind, setRecorderKind] = useState<"hotkey" | "sequence">("hotkey");

  const hotkeyRecorder = useHotkeyRecorder({
    ignoreInputs: false,
    onRecord: (hotkey: Hotkey) => {
      const commandId = recordingCommandId;
      if (!commandId) return;
      applyRecordedBinding(commandId, { kind: "hotkey", hotkey });
    },
    onCancel: () => {
      setRecordingCommandId(null);
    },
    onClear: () => {
      const commandId = recordingCommandId;
      if (!commandId) return;
      setCommandBinding(commandId, null);
      setRecordingCommandId(null);
      toast.success("Shortcut cleared");
    }
  });

  const sequenceRecorder = useHotkeySequenceRecorder({
    ignoreInputs: false,
    commitKeys: "enter",
    idleTimeoutMs: 1500,
    onRecord: (sequence: HotkeySequence) => {
      const commandId = recordingCommandId;
      if (!commandId) return;
      const binding = toStoredBinding(sequence);
      if (!binding) {
        setCommandBinding(commandId, null);
        setRecordingCommandId(null);
        toast.success("Shortcut cleared");
        return;
      }
      applyRecordedBinding(commandId, binding);
    },
    onCancel: () => {
      setRecordingCommandId(null);
    }
  });

  const grouped = useMemo(
    () =>
      GROUP_ORDER.flatMap((group) => {
        const commands = COMMAND_CATALOG.filter((command) => command.group === group);
        return commands.length > 0 ? [{ group, commands }] : [];
      }),
    []
  );

  function startRecording(id: CommandId) {
    const binding = bindings[id] ?? DEFAULT_COMMAND_BINDINGS[id];
    const kind = binding.kind === "sequence" ? "sequence" : "hotkey";
    setRecorderKind(kind);
    setRecordingCommandId(id);
    if (kind === "sequence") {
      sequenceRecorder.startRecording();
    } else {
      hotkeyRecorder.startRecording();
    }
  }

  function cancelRecording() {
    if (recorderKind === "sequence") {
      sequenceRecorder.cancelRecording();
    } else {
      hotkeyRecorder.cancelRecording();
    }
    setRecordingCommandId(null);
  }

  return (
    <SettingsFrame
      title="Shortcuts"
      description="Commands stay the same. Bindings are yours to change."
      icon={<Keyboard className="size-4" aria-hidden />}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetAllCommandBindings();
            toast.success("Restored default shortcuts");
          }}
        >
          <RotateCcw />
          Reset all
        </Button>
      }
    >
      <SettingsSection
        title="Held keys"
        description="Keys currently held down. Also visible in TanStack Hotkeys devtools."
      >
        <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          {heldKeys.length === 0 ? (
            <span className="text-xs text-muted-foreground">Nothing held</span>
          ) : (
            heldKeys.map((key) => (
              <span key={key} className="text-xs">
                {formatForDisplay(key as Hotkey)}
              </span>
            ))
          )}
        </div>
      </SettingsSection>

      {grouped.map((entry) => (
        <SettingsSection key={entry.group} title={entry.group}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Command</TableHead>
                <TableHead className="w-[40%]">Shortcut</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.commands.map((command) => {
                const binding = bindings[command.id];
                const isRecording = recordingCommandId === command.id;
                const recordingLabel =
                  recorderKind === "sequence"
                    ? sequenceRecorder.steps.length > 0
                      ? sequenceRecorder.steps.map((step) => formatForDisplay(step)).join(" ")
                      : "Press chords, then Enter…"
                    : "Press keys…";

                return (
                  <TableRow key={command.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{command.label}</p>
                        <p className="text-xs text-muted-foreground">{command.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isRecording ? (
                        <span className="text-xs text-muted-foreground">{recordingLabel}</span>
                      ) : binding ? (
                        <HotkeyKbd binding={binding} className="ms-0" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Unbound</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {isRecording ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={cancelRecording}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startRecording(command.id)}
                          >
                            Record
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Reset ${command.label}`}
                          onClick={() => {
                            resetCommandBinding(command.id);
                          }}
                        >
                          <RotateCcw />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SettingsSection>
      ))}
    </SettingsFrame>
  );
}
