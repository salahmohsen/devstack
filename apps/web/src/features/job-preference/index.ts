export {
  getJobPreferenceQueryOptions,
  jobPreferenceQueryKeys,
  useGetJobPreferenceQuery
} from "@/features/job-preference/api/get-job-preference.query";
export type { JobPreferenceQueryResult } from "@/features/job-preference/api/get-job-preference.query";

export { useUpsertJobPreferenceMutation } from "@/features/job-preference/api/upsert-job-preference.mutation";
export type {
  UpsertJobPreferenceInput,
  UpsertJobPreferenceMutationResult
} from "@/features/job-preference/api/upsert-job-preference.mutation";
