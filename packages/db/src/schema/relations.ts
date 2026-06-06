import { defineRelationsPart } from "drizzle-orm";

import * as schema from "#@/schema/index";

export const relations = defineRelationsPart(schema, (r) => {
  return {
    appSettings: {
      user: r.one.user({
        from: r.appSettings.userId,
        to: r.user.id
      })
    }
  };
});
