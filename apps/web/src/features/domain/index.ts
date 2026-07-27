export {
  domainQueryKeys,
  getCustomDomainQueryOptions,
  useGetCustomDomainQuery
} from "@/features/domain/api/get-custom-domain.query";
export type { CustomDomainQueryResult } from "@/features/domain/api/get-custom-domain.query";

export {
  getSetCustomDomainMutationOptions,
  useSetCustomDomainMutation
} from "@/features/domain/api/set-custom-domain.mutation";
export type {
  SetCustomDomainInput,
  SetCustomDomainMutationResult
} from "@/features/domain/api/set-custom-domain.mutation";

export {
  getVerifyCustomDomainMutationOptions,
  useVerifyCustomDomainMutation
} from "@/features/domain/api/verify-custom-domain.mutation";
export type { VerifyCustomDomainMutationResult } from "@/features/domain/api/verify-custom-domain.mutation";

export {
  getRemoveCustomDomainMutationOptions,
  useRemoveCustomDomainMutation
} from "@/features/domain/api/remove-custom-domain.mutation";
export type { RemoveCustomDomainMutationResult } from "@/features/domain/api/remove-custom-domain.mutation";

export { getResolvePublicPortfolioQueryOptions } from "@/features/domain/api/resolve-public-portfolio.query";
export type { ResolvePublicPortfolioQueryResult } from "@/features/domain/api/resolve-public-portfolio.query";
