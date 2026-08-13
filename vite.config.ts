import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite-plus";

/** Monorepo root — oxlint-tailwind entryPoints must not depend on process.cwd(). */
const monorepoRoot = dirname(fileURLToPath(import.meta.url));
const uiGlobalsCss = resolve(monorepoRoot, "packages/ui/styles/globals.css");
const webAppCss = resolve(monorepoRoot, "apps/web/src/shared/styles/app.css");

const fsdEslintPluginOptions = {
  rootPath: "/apps/web/src/",
  alias: {
    value: "@",
    withSlash: true
  },
  layers: {
    app: {
      pattern: "routes"
    },
    pages: {
      pattern: "pages"
    },
    widgets: {
      pattern: "widgets"
    },
    features: {
      pattern: "features"
    },
    entities: {
      pattern: "entities"
    },
    shared: {
      pattern: "shared"
    }
  },
  ignoreImportPatterns: ["\\.css$"]
};

/**
 * Defines top-level Vite+ configurations for the different tools in its ecosystem.
 * @see {@link https://viteplus.dev/config}
 */
export default defineConfig({
  // Commit hooks - https://viteplus.dev/guide/commit-hooks
  // Format everything first (incl. markdown tables). Lint --fix only on code so
  // docs-only commits are not rejected with "No files found to lint".
  staged: {
    "*": "vp fmt --write",
    "*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}": "vp check --fix --no-fmt"
  },

  // Vitest - https://vitest.dev/config
  // Prefer package-local `test:unit` (`vp run -r test:unit`). Root config is a fallback.
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.output/**",
      "**/.worktrees/**",
      "**/coverage/**"
    ]
  },

  // Oxfmt - https://oxc.rs/docs/guide/usage/formatter/config.html
  fmt: {
    ignorePatterns: [
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "bun.lock",
      "routeTree.gen.ts",
      ".tanstack-start/",
      ".tanstack/",
      "drizzle/",
      "migrations/",
      ".drizzle/",
      ".cache",
      "worker-configuration.d.ts",
      ".vercel",
      ".output",
      ".wrangler",
      ".netlify",
      "dist"
    ],
    sortImports: {
      customGroups: [
        {
          elementNamePattern: ["@tsu-stack/**"],
          groupName: "@tsu-stack"
        },
        {
          elementNamePattern: ["@/pages/**"],
          groupName: "pages"
        },
        {
          elementNamePattern: ["@/widgets/**"],
          groupName: "widgets"
        },
        {
          elementNamePattern: ["@/features/**"],
          groupName: "features"
        },
        {
          elementNamePattern: ["@/entities/**"],
          groupName: "entities"
        },
        {
          elementNamePattern: ["@/shared/**"],
          groupName: "shared"
        }
      ],
      groups: [
        "builtin",
        "external",
        "@tsu-stack",
        "shared",
        "entities",
        "features",
        "widgets",
        "pages",
        ["internal", "subpath"],
        ["parent", "sibling", "index"],
        "style",
        "unknown"
      ],
      internalPattern: ["@/", "#@/", "~/", "~~/", "#"],
      sortSideEffects: true
    },
    sortPackageJson: true,
    sortTailwindcss: {
      attributes: ["class", "className"],
      functions: ["clsx", "cn", "cva", "tw"],
      // Prefer app entry (imports full UI chain + app tokens) for class sorting
      stylesheet: "./apps/web/src/shared/styles/app.css"
    },
    trailingComma: "none"
  },

  // Oxlint - https://oxc.rs/docs/guide/usage/linter/config
  lint: {
    env: {
      browser: true,
      builtin: true,
      node: true
    },
    ignorePatterns: [
      "dist",
      ".wrangler",
      ".vercel",
      ".netlify",
      ".output",
      "build/",
      "worker-configuration.d.ts",
      "scripts/",
      "*.md"
    ],

    jsPlugins: [
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
      /**
       * FIXME: Plugins with "/" in name have to be aliased for now
       * @see {@link https://github.com/oxc-project/oxc/issues/14557}
       */
      {
        name: "eslint-tanstack-router",
        specifier: "@tanstack/eslint-plugin-router"
      },
      {
        name: "eslint-tanstack-query",
        specifier: "@tanstack/eslint-plugin-query"
      },
      { name: "fsd", specifier: "eslint-plugin-fsd-lint" },
      "oxlint-tailwindcss"
    ],
    settings: {
      /**
       * Absolute CSS paths: relative entryPoints resolve against oxlint cwd, so
       * package-local `vp check` from apps/web looked for
       * `apps/web/packages/ui/styles/globals.css` and failed. Absolute paths work
       * from root and from package packages. Extra globs cover cwd-relative paths
       * when linting inside apps/web (`src/**`) or packages/ui.
       */
      tailwindcss: {
        entryPoint: [
          { files: "packages/ui/**", use: uiGlobalsCss },
          { files: "**/packages/ui/**", use: uiGlobalsCss },
          { files: "apps/web/**", use: webAppCss },
          // When `vp check` runs with cwd=apps/web, files are `src/...` not `apps/web/...`
          { files: "src/**", use: webAppCss },
          { files: "**", use: uiGlobalsCss }
        ]
      }
    },
    options: { typeAware: true, typeCheck: true },
    plugins: [
      "eslint",
      "react",
      "react-perf",
      "jsx-a11y",
      "typescript",
      "import",
      "promise",
      "jest",
      "unicorn"
    ],

    rules: {
      // Tanstack Router rules, ref: https://tanstack.com/router/latest/docs/eslint/eslint-plugin-router
      "eslint-tanstack-router/create-route-property-order": "error",
      // Tanstack Query rules, ref: https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query
      "eslint-tanstack-query/exhaustive-deps": "error",
      "eslint-tanstack-query/no-rest-destructuring": "error",
      "eslint-tanstack-query/stable-query-client": "error",
      "eslint-tanstack-query/no-unstable-deps": "error",
      "eslint-tanstack-query/infinite-query-property-order": "error",
      "eslint-tanstack-query/no-void-query-fn": "warn",
      "eslint-tanstack-query/mutation-property-order": "error",
      "eslint-tanstack-query/prefer-query-options": "warn",

      // Recommended rules (from LintRulePreset.Recommended)
      // ref: https://github.com/TheAlexLichter/oxlint-react-compiler-rules/issues/1
      "react-hooks-js/component-hook-factories": "error",
      "react-hooks-js/config": "error",
      "react-hooks-js/error-boundaries": "error",
      "react-hooks-js/gating": "error",
      "react-hooks-js/globals": "error",
      "react-hooks-js/immutability": "error",
      "react-hooks-js/incompatible-library": "error",
      "react-hooks-js/preserve-manual-memoization": "error",
      "react-hooks-js/purity": "error",
      "react-hooks-js/refs": "error",
      "react-hooks-js/set-state-in-effect": "warn",
      "react-hooks-js/set-state-in-render": "error",
      "react-hooks-js/static-components": "error",
      "react-hooks-js/unsupported-syntax": "error",
      "react-hooks-js/use-memo": "error",

      // Recommended-latest rules (from LintRulePreset.RecommendedLatest)
      "react-hooks-js/void-use-memo": "error",

      // Off rules (LintRulePreset.Off) - not enabled by default
      "react-hooks-js/capitalized-calls": "off",
      "react-hooks-js/fbt": "off",
      "react-hooks-js/hooks": "off",
      "react-hooks-js/invariant": "off",
      "react-hooks-js/memoized-effect-dependencies": "off",
      "react-hooks-js/no-deriving-state-in-effects": "off",
      "react-hooks-js/rule-suppression": "off",
      "react-hooks-js/syntax": "off",
      "react-hooks-js/todo": "off",

      // You can add more rules from: https://oxc.rs/docs/guide/usage/linter/rules.html?sort=fix&dir=asc&has_fix=true
      "eslint/arrow-body-style": ["error", "as-needed", { requireReturnForObjectLiteral: true }],
      "typescript/ban-ts-comment": "error",
      "typescript/consistent-indexed-object-style": ["error", "record"],
      "jest/consistent-test-it": ["error", { fn: "it" }],
      "typescript/consistent-type-definitions": ["error", "type"],
      "typescript/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports", prefer: "type-imports" }
      ],
      "import/consistent-type-specifier-style": ["error", "prefer-inline"],
      "eslint/curly": ["error", "multi-line"],
      "unicorn/escape-case": "warn",
      "unicorn/explicit-length-check": "warn",
      "react/jsx-fragments": ["error", "syntax"],
      "react/jsx-props-no-spread-multi": "error",
      "jsx-a11y/no-aria-hidden-on-focusable": "error",
      "unicorn/no-array-reverse": "warn",
      "unicorn/no-array-sort": "warn",
      "eslint/no-console": ["warn", { allow: ["debug"] }],
      "eslint/no-else-return": "error",
      "typescript/no-explicit-any": ["error", { fixToUnknown: true, ignoreRestArgs: true }],
      "promise/no-new-statics": "error",
      "jsx-a11y/no-redundant-roles": "error",
      "import/no-relative-parent-imports": "error",
      "eslint/no-var": "warn",
      "unicorn/prefer-array-flat-map": "error",
      "eslint/prefer-const": "warn",
      "typescript/prefer-nullish-coalescing": "error",
      "eslint/prefer-object-spread": "error",
      "eslint/prefer-spread": "warn",
      "unicorn/switch-case-braces": ["error", "avoid"],
      "typescript/switch-exhaustiveness-check": "error",
      "unicorn/throw-new-error": "error",
      "jest/valid-title": "error",
      "eslint/yoda": "warn",
      "import/no-duplicates": "warn",
      //https://oxlint-tailwindcss.pages.dev/setup

      // Correctness — catch real bugs
      "tailwindcss/no-conflicting-classes": "error",
      "tailwindcss/no-deprecated-classes": "error",
      "tailwindcss/no-duplicate-classes": "warn",
      "tailwindcss/no-unknown-classes": "off",

      // Modernization — keep classes in current canonical form
      "tailwindcss/enforce-canonical": "warn",
      "tailwindcss/no-unnecessary-arbitrary-value": "warn",

      // Style and consistency
      "tailwindcss/enforce-sort-order": "off", // sortTailwindcss already handle this
      "tailwindcss/consistent-variant-order": "warn",
      "tailwindcss/enforce-consistent-important-position": "warn",
      "tailwindcss/no-unnecessary-whitespace": "warn"
    },

    overrides: [
      {
        files: ["apps/**"],
        jsPlugins: [{ name: "fsd", specifier: "eslint-plugin-fsd-lint" }],
        rules: {
          /**
           * Feature Sliced Design (FSD) architecture rules.
           * Scoped to apps/web only via overrides.
           * @see {@link https://github.com/effozen/eslint-plugin-fsd-lint?tab=readme-ov-file#manual-configuration}
           */
          "fsd/forbidden-imports": [
            "error",
            { ...fsdEslintPluginOptions, alias: { value: "@", withSlash: false } }
          ],
          "fsd/no-relative-imports": ["error", { ...fsdEslintPluginOptions, allowSameSlice: true }],
          "fsd/no-public-api-sidestep": ["error", fsdEslintPluginOptions],
          "fsd/no-cross-slice-dependency": [
            "error",
            {
              ...fsdEslintPluginOptions,
              allowTypeImports: false,
              excludeLayers: ["shared"],
              featuresOnly: false
            }
          ],
          "fsd/no-ui-in-business-logic": ["error", fsdEslintPluginOptions],
          "fsd/no-global-store-imports": "error"
        }
      },
      {
        /**
         * `packages/db` is a non-FSD package. Its internal repositories
         * legitimately need parent imports to share `getDb`, schema
         * definitions, and migration utilities. The global
         * `import/no-relative-parent-imports` rule is too strict for
         * this package, so it's disabled here.
         */
        files: ["packages/db/**/*.ts"],
        rules: {
          "import/no-relative-parent-imports": "off"
        }
      }
    ]
  },
  plugins: [tailwindcss() as PluginOption]
});
