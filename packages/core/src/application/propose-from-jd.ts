import { z } from "zod";

export const ProposeApplicationFromJdInputSchema = z.object({
  title: z.string().min(1).max(300),
  companyName: z.string().min(1).max(200),
  description: z.string().min(1).max(50_000),
  url: z.string().url().optional().nullable(),
  applyUrl: z.string().url().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  matchScore: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
export type ProposeApplicationFromJdInput = z.infer<typeof ProposeApplicationFromJdInputSchema>;

export const ProposeApplicationFromJdOutputSchema = z.object({
  action: z.enum(["package", "save", "dismiss"]),
  edits: z
    .object({
      title: z.string().optional(),
      companyName: z.string().optional(),
      url: z.string().optional()
    })
    .optional()
});
export type ProposeApplicationFromJdOutput = z.infer<typeof ProposeApplicationFromJdOutputSchema>;
