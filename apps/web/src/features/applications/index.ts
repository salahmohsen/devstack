export {
  applicationsQueryKeys,
  getListApplicationsQueryOptions,
  useListApplicationsQuery
} from "@/features/applications/api/list-applications.query";
export { useCreateApplicationMutation } from "@/features/applications/api/create-application.mutation";
export { useUpdateApplicationMutation } from "@/features/applications/api/update-application.mutation";
export { useUpdateStageMutation } from "@/features/applications/api/update-stage.mutation";
export { useSetOutcomeMutation } from "@/features/applications/api/set-outcome.mutation";
export { useDeleteApplicationsMutation } from "@/features/applications/api/delete-applications.mutation";
export {
  APPLICATION_OPEN_BADGE_VARIANT,
  APPLICATION_OUTCOME_BADGE_VARIANT,
  APPLICATION_STAGE_BADGE_VARIANT,
  ApplicationApplyLinks,
  ApplicationApplyMethodBadge,
  ApplicationMatchScoreBadge,
  ApplicationStageBadge,
  ApplicationStatusBadge,
  type ApplicationBadgeVariant
} from "@/features/applications/ui/application-badges";
