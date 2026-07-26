export {
  getOnboardingStatusQueryOptions,
  onboardingQueryKeys,
  useGetOnboardingStatusQuery
} from "@/features/onboarding/api/get-onboarding-status.query";
export type { OnboardingStatusQueryResult } from "@/features/onboarding/api/get-onboarding-status.query";

export { useExtractResumeMutation } from "@/features/onboarding/api/extract-resume";

export {
  getApplyOnboardingMutationOptions,
  useApplyOnboardingMutation
} from "@/features/onboarding/api/apply-onboarding.mutation";
export type {
  ApplyOnboardingMutationResult,
  OnboardingApplyInput
} from "@/features/onboarding/api/apply-onboarding.mutation";

export {
  getSkipOnboardingMutationOptions,
  useSkipOnboardingMutation
} from "@/features/onboarding/api/skip-onboarding.mutation";
export type {
  OnboardingSkipInput,
  SkipOnboardingMutationResult
} from "@/features/onboarding/api/skip-onboarding.mutation";

export {
  getDiscardSourceMutationOptions,
  useDiscardSourceMutation
} from "@/features/onboarding/api/discard-source.mutation";
export type {
  DiscardSourceMutationResult,
  OnboardingDiscardSourceInput
} from "@/features/onboarding/api/discard-source.mutation";
