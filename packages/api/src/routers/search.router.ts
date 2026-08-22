import { SearchEntitiesInputSchema, SearchEntitiesOutputSchema } from "@tsu-stack/core";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { searchEntitiesForUser } from "#@/routers/search.queries";

export const searchRouter = {
  entities: protectedProcedure
    .route({
      description: "Authenticated command-palette jumps to dashboard list rows",
      method: "GET"
    })
    .input(SearchEntitiesInputSchema)
    .output(SearchEntitiesOutputSchema)
    .handler(async ({ input, context }) => searchEntitiesForUser(context.session.user.id, input))
};
