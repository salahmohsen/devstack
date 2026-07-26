import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { OrganizeStacksInputSchema } from "@tsu-stack/core";

import {
  MergeActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

export const findMerges = createStep({
  id: "find-merges",
  description: "Deterministically finds stacks to merge by npm scope and known package families",
  inputSchema: OrganizeStacksInputSchema,
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema)
  }),
  execute: async ({ inputData }) => {
    const { stacks } = inputData;

    if (stacks.length === 0) {
      return { stacks, mergeActions: [] };
    }

    // Group stacks by npm scope (e.g., all @heroui/* together)
    const scopeGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number }>
    >();
    const familyGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number; pkg: string }>
    >();

    // Known same-project package families (non-scoped packages from the same library)
    const sameProjectGroups = [
      ["react", "react-dom", "@types/react", "@types/react-dom"],
      ["next", "@types/next"],
      [
        "vue",
        "@vue/compiler-sfc",
        "@vue/runtime-dom",
        "@vue/runtime-core",
        "@vue/shared",
        "@types/vue"
      ],
      ["svelte", "@sveltejs/kit", "@sveltejs/vite-plugin-svelte"],
      [
        "@angular/core",
        "@angular/common",
        "@angular/compiler",
        "@angular/platform-browser",
        "@angular/platform-browser-dynamic",
        "@angular/router",
        "@angular/forms",
        "@angular/animations",
        "@angular/cdk"
      ],
      ["prisma", "@prisma/client"],
      ["drizzle-orm", "drizzle-kit", "drizzle-zod", "drizzle-valibot"],
      ["vite", "@vitejs/plugin-react", "@vitejs/plugin-vue", "@vitejs/plugin-svelte"],
      ["typescript", "@types/node"],
      ["eslint", "@typescript-eslint/parser", "@typescript-eslint/eslint-plugin"],
      ["tailwindcss", "postcss", "autoprefixer"],
      ["vitest", "@vitest/ui", "@vitest/coverage-v8"],
      ["jest", "@jest/globals", "ts-jest", "babel-jest"],
      ["@testing-library/react", "@testing-library/jest-dom", "@testing-library/user-event"],
      ["@storybook/react", "@storybook/react-vite"],
      [
        "embla-carousel",
        "embla-carousel-react",
        "embla-carousel-autoplay",
        "embla-carousel-wheel-gestures"
      ],
      ["redux", "react-redux", "@reduxjs/toolkit"],
      ["react-router", "react-router-dom"],
      ["react-hook-form", "@hookform/resolvers"],
      ["zod", "zod-to-json-schema", "zod-validation-error"],
      ["next-auth", "@auth/core", "@auth/prisma-adapter"],
      ["better-auth", "@better-auth/core"],
      ["@trpc/server", "@trpc/client", "@trpc/react-query", "@trpc/next"],
      ["@tanstack/react-query", "@tanstack/react-query-devtools"],
      ["@tanstack/react-router", "@tanstack/router-devtools"],
      ["ai", "@ai-sdk/react", "@ai-sdk/openai", "@ai-sdk/anthropic", "@ai-sdk/google"],
      ["@supabase/supabase-js", "@supabase/auth-helpers-nextjs", "@supabase/ssr"],
      ["firebase", "firebase-admin"],
      ["lucide-react", "lucide-vue-next", "lucide-svelte"],
      ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/modifiers", "@dnd-kit/utilities"],
      ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
      ["@inlang/cli", "@inlang/paraglide-js", "@inlang/plugin-m-function-calls"],
      ["@lottiefiles/dotlottie-react", "@lottiefiles/lottie-player"],
      ["date-fns", "date-fns-tz"],
      ["axios", "axios-retry"],
      ["react-leaflet", "leaflet", "@types/leaflet"],
      ["styled-components", "@types/styled-components"],
      ["@emotion/react", "@emotion/styled"],
      ["lodash", "@types/lodash"],
      ["clsx", "tailwind-merge", "class-variance-authority"],
      ["tailwind-merge", "tailwind-variants"],
      ["webpack", "webpack-cli", "webpack-dev-server"],
      [
        "rollup",
        "@rollup/plugin-commonjs",
        "@rollup/plugin-node-resolve",
        "@rollup/plugin-typescript"
      ],
      ["playwright", "@playwright/test"],
      ["@grpc/grpc-js", "@grpc/proto-loader"],
      ["socket.io", "socket.io-client"],
      ["ws", "@types/ws"]
    ];

    // Case/spacing-insensitive exact-name duplicates (e.g. "React" + "react")
    const exactNameGroups = new Map<
      string,
      Array<{ id: string; name: string; projectCount: number }>
    >();

    for (const stack of stacks) {
      const nameKey = stack.name.trim().toLowerCase().replace(/\s+/g, " ");
      if (!exactNameGroups.has(nameKey)) exactNameGroups.set(nameKey, []);
      exactNameGroups.get(nameKey)!.push({
        id: stack.id,
        name: stack.name,
        projectCount: stack.projectCount
      });

      // Group by npm scope (derive from stack name as a heuristic)
      const pkg = stack.name.toLowerCase().replace(/\s+/g, "");
      if (pkg.startsWith("@")) {
        const scope = pkg.split("/")[0];
        if (scope) {
          if (!scopeGroups.has(scope)) scopeGroups.set(scope, []);
          scopeGroups.get(scope)!.push({
            id: stack.id,
            name: stack.name,
            projectCount: stack.projectCount
          });
        }
      }

      // Group by known family
      for (const family of sameProjectGroups) {
        if (
          family.some(
            (f) => f.toLowerCase() === pkg || f.toLowerCase() === stack.name.toLowerCase()
          )
        ) {
          if (!familyGroups.has(family.join(","))) {
            familyGroups.set(family.join(","), []);
          }
          familyGroups.get(family.join(","))!.push({
            id: stack.id,
            name: stack.name,
            projectCount: stack.projectCount,
            pkg
          });
          break;
        }
      }
    }

    // Build merge actions: for each group with 2+ members, keep the one with most projects as survivor
    const mergeActions: z.infer<typeof MergeActionSchema>[] = [];
    const usedAsVictim = new Set<string>();

    function addMerges(
      group: Array<{ id: string; name: string; projectCount: number }>,
      reason: string
    ) {
      if (group.length < 2) return;

      // Sort by projectCount desc, then alphabetically
      const sorted = [...group].toSorted(
        (
          a: { id: string; name: string; projectCount: number },
          b: { id: string; name: string; projectCount: number }
        ) => {
          const diff = b.projectCount - a.projectCount;
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }
      );

      const survivor = sorted[0];
      if (!survivor) return;

      for (let i = 1; i < sorted.length; i++) {
        const victim = sorted[i];
        if (!victim) continue;
        // Each stack can only be victim ONCE (no chains), but SAME survivor can have multiple
        if (usedAsVictim.has(victim.id)) continue;
        if (victim.id === survivor.id) continue;
        usedAsVictim.add(victim.id);
        mergeActions.push({
          victimId: victim.id,
          victimName: victim.name,
          survivorId: survivor.id,
          survivorName: survivor.name,
          reason
        });
      }
    }

    // Exact-name duplicates first (highest confidence)
    for (const [, group] of exactNameGroups) {
      if (group.length < 2) continue;
      addMerges(group, `Duplicate name: "${group[0]?.name}"`);
    }

    for (const [scope, group] of scopeGroups) {
      addMerges(group, `All ${scope}/* packages are the same library`);
    }

    for (const [family, group] of familyGroups) {
      addMerges(group, `Same project: ${family}`);
    }

    return { stacks, mergeActions };
  }
});
