export {
  getListMailQueryOptions,
  mailQueryKeys,
  useListMailQuery,
  type ListMailInput,
  type ListMailQueryResult
} from "@/features/mail/api/list-mail.query";
export {
  getMailQueryOptions,
  useGetMailQuery,
  type GetMailQueryResult
} from "@/features/mail/api/get-mail.query";
export { useUndoMailCrmApplyMutation } from "@/features/mail/api/undo-mail-crm-apply.mutation";
export { useCorrectMailClassificationMutation } from "@/features/mail/api/correct-classification.mutation";
export { useGenerateMailReplyMutation } from "@/features/mail/api/generate-reply.mutation";
export { useSendMailReplyMutation } from "@/features/mail/api/send-reply.mutation";
export { MailBody } from "@/features/mail/ui/mail-body";
