import {
  RotatingText,
  RotatingTextContainer
} from "@tsu-stack/ui/components/animate-ui/primitives/texts/rotating";
import { cn } from "@tsu-stack/ui/lib/utils";

const helloGreetings = [
  "你好", // Mandarin Chinese
  "سَلَامٌ", // Arabic
  "Hello", // English
  "नमस्ते", // Hindi
  "Hola", // Spanish
  "Bonjour", // French
  "নমস্কার", // Bengali
  "Olá", // Portuguese
  "Halo", // Indonesian
  "привет", // Russian
  "Hallo", // German
  "こんにちは", // Japanese
  "xin chào", // Vietnamese
  "merhaba" // Turkish
];

export const HelloLoader = ({ className }: { className?: string }) => (
  <RotatingTextContainer
    text={helloGreetings}
    y={10}
    duration={700}
    delay={0}
    className={cn("text-3xl font-bold text-[#63BE7E]", className)}
  >
    <RotatingText />
  </RotatingTextContainer>
);
