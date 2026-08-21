export {
  getJobPreferenceQueryOptions,
  jobPreferenceQueryKeys,
  useGetJobPreferenceQuery
} from "@/features/job-preference/api/get-job-preference.query";
export type { JobPreferenceQueryResult } from "@/features/job-preference/api/get-job-preference.query";

export { useResetBoardScoresTodayMutation } from "@/features/job-preference/api/reset-board-scores-today.mutation";
export { useUpsertJobPreferenceMutation } from "@/features/job-preference/api/upsert-job-preference.mutation";
export type {
  UpsertJobPreferenceInput,
  UpsertJobPreferenceMutationResult
} from "@/features/job-preference/api/upsert-job-preference.mutation";

export {
  JobPreferenceFormSchema,
  emptyJobPreferenceForm,
  jobPreferenceFormFromQuery,
  jobPreferenceInputFromForm,
  type JobPreferenceFormState
} from "@/features/job-preference/lib/job-preference-form";
export { JobPreferenceFields } from "@/features/job-preference/ui/job-preference-fields";
