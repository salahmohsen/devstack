---
name: tanstack-form-conventions
description: Conventions for writing forms and field components with TanStack Form in this project. Use when creating new forms, editing form components, adding field components, or reviewing form code.
---

# TanStack Form Conventions

## Core Rule

TanStack Form **IS** the state management for form fields. The form's `defaultValues` → `form.state.values` is the single source of truth.

**NEVER** create `useState` for field values. Use `form.state.values`, `form.getFieldValue()`, `form.setFieldValue()`, or `form.Subscribe` instead.

Non-field UI state (dialog open, detection progress, search queries) may use `useState`.

## Form Composition

```tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { CreateThingInputSchema, UpdateThingInputSchema, type ThingOutput } from "@tsu-stack/core";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";

type ThingFormProps = {
  initialData?: ThingOutput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ThingForm({ initialData, open, onOpenChange }: ThingFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;
  const id = initialData?.id;

  const createMutation = useMutation(
    orpcQueryClient.things.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpcQueryClient.things.list.queryKey() });
        toast.success("Created.");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message)
    })
  );

  const form = useAppForm({
    defaultValues: {
      name: initialData?.name ?? ""
      // ... all fields with fallback defaults
    },
    validators: {
      onChange: createZodFormValidator(isEdit ? UpdateThingInputSchema : CreateThingInputSchema)
    },
    onSubmit: ({ value }) => {
      if (isEdit && id) {
        updateMutation.mutate({ id, data: value });
      } else {
        createMutation.mutate(value);
      }
    }
  });

  const handleClose = () => onOpenChange(false);
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, handleClose);

  return (
    <Form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="name">
        {(field) => <field.InputField label="Name" placeholder="e.g. My Thing" />}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton isLoading={createMutation.isPending}>
          {isEdit ? "Save" : "Create"}
        </form.SubmitButton>
      </form.AppForm>
    </Form>
  );
}
```

### Key patterns

- `form.AppField name="fieldName"` → `(field) => <field.ComponentName />` — type-safe field binding
- `form.AppForm` → wraps form-level components like `SubmitButton`
- `<Form onSubmit>` → always `e.preventDefault(); e.stopPropagation(); void form.handleSubmit()`
- `form.Subscribe` → reactive form-level state (isSubmitting, isDirty, canSubmit, values)
- `form.reset(data)` → use when async data loads or after successful mutation

## Validation

```ts
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
```

- Schemas from `@tsu-stack/core` (e.g., `CreateProjectInputSchema`, `StackCreateInputSchema`)
- Timing options:
  - `onChange` — real-time validation (best for inline errors)
  - `onBlur` — on field blur (less aggressive)
  - `onSubmit` — form-level only (least aggressive)
- Can mix timings: `validators={{ onChange: schema, onBlur: otherSchema }}`

## Field Components

**Before building UI for a new field, load the `coss` skill** to use coss primitives (Field, Input, Switch, Select, Combobox, etc.) and check `coss-particles` for copy-paste-ready patterns.

Every field component follows this pattern:

```tsx
"use client";

import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";

import { FieldLabelWithTooltip } from "./field-label-with-tooltip";
import { useFieldContext } from "./form-contexts";

type MyFieldProps = {
  label?: string;
  description?: string;
  classNames?: {
    field?: string;
    label?: string;
    description?: string;
    error?: string;
    input?: string;
  };
};

function MyField(props: MyFieldProps) {
  const field = useFieldContext<string>(); // ← type = field value type

  return (
    <Field className={props.classNames?.field}>
      <FieldLabelWithTooltip
        label={props.label}
        description={props.description}
        htmlFor={field.name}
        classNames={{
          label: props.classNames?.label,
          description: props.classNames?.description
        }}
      />
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        className={props.classNames?.input}
      />
      <FieldError errors={field.state.meta.errors} className={props.classNames?.error} />
    </Field>
  );
}

export { MyField };
```

### Field rules

- Always `"use client"` directive
- Always `useFieldContext<T>()` — never `useField()` directly
- **Use coss primitives** for the UI layer (Input, Switch, Select, Combobox, Textarea, etc.) — not raw HTML elements
- Check `coss-particles` for ready-made patterns (e.g., `p-field-*.json`, `p-input-*.json`, `p-switch-*.json`)
- Props: `label?`, `description?`, `classNames?` object
- **Descriptions render as tooltips** next to the label via `FieldLabelWithTooltip` — never inline `FieldDescription` under the control
- Bind: `field.state.value`, `field.handleChange(value)`, `field.handleBlur`, `field.name`
- Errors: `field.state.meta.errors` → pass to `<FieldError errors={...} />`
- Register new fields in `apps/web/src/shared/form/form.ts` → `fieldComponents` object

## Field Isolation Rule

Never build custom field UI inline in a form component. If no existing field component covers the feature (e.g., npm package picker, tag selector, rich autocomplete), create a **new field component** in `apps/web/src/shared/form/` following the field component pattern, register it, then use it via `form.AppField` like any other field.

Form files should only compose fields — not implement field logic.

## Anti-Patterns

| DON'T                                                            | DO                                                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `const [name, setName] = useState("")`                           | `defaultValues: { name: "" }` + `form.AppField`                                           |
| `value={form.state.values.name}` directly in JSX                 | `form.AppField name="name"` with `field.state.value`                                      |
| `<input onChange={e => form.setFieldValue("x", e.target.value)}` | Use `<field.InputField />` or bind via `field.handleChange`                               |
| Skip `e.preventDefault()` in `<form onSubmit>`                   | Always `e.preventDefault(); e.stopPropagation(); void form.handleSubmit()`                |
| Use `useFieldContext` outside `form.AppField`                    | Only inside `form.AppField` render prop                                                   |
| Bypass `form.AppField` for type safety                           | Always use `form.AppField` — mistyping `name` = TypeScript error                          |
| Create `useState` for search/filter in form context              | Acceptable for non-field UI state (dialog, detection, etc.)                               |
| Build custom field UI inline in form files                       | Create a separate field component in `shared/form/`, register it, use via `form.AppField` |

## Unsaved Changes Guard

For dialog-based forms, always use `useFormDirtyGuard`:

```tsx
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";

const handleClose = () => onOpenChange(false);
const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, handleClose);

// Cancel button:
<Button onClick={handleCloseAttempt}>Cancel</Button>;

// At bottom of component:
{
  alertDialog;
}
```

## Async Data Loading

When initial data comes from a query, reset the form when data arrives:

```tsx
const thingQuery = useQuery({ ...orpcQueryClient.things.get.queryOptions({ input: { id } }) });

useEffect(() => {
  if (thingQuery.data) {
    form.reset({
      name: thingQuery.data.name
      // ...
    });
  }
}, [thingQuery.data, form]);
```

## Async Combobox Search Pattern

For async search in a Combobox (e.g., npm packages, users), see `apps/web/src/shared/form/npm-package-field.tsx` for a working example.

### Key patterns for async Combobox

- `filter={null}` — disable client-side filtering (API handles it)
- `onInputValueChange={setSearchValue}` — capture input to trigger search
- `onValueChange` — update form field, clear input after selection
- `value={selected.map(...)}` — **required** for default/initial selected items to display as chips
- Filter `selectedNames` from search results — selected items should NOT appear in dropdown
- Use `ComboboxStatus` for loading spinner/status messages
- Use `ComboboxEmpty` for empty state with custom message
- Debounce search queries (300ms recommended)

## Adding New Field Components

1. **Load the `coss` skill** and check `coss-particles` for matching patterns (e.g., `p-field-*.json`, `p-input-*.json`)
2. Create file in `apps/web/src/shared/form/` (e.g., `my-field.tsx`)
3. Follow the field component pattern above, using coss primitives for UI
4. Register in `apps/web/src/shared/form/form.ts` → `fieldComponents`
5. Export in `apps/web/src/shared/form/index.ts`

## Edge Cases: Fetching TanStack Form Docs

When encountering unfamiliar behavior, always fetch docs before writing code:

```bash
# Search for a concept
pnpm tanstack search-docs "linked fields" --library form --json

# Fetch a specific guide
pnpm tanstack doc form framework/react/guides/linked-fields --json

# Fetch API reference
pnpm tanstack doc form framework/react/reference/functions/useForm --json
```

Useful topics: field arrays (`mode="array"`), linked fields (`onChangeListenTo`), async validation, `withForm`, `withFieldGroup`, `extendForm`, `formOptions`.

## Checklist

When creating or editing a form:

- [ ] No `useState` for field values
- [ ] No custom field UI inline — all fields are separate components used via `form.AppField`
- [ ] `defaultValues` covers all fields with fallback defaults
- [ ] `validators` uses `createZodFormValidator` with appropriate timing
- [ ] `<form onSubmit>` has `e.preventDefault(); e.stopPropagation()`
- [ ] All fields use `form.AppField` (not raw `<input>`)
- [ ] Submit uses `form.AppForm` + `form.SubmitButton`
- [ ] Dialog forms use `useFormDirtyGuard`
- [ ] Async data uses `form.reset()` in `useEffect`

When creating new field components:

- [ ] Loaded `coss` skill and checked `coss-particles` for matching patterns
- [ ] Using coss primitives (Input, Switch, Select, etc.) — not raw HTML
- [ ] Registered in `form.ts` and `index.ts`

## Updating This Skill

If the user says a convention or pattern in this file is wrong or outdated, update this skill file following the `write-a-skill` skill instructions:

1. Load the `write-a-skill` skill
2. Edit this SKILL.md to fix the wrong convention
3. Keep the description current so the agent loads it correctly
