import { z } from "zod";

import { contactOutputSchema } from "@tsu-stack/core";
import { contactRepository } from "@tsu-stack/db";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { toContactOutput } from "#@/routers/portfolio.mappers";

export const portfolioContactRouter = {
  get: protectedProcedure
    .route({
      description: "Get the contact info",
      method: "GET"
    })
    .output(z.array(contactOutputSchema))
    .handler(async ({ context }) => {
      context.logger.set({ route: "portfolio.contact.get" });
      const userId = context.session.user.id;
      const contacts = await contactRepository.findByUserId(userId);

      return contacts?.map((c) => toContactOutput(c)) ?? [];
    })
};
