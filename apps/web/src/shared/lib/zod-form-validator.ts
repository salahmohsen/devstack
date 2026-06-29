import { type z } from "zod";

export function createZodFormValidator<T extends z.ZodTypeAny>(
  schema: T
): ({
  value
}: {
  value: z.input<T>;
}) => { fields: Record<string, Array<{ message: string }>> } | undefined {
  return ({ value }) => {
    const result = schema.safeParse(value);
    if (result.success) return undefined;

    const fields: Record<string, Array<{ message: string }>> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!key) continue;
      if (!fields[key]) fields[key] = [];
      fields[key].push({ message: issue.message });
    }

    return { fields };
  };
}
