import { protectedProcedure } from "#@/lib/procedures/factory";
import { privateGithubRouter } from "#@/routers/private/github/index";

export const privateRouter = {
  data: protectedProcedure
    .route({
      description: "Test retrieving private data for authenticated users",
      method: "GET"
    })
    .handler(({ context }) => {
      return {
        message: "This is private",
        user: context.session.user
      };
    }),
  github: privateGithubRouter
};
