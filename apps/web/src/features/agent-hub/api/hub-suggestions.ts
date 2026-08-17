export type HubSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

/**
 * Empty-state chips. Only everyday asks the supervisor already handles
 * (Today, search brief, pile, mail). No detect/organize/catalog dumps.
 */
export const HUB_SUGGESTIONS: HubSuggestion[] = [
  {
    id: "today",
    label: "What do you have today?",
    prompt: "What do you have for me today?"
  },
  {
    id: "looking-for",
    label: "What am I looking for?",
    prompt: "What am I looking for?"
  },
  {
    id: "pile",
    label: "Anything in the pile?",
    prompt: "Anything new in the pile? Don't file anything."
  },
  {
    id: "mail",
    label: "Any mail that matters?",
    prompt: "Any important mail, or just noise?"
  }
];

/** `AuiConfig` / `Suggestions()` entries — title is the chip, prompt is sent. */
export const HUB_AUI_SUGGESTIONS = HUB_SUGGESTIONS.map((suggestion) => {
  return {
    title: suggestion.label,
    label: "",
    prompt: suggestion.prompt
  };
});
