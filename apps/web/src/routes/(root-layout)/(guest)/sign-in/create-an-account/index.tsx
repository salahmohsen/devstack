import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

const legacySignupSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  invite: z.string().optional().catch(undefined)
});

/** Legacy URL — prefer `/sign-up`. */
export const Route = createFileRoute("/(root-layout)/(guest)/sign-in/create-an-account/")({
  validateSearch: zodValidator(legacySignupSearchSchema),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/sign-up",
      search: {
        ...(search.redirect ? { redirect: search.redirect } : {}),
        ...(search.invite ? { invite: search.invite } : {})
      },
      replace: true
    });
  }
});
