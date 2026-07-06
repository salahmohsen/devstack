import { z } from "zod";

export const DeleteResponseSchema = z.object({ success: z.boolean() });
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

export const ReorderInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().min(0)
    })
  )
});
export type ReorderInput = z.infer<typeof ReorderInputSchema>;

export const ReorderResponseSchema = z.object({ success: z.boolean() });
export type ReorderResponse = z.infer<typeof ReorderResponseSchema>;
