import { SignupPolicyOutputSchema } from "@tsu-stack/core";
import { platformSettingRepository, userRepository } from "@tsu-stack/db";

import { publicProcedure } from "#@/lib/procedures/factory";

export const signupPolicyRouter = {
  get: publicProcedure
    .route({
      description: "Public signup gate: open vs invite-only after the first user",
      method: "GET"
    })
    .output(SignupPolicyOutputSchema)
    .handler(async () => {
      const [setting, userCount] = await Promise.all([
        platformSettingRepository.get(),
        userRepository.countUsers()
      ]);
      const signupMode = setting.signupMode === "open" ? "open" : "invite_only";
      return {
        signupMode,
        inviteRequired: signupMode === "invite_only" && userCount > 0
      };
    })
};
