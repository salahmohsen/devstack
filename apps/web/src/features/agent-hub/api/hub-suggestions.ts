export type HubSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

export const HUB_SUGGESTIONS: HubSuggestion[] = [
  {
    id: "today",
    label: "What do you have for me today?",
    prompt: "What do you have for me today?"
  },
  {
    id: "paste-jd",
    label: "Paste a job description…",
    prompt:
      "I want to track a job from a description. Call propose-application-from-jd with the job text I paste next (or extract from this message if I already included the JD)."
  },
  { id: "scan-repos", label: "Scan repos", prompt: "Scan my repos and detect tech stacks" },
  { id: "organize", label: "Organize stacks", prompt: "Organize and deduplicate my stack catalog" },
  {
    id: "find-deps",
    label: "Find dependencies",
    prompt: "What are the most common dependencies across my projects?"
  },
  {
    id: "summary",
    label: "Project summary",
    prompt: "Give me a summary of all my projects and their tech stacks"
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
