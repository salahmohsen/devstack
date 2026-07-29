import { z } from "zod";

/** What the human is confirming on /dashboard/review. */
export const ReviewItemKindSchema = z.enum(["reply_draft"]);
export type ReviewItemKind = z.infer<typeof ReviewItemKindSchema>;

/**
 * pending — waiting on user
 * confirmed — user approved (send may still be stubbed)
 * discarded — user rejected
 * sent — outbound completed (when send is wired)
 */
export const ReviewItemStatusSchema = z.enum(["pending", "confirmed", "discarded", "sent"]);
export type ReviewItemStatus = z.infer<typeof ReviewItemStatusSchema>;

export const ReviewItemListInputSchema = z.object({
  status: ReviewItemStatusSchema.optional().default("pending"),
  limit: z.number().int().min(1).max(100).optional().default(50)
});
export type ReviewItemListInput = z.infer<typeof ReviewItemListInputSchema>;

export const ReviewItemGetInputSchema = z.object({
  id: z.string().min(1)
});
export type ReviewItemGetInput = z.infer<typeof ReviewItemGetInputSchema>;

export const ReviewItemListItemSchema = z.object({
  id: z.string(),
  kind: ReviewItemKindSchema,
  status: ReviewItemStatusSchema,
  title: z.string(),
  preview: z.string(),
  messageId: z.string().nullable(),
  applicationId: z.string().nullable(),
  toEmail: z.string().nullable(),
  subject: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
export type ReviewItemListItem = z.infer<typeof ReviewItemListItemSchema>;

export const ReviewItemListOutputSchema = z.array(ReviewItemListItemSchema);
export type ReviewItemListOutput = z.infer<typeof ReviewItemListOutputSchema>;

export const ReviewItemDetailSchema = ReviewItemListItemSchema.extend({
  bodyText: z.string(),
  bodyHtml: z.string().nullable(),
  /** Linked mail subject when message still exists. */
  mailSubject: z.string().nullable().optional(),
  mailFromName: z.string().nullable().optional(),
  applicationCompanyName: z.string().nullable().optional(),
  applicationTitle: z.string().nullable().optional()
});
export type ReviewItemDetail = z.infer<typeof ReviewItemDetailSchema>;

export const CreateReplyDraftFromMailInputSchema = z.object({
  messageId: z.string().min(1)
});
export type CreateReplyDraftFromMailInput = z.infer<typeof CreateReplyDraftFromMailInputSchema>;

export const UpdateReviewItemInputSchema = z.object({
  id: z.string().min(1),
  bodyText: z.string().max(50_000).optional(),
  bodyHtml: z.string().max(100_000).nullable().optional(),
  subject: z.string().max(500).nullable().optional()
});
export type UpdateReviewItemInput = z.infer<typeof UpdateReviewItemInputSchema>;

export const ReviewItemIdInputSchema = z.object({
  id: z.string().min(1)
});
export type ReviewItemIdInput = z.infer<typeof ReviewItemIdInputSchema>;

export const ConfirmReviewItemOutputSchema = z.object({
  id: z.string(),
  status: ReviewItemStatusSchema,
  /** True when Full autonomy path would send; v1 may stub outbound. */
  sent: z.boolean(),
  note: z.string().optional()
});
export type ConfirmReviewItemOutput = z.infer<typeof ConfirmReviewItemOutputSchema>;
