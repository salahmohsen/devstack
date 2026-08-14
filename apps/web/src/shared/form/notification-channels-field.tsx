"use client";

import {
  NOTIFICATION_KIND_DESCRIPTIONS,
  NOTIFICATION_KIND_LABELS,
  type NotificationChannelPrefs,
  type NotificationKind
} from "@tsu-stack/core";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type NotificationChannelGroup = {
  title: string;
  kinds: NotificationKind[];
};

type NotificationChannelsFieldProps = {
  label?: string;
  description?: string;
  groups: NotificationChannelGroup[];
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
  };
};

/**
 * In-app / email toggles for each notification kind.
 */
function NotificationChannelsField(props: NotificationChannelsFieldProps) {
  const field = useFieldContext<NotificationChannelPrefs>();
  const value = field.state.value;

  function setToggle(kind: NotificationKind, key: "app" | "email", checked: boolean) {
    field.handleChange({
      ...value,
      [kind]: { ...value[kind], [key]: checked }
    });
  }

  return (
    <Field className={cn("w-full min-w-0 gap-2", props.classNames?.field)}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <div className="w-full overflow-hidden rounded-xl border border-border/80">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <span>Type</span>
          <span className="w-14 text-center">App</span>
          <span className="w-14 text-center">Email</span>
        </div>
        {props.groups.map((group) => (
          <div key={group.title}>
            <p className="bg-muted/20 px-3 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {group.title}
            </p>
            <ul className="divide-y">
              {group.kinds.map((kind) => (
                <li
                  key={kind}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{NOTIFICATION_KIND_LABELS[kind]}</p>
                    <p className="text-xs text-muted-foreground">
                      {NOTIFICATION_KIND_DESCRIPTIONS[kind]}
                    </p>
                  </div>
                  <div className="flex w-14 justify-center">
                    <Switch
                      checked={value[kind].app}
                      onCheckedChange={(checked) => setToggle(kind, "app", checked)}
                      onBlur={field.handleBlur}
                      aria-label={`${NOTIFICATION_KIND_LABELS[kind]} app`}
                    />
                  </div>
                  <div className="flex w-14 justify-center">
                    <Switch
                      checked={value[kind].email}
                      onCheckedChange={(checked) => setToggle(kind, "email", checked)}
                      onBlur={field.handleBlur}
                      aria-label={`${NOTIFICATION_KIND_LABELS[kind]} email`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { NotificationChannelsField };
export type { NotificationChannelGroup };
