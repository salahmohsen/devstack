export type HubSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

export const HUB_SUGGESTIONS: HubSuggestion[] = [
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
