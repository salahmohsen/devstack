export const hubKeys = {
  all: ["hub"] as const,
  suspended: (threadId: string, resourceId: string) =>
    [...hubKeys.all, "suspended", threadId, resourceId] as const
};
