# Hub conversation cycles (quality 1–100)

Use this after a live hub Thread conversation — not as a substitute for unit seams. Product lock: one thread per user, so a **cycle** is a new persona + a long multi-turn (cancel leftover HITL cards first). Do not ask for tools by name. Everyday language only.

## Rubric (sum = 100)

Score each axis 0–20. Half points allowed. Write the number **and** one sentence of evidence.

| Axis                   | 20                                                                                        | 10                                             | 0                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Tool chain**         | Right tools in order for a packed ask (brief / search / list / inspect / one propose)     | Partial chain; one missed read                 | Wrong family (apply tools, invented ids, empty `get`) or no tools when a write/read was needed            |
| **HITL discipline**    | One waiting card; Confirm writes; no same-entity re-propose; no promised-but-missing card | Extra card hidden/cancelled quickly            | Stack of cards, composer stuck, or “here’s a card” with no tool                                           |
| **Everyday voice**     | Translates silently; no product coaching                                                  | One leak of tool/feature names                 | Quizzes the user on New jobs / File Diff / stacks                                                         |
| **Multi-ask coverage** | Every clause in the packed utterance is handled or queued in speech                       | Drops one clause                               | Answers one slice and forgets the rest                                                                    |
| **Shared-state truth** | Chat matches DB/list/inspect after Confirm; project copy matches `analysis`               | Chat right, second surface stale until refresh | Claims persist that did not land, invented project copy, or “no experiences” when a project title matches |

**Pass bar:** 70+ and no axis at 0. Below 70 → fix the owning layer (prompt, processor, card hide, resume) before the next cycle.

## Cycle procedure

1. Cancel leftover waiting cards. Do not reuse the previous persona’s last ask.
2. Stay in character for **at least 4 user turns** (packed first ask + follow-ups). Do not coach the agent.
3. Fill the log row. Name the tools you _saw_ (network / activity strip / cards), not what you hoped.
4. Adjust code or supervisor text for the worst axis. Re-run the **same** failure class on the next persona.
5. Prepend a [LESSONS.md](LESSONS.md) finding if a new class appeared.
6. If the agent lacked a tool (or invented project copy without `analysis`), add a row to [tool-gaps.md](tool-gaps.md).

## Personas (rotate)

1. Overwhelmed seeker — rambling, stacks several worries in one message
2. Skeptical senior — terse, pokes at contradictions
3. Non-native / vague — workplace nicknames, mixed tense, no product words

## Log

| Cycle | Date       | Persona                                                                                                                      | Score  | Tool chain | HITL | Voice | Multi-ask | Truth | Adjustment after                                                                                                                                                                                  |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---- | ----- | --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13    | 2026-08-23 | Overwhelmed seeker → skeptical poke (packed Today+pile+DualEntry+skills+looking-for; Ment'ech open; bells not mail)          | **71** | 14         | 16   | 15    | 12        | 14    | Defer client HITL in union; company deal/going-on + pile force; looking-for gap; company need = successful result only; Ment'ech apostrophe normalize (needs agent restart); bells still unforced |
| 12    | 2026-08-18 | Average user after /new (job rules + packed today+skills; slash/mention UI)                                                  | **88** | 18         | 18   | 17    | 17        | 18    | hub_chat_epoch + /new; @ tools; File Diff + Today panel + stack catalog live on clean thread                                                                                                      |
| 11    | 2026-08-17 | Average user UI harden (packed today+skills+looking for; job rules; reasoning; stack catalog)                                | **72** | 12         | 14   | 15    | 12        | 19    | Union forced activeTools; Tool-not-found ≠ success; search-brief gather; text-only force stop; Thought collapses; I'm/skills detectors. File Diff still blocked by OM text-only refusals          |
| 10    | 2026-08-17 | Today harden (what’s up / what is new today / repeat ask)                                                                    | **78** | 16         | 15   | 16    | 14        | 17    | Panel opens from getDailyBrief; stop idle open loop; rolling 24h; facts-hash cache; hide Today chat; skip triage remount on Today                                                                 |
| 9     | 2026-08-17 | Non-native / vague (catch me up + trivelta + mentech + looking for; inspect/brief poke; mail+pile; RAYA+bells; unread+floor) | **75** | 15         | 14   | 16    | 13        | 17    | Hide-after Today no longer swallows later tools; remount-cancel retries; pile status-only skips triage; packed Today can still inspect/CRM after the letter                                       |
| 8     | 2026-08-17 | Skeptical senior (plate + trivelta + pile; leftover letter; mentech vs one solution; RAYA source)                            | **77** | 16         | 14   | 15    | 14        | 18    | Today mid-utterance (`actually on my plate`); do not triage yes/no pile; company processor live-proven                                                                                            |
| 7     | 2026-08-17 | Average English (what we have today + trivelta + pile)                                                                       | **74** | 13         | 15   | 17    | 12        | 17    | Match `what we have today`; retry walk-back; company-status processor added (not live-proven)                                                                                                     |
| 6     | 2026-08-17 | Overwhelmed / average English (Today + Trivelta + Ment'ech)                                                                  | **76** | 14         | 16   | 17    | 11        | 18    | Today processor + this-turn HITL; inspect processor; Today yields to inspect; hide processor leaks                                                                                                |
| 5     | 2026-08-17 | New jobs + tracked (everyday)                                                                                                | **75** | 14         | 16   | 16    | 12        | 17    | `searchApplications` + `explainApplicationVsPrefs` used; find-jobs-now still swallows/remounts spoken answers                                                                                     |
| 4     | 2026-08-17 | Accuracy / no invented copy                                                                                                  | **82** | 15         | 18   | 16    | 16        | 17    | `getProject` outline not 8k blob; Confirm grounds summary in analysis                                                                                                                             |
| 3     | 2026-08-16 | Non-native / Franco-Arabic                                                                                                   | **91** | 18         | 19   | 17    | 19        | 18    | Map Franco-Arabic silently; empty pile → list only, no triage                                                                                                                                     |
| 2     | 2026-08-16 | Skeptical senior                                                                                                             | **87** | 17         | 18   | 15    | 18        | 19    | Never dump full listExperiences into chat; get the named row only                                                                                                                                 |
| 1     | 2026-08-16 | Overwhelmed seeker                                                                                                           | **77** | 16         | 14   | 16    | 13        | 18    | Inspect is terminal; same-entity hide after Cancel; speak mail/project after brief on packed asks                                                                                                 |
| —     | —          | —                                                                                                                            | —      | —          | —    | —     | —         | —     | —                                                                                                                                                                                                 |

Newest cycles stay at the **top** of the log (insert a row above older ones). Keep this table the source of trend (“did this prompt change raise the score?”).
