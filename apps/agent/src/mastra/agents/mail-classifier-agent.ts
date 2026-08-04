import { Agent } from "@mastra/core/agent";
import { createSkill } from "@mastra/core/skills";

import {
  enabledSmartRulesForClassify,
  formatUserSmartFiltersSkillInstructions,
  type MailClassifySmartRule
} from "@tsu-stack/core";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { MAIL_CLASSIFICATION_SKILL_PATH, WRITE_SKILLS_PATH } from "#@/mastra/skills-paths";

/** requestContext key for tenant smart filters (set per generate call). */
export const USER_SMART_FILTERS_CTX = "userSmartFilters";

export function createMailClassifierAgent() {
  return new Agent({
    id: "mail-classifier",
    name: "Mail Classifier",
    description:
      "Assigns Career Inbox system labels and user smart-filter labels via AI skills only.",
    instructions: `You classify Career Inbox email.

Before labeling:
1. Activate **mail-classification** (system labels).
2. If **user-smart-filters** is available, activate it and assign any matching \`rule:{slug}\` filters.
3. Use **write-skills** only when authoring/editing skill packages (rare).

Rules:
- You are the only classifier — no keyword engine runs after you.
- At most ONE primary system label (or null).
- Zero or more user smart filters from the injected list only.
- Return structured output via the schema (systemLabel + smartRuleSlugs).`,
    skills: ({ requestContext }) => {
      const skills: Array<string | ReturnType<typeof createSkill>> = [
        WRITE_SKILLS_PATH,
        MAIL_CLASSIFICATION_SKILL_PATH
      ];

      const raw = requestContext?.get(USER_SMART_FILTERS_CTX) as
        | MailClassifySmartRule[]
        | undefined;
      const rules = enabledSmartRulesForClassify(raw);
      if (rules.length > 0) {
        skills.push(
          createSkill({
            name: "user-smart-filters",
            description:
              "User-defined Career Inbox smart filters for this tenant and run. Activate when deciding which rule:{slug} labels apply. Dynamically injected each classify call.",
            instructions: formatUserSmartFiltersSkillInstructions(rules)
          })
        );
      }

      return skills;
    },
    model: byoModelFromRequestContext
  });
}

export default createMailClassifierAgent;
