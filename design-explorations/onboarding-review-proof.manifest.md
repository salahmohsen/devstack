# onboarding-review-proof — data manifest

Real record sampled from the live running app (user's actual dense draft, screenshot 2026-09-08). Draft shape: `ResumeImportDraft` (`packages/core/src/onboarding/types.ts`).

| Element                                                   | Field path                                                              | Class                                                 | Count     |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- | --------- |
| Doc name / headline / contacts line                       | `draft.profile.name`, `cv.headline` (derived), `draft.profile.contacts` | ✅ Real                                               | 1 / 1 / 3 |
| Summary paragraph                                         | `draft.profile.summary`                                                 | ✅ Real                                               | 1         |
| Experience rows (Mostaql, KHOSHT, One Solution)           | `draft.experiences[]` → title/organization/dates/bullets                | ✅ Real                                               | 3/3       |
| Education section                                         | `draft.educations[]`                                                    | ✅ Real (empty — placeholder state is the real state) | 0/0       |
| Certifications section                                    | `draft.certifications[]`                                                | ✅ Real (empty)                                       | 0/0       |
| Project rows (DEVSTOCK, Edge Invocation Center, +2)       | `draft.projects[]`                                                      | ✅ Real                                               | 4/4       |
| Skills grouped list                                       | `draft.stacks[]` → groupStacksByType                                    | ✅ Real                                               | 19/19     |
| Rail/tab tick counts                                      | computed `counts` over selected rows                                    | ✅ Real (computed)                                    | always    |
| Footer "N of M selected · Source · file"                  | `totalSelected`, `draft.meta.sourceFilename`                            | ✅ Real                                               | always    |
| Portfolio switch per experience/project/stack row         | `includedInPortfolio`                                                   | ✅ Real                                               | per row   |
| "Add anytime from the dashboard" missing-section copy     | designed placeholder                                                    | ✅ Real copy (spec-locked)                            | —         |
| Step rail (AI → Resume → Review → Jobs → Connect → Ready) | `ONBOARDING_DESTINATION_STEPS`                                          | ✅ Real                                               | 6 stops   |

No aspirational elements — every element above exists in the implemented branch.
