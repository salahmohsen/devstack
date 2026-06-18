import { type z } from "zod";

export function createZodFormValidator<T extends z.ZodTypeAny>(
  schema: T
): ({ value }: { value: z.input<T> }) => { fields: Record<string, string> } | undefined {
  return ({ value }) => {
    const result = schema.safeParse(value);
    if (result.success) return undefined;

    return {
      fields: Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]))
    };
  };
}
