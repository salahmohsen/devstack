import { BotIcon, SparklesIcon } from "lucide-react";
import { type ComponentType } from "react";
import {
  SiAlibabacloud,
  SiAnthropic,
  SiDeepseek,
  SiGithub,
  SiGoogle,
  SiGooglegemini,
  SiHuggingface,
  SiMistralai,
  SiMoonshotai,
  SiNvidia,
  SiOllama,
  SiPerplexity,
  SiVercel,
  SiX
} from "react-icons/si";

import { IntegrationBrandMark } from "@/shared/ui/integration-card";

type BrandIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

const BRAND: Record<string, { Icon: BrandIcon; className?: string }> = {
  anthropic: { Icon: SiAnthropic },
  google: { Icon: SiGooglegemini, className: "text-[#8E75B2]" },
  "github-models": { Icon: SiGithub },
  deepseek: { Icon: SiDeepseek, className: "text-[#4D6BFE]" },
  huggingface: { Icon: SiHuggingface, className: "text-[#FFD21E]" },
  perplexity: { Icon: SiPerplexity },
  vercel: { Icon: SiVercel },
  mistral: { Icon: SiMistralai, className: "text-[#FA520F]" },
  moonshotai: { Icon: SiMoonshotai },
  nvidia: { Icon: SiNvidia, className: "text-[#76B900]" },
  alibaba: { Icon: SiAlibabacloud, className: "text-[#FF6A00]" },
  xai: { Icon: SiX },
  ollama: { Icon: SiOllama },
  "ollama-cloud": { Icon: SiOllama },
  gemini: { Icon: SiGooglegemini, className: "text-[#8E75B2]" },
  "google-vertex": { Icon: SiGoogle, className: "text-[#4285F4]" }
};

export function ProviderBrandMark({ kind }: { kind: string }) {
  const brand = BRAND[kind];
  const Icon =
    brand?.Icon ??
    (kind === "openai" || kind === "opencode" || kind === "opencode-go" ? BotIcon : SparklesIcon);
  return (
    <IntegrationBrandMark>
      <Icon className={brand?.className ? `size-5 ${brand.className}` : "size-5"} aria-hidden />
    </IntegrationBrandMark>
  );
}
