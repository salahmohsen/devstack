import { defineRelationsPart } from "drizzle-orm";

import * as schema from "#@/schema/index";

export const relations = defineRelationsPart(schema, (_r) => {
  return {
    // TODO: Define your relations here
    // https://orm.drizzle.team/docs/relations-v2
  };
});
