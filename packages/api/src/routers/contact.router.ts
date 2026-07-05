import { z } from "zod";

import { contactOutputSchema } from "@tsu-stack/core";
import { contactRepository, userRepository } from "@tsu-stack/db";

import { publicProcedure } from "#@/lib/procedures/factory";
import { toContactOutput } from "#@/routers/portfolio.mappers";

export const portfolioContactRouter = {
  get: publicProcedure
    .route({
      description: "Get the contact info",
      method: "GET"
    })
    .output(z.array(contactOutputSchema))
    .handler(async ({ context }) => {
      context.logger.set({ route: "portfolio.contact.get" });
      const userRow = await userRepository.findFirst();
      if (!userRow) {
        throw new Error("Session references a user that no longer exists");
      }
      const adminContacts = await contactRepository.findByUserId(userRow.id);

      return adminContacts?.map((c) => toContactOutput(c)) ?? [];
    })
};
